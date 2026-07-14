from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, ORJSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .config import get_settings
from .db import init_db
from .llm import LlmConfig, is_llm_enabled
from .security import RequestSizeLimitMiddleware, SimpleRateLimitMiddleware
from .routers import chat, conversations, history, hospitals, image, ratings


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Chatbot Backend",
        version="0.1.0",
        default_response_class=ORJSONResponse,
    )

    # CORS for the Vite frontend - MUST be added before other middleware
    # In dev, allow all origins so the frontend can move if port 3000 is taken.
    is_dev = (settings.app_env or "").strip().lower() == "dev"
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if is_dev else settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # Basic hardening
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_host_list or ["*"])
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Simple safety limits
    app.add_middleware(RequestSizeLimitMiddleware)
    app.add_middleware(SimpleRateLimitMiddleware)

    app.include_router(chat.router)
    app.include_router(history.router)
    app.include_router(conversations.router)
    app.include_router(ratings.router)
    app.include_router(image.router)
    app.include_router(hospitals.router)

    @app.on_event("startup")
    def _startup() -> None:
        # Log LLM status early so it's obvious when the backend is in demo mode.
        cfg = LlmConfig(
            provider=settings.llm_provider,
            openai_api_key=(settings.openai_api_key or None),
            openai_base_url=settings.openai_base_url,
            openai_chat_model=settings.openai_chat_model,
            openai_vision_model=settings.openai_vision_model,
            openai_image_model=settings.openai_image_model,
            request_timeout_s=settings.llm_request_timeout_s,
        )
        enabled = is_llm_enabled(cfg)
        logging.getLogger("uvicorn.error").info(
            "LLM provider=%s enabled=%s base_url=%s chat_model=%s",
            (settings.llm_provider or "disabled"),
            enabled,
            settings.openai_base_url,
            settings.openai_chat_model,
        )

        logging.getLogger("uvicorn.error").info("Initializing database")
        init_db()

        # Initialize Firebase Admin securely
        if settings.firebase_service_account_json:
            try:
                import json
                import firebase_admin
                from firebase_admin import credentials

                fs = settings.firebase_service_account_json.strip()
                path = Path(fs)
                if path.exists():
                    with open(path, 'r', encoding='utf-8') as fh:
                        cert_dict = json.load(fh)
                else:
                    # Treat the value as JSON string
                    cert_dict = json.loads(fs)

                cred = credentials.Certificate(cert_dict)
                firebase_admin.initialize_app(cred)
                logging.getLogger("uvicorn.error").info("Firebase Admin initialized successfully.")
            except Exception as e:
                logging.getLogger("uvicorn.error").error(f"Failed to initialize Firebase Admin: {e}")
        else:
            logging.getLogger("uvicorn.error").warning("CRITICAL WARNING: FIREBASE_SERVICE_ACCOUNT_JSON not provided. Backend cannot verify users. Chat and history will fail. Set this variable on Render.")

    @app.get("/health")
    def health():
        return {"ok": True}

    # Serve the built frontend in production-like environments.
    # Build output is expected at <repo-root>/dist.
    if not is_dev:
        repo_root = Path(__file__).resolve().parents[2]
        dist_dir = repo_root / "dist"
        index_html = dist_dir / "index.html"

        if dist_dir.exists() and index_html.exists():
            # Ensure unknown API paths return JSON 404 (and don't fall through to SPA).
            @app.api_route(
                "/api/{api_path:path}",
                methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            )
            def api_not_found(api_path: str):
                raise HTTPException(status_code=404, detail="Not Found")

            # Static assets (JS/CSS/images)
            app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")

            # SPA fallback: route any non-API path to index.html
            @app.get("/{full_path:path}")
            def spa_fallback(full_path: str):
                if full_path.startswith("api/"):
                    # Let FastAPI handle API 404s normally
                    raise HTTPException(status_code=404, detail="Not Found")
                return FileResponse(str(index_html))

    return app


app = create_app()
