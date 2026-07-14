from __future__ import annotations

import asyncio
import math

import httpx
from fastapi import APIRouter, HTTPException, Query

from ..schemas import GeocodeResponse, HospitalItem, HospitalsNearbyResponse

router = APIRouter(tags=["hospitals"])

# Public OpenStreetMap services — no API key, no billing account.
# Usage policies require a descriptive User-Agent and modest request rates,
# both of which are satisfied by this being a single user-triggered lookup.
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "MediAgent-SymptomWizard/1.0 (contact: dev@localhost)"

# The public Overpass instance is community-run and occasionally overloaded
# (502/504). Try it, then a known public mirror, before giving up.
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

REQUEST_TIMEOUT_S = 15.0
# Longer than the Overpass query's own internal [timeout:15] so our client
# doesn't abort a request that Overpass would have answered in time.
OVERPASS_REQUEST_TIMEOUT_S = 20.0


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _format_address(tags: dict) -> str | None:
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:suburb") or tags.get("addr:city"),
    ]
    parts = [p for p in parts if p]
    return ", ".join(parts) if parts else None


@router.get("/api/hospitals/geocode", response_model=GeocodeResponse)
async def geocode(q: str = Query(min_length=1, max_length=200)) -> GeocodeResponse:
    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_S) as client:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": q, "format": "json", "limit": 1},
                headers={"User-Agent": USER_AGENT},
            )
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach geocoding service: {e}") from e

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Geocoding service error: HTTP {resp.status_code}")

    results = resp.json()
    if not results:
        raise HTTPException(status_code=404, detail=f"Location not found: {q!r}")

    top = results[0]
    return GeocodeResponse(
        lat=float(top["lat"]),
        lon=float(top["lon"]),
        display_name=top.get("display_name", q),
    )


async def _fetch_overpass(client: httpx.AsyncClient, url: str, query: str) -> httpx.Response:
    return await client.post(url, data={"data": query}, headers={"User-Agent": USER_AGENT})


async def _query_overpass(query: str) -> httpx.Response:
    """Race all Overpass mirrors concurrently and return the first success.

    The public Overpass instance is community-run and occasionally slow or
    overloaded (502/504). Querying mirrors sequentially with retries meant
    a slow primary could burn through most of a 40s+ wait before an already-
    healthy mirror ever got a turn. Racing them bounds worst-case latency to
    a single timeout window instead of the sum of several.
    """
    async with httpx.AsyncClient(timeout=OVERPASS_REQUEST_TIMEOUT_S) as client:
        pending = {asyncio.create_task(_fetch_overpass(client, url, query)) for url in OVERPASS_URLS}
        last_error: str | None = None
        try:
            while pending:
                done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
                for task in done:
                    try:
                        resp = task.result()
                    except httpx.RequestError as e:
                        last_error = f"Could not reach hospital lookup service: {e}"
                        continue
                    if resp.status_code < 400:
                        return resp
                    last_error = f"Hospital lookup service error: HTTP {resp.status_code}"
        finally:
            for task in pending:
                task.cancel()

    raise HTTPException(status_code=502, detail=last_error or "Hospital lookup service is unavailable")


@router.get("/api/hospitals/nearby", response_model=HospitalsNearbyResponse)
async def nearby(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    radius_m: int = Query(default=5000, ge=500, le=20000),
) -> HospitalsNearbyResponse:
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"~"^(hospital|clinic)$"](around:{radius_m},{lat},{lon});
      way["amenity"~"^(hospital|clinic)$"](around:{radius_m},{lat},{lon});
    );
    out center tags;
    """.strip()

    resp = await _query_overpass(query)
    elements = resp.json().get("elements", [])

    items: list[HospitalItem] = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue  # unnamed nodes are usually not useful referrals

        if el["type"] == "node":
            elat, elon = el.get("lat"), el.get("lon")
        else:
            center = el.get("center") or {}
            elat, elon = center.get("lat"), center.get("lon")
        if elat is None or elon is None:
            continue

        items.append(
            HospitalItem(
                id=f"{el['type']}/{el['id']}",
                name=name,
                kind=tags.get("amenity", "hospital"),
                lat=elat,
                lon=elon,
                distance_km=round(_haversine_km(lat, lon, elat, elon), 2),
                address=_format_address(tags),
                phone=tags.get("phone") or tags.get("contact:phone"),
            )
        )

    items.sort(key=lambda h: h.distance_km)
    return HospitalsNearbyResponse(hospitals=items[:15])
