from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .config import get_settings


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                size = int(content_length)
                if size > settings.max_upload_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Payload too large"},
                    )
            except ValueError:
                pass
        return await call_next(request)


class SimpleRateLimitMiddleware(BaseHTTPMiddleware):
    """Very small in-memory rate limiter (per IP).

    Good enough for local/dev and small demos. For production behind proxies,
    put this behind a real gateway rate limiter.
    """

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, Deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        limit = max(1, int(settings.rate_limit_per_minute))
        window = 60.0

        client_ip = (request.client.host if request.client else "unknown")
        now = time.time()

        q = self._hits[client_ip]
        while q and (now - q[0]) > window:
            q.popleft()

        if len(q) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded"},
            )

        q.append(now)
        return await call_next(request)
