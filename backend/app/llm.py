from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from typing import Any, Iterable

import httpx
import asyncio


@dataclass(frozen=True)
class LlmConfig:
    provider: str

    # OpenAI-compatible settings
    openai_api_key: str | None
    openai_base_url: str
    openai_chat_model: str
    openai_vision_model: str
    openai_image_model: str

    request_timeout_s: float


class LlmError(RuntimeError):
    pass


def _normalize_provider(provider: str | None) -> str:
    p = (provider or "").strip().lower()
    return p or "disabled"


def _is_local_base_url(base_url: str | None) -> bool:
    """Return True for localhost/loopback OpenAI-compatible endpoints.

    This allows using providers like Ollama/LM Studio that do not require API keys
    for local development.
    """
    u = (base_url or "").strip().lower()
    return u.startswith("http://localhost") or u.startswith("http://127.0.0.1") or u.startswith(
        "http://0.0.0.0"
    )


def is_llm_enabled(cfg: LlmConfig) -> bool:
    provider = _normalize_provider(cfg.provider)
    if provider in {"disabled", "none", "off"}:
        return False

    if provider == "gemini":
        return bool((cfg.openai_api_key or "").strip())

    # For now we only implement OpenAI-compatible HTTP.
    if provider in {"openai", "openai-compatible", "compatible"}:
        # OpenAI itself always requires an API key.
        if (cfg.openai_base_url or "").strip().lower().startswith("https://api.openai.com"):
            return bool((cfg.openai_api_key or "").strip())

        # Local OpenAI-compatible providers (Ollama/LM Studio) often don't require auth.
        if _is_local_base_url(cfg.openai_base_url):
            return True

        # Default: require a key.
        return bool((cfg.openai_api_key or "").strip())

    return False


def _openai_url(base_url: str, path: str) -> str:
    base = base_url.rstrip("/")
    p = "/" + path.lstrip("/")

    # Some OpenAI-compatible providers (e.g., Fireworks) use a base URL that already
    # includes "/v1" (like https://api.fireworks.ai/inference/v1) and then expect
    # paths like "/chat/completions" (no extra "/v1").
    if base.endswith("/v1") and p.startswith("/v1/"):
        p = p[len("/v1") :]
        
    # Gemini OpenAI compatibility layer ending with /openai expects /chat/completions
    if (base.endswith("/openai") or base.endswith("/openai/")) and p.startswith("/v1/"):
        p = p[len("/v1") :]

    return base + p


def _ensure_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _data_url_for_image(raw: bytes, mime: str) -> str:
    b64 = base64.b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


async def openai_chat_completion(
    *,
    cfg: LlmConfig,
    messages: list[dict[str, Any]],
    model: str,
    temperature: float | None = 0.2,
    max_tokens: int | None = None,
) -> str:
    url = _openai_url(cfg.openai_base_url, "/v1/chat/completions")

    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
    }
    if temperature is not None:
        payload["temperature"] = temperature
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens

    headers = {"Content-Type": "application/json"}
    if (cfg.openai_api_key or "").strip():
        headers["Authorization"] = f"Bearer {cfg.openai_api_key}"

    last_error: str | None = None
    # Small retry loop for transient failures (esp. rate limits / overload).
    # Keeps behavior simple and avoids returning demo text when a brief retry would succeed.
    for attempt in range(3):
        async with httpx.AsyncClient(timeout=cfg.request_timeout_s) as client:
            resp = await client.post(url, headers=headers, content=json.dumps(payload))

        if resp.status_code < 400:
            last_error = None
            break

        # Capture error text (trimmed)
        last_error = f"LLM HTTP {resp.status_code}: {resp.text[:2000]}"

        # Retry on transient/server errors and rate limits.
        if resp.status_code in {429, 500, 502, 503, 504} and attempt < 2:
            retry_after = resp.headers.get("retry-after")
            try:
                delay = float(retry_after) if retry_after is not None else (0.75 * (2**attempt))
            except Exception:
                delay = 0.75 * (2**attempt)
            # Cap delay to keep UX responsive
            await asyncio.sleep(min(delay, 3.0))
            continue

        raise LlmError(last_error)

    if last_error is not None:
        raise LlmError(last_error)

    data = resp.json()
    try:
        content = data["choices"][0]["message"]["content"]
    except Exception as e:
        raise LlmError(f"Unexpected LLM response shape: {str(e)}")

    return _ensure_text(content).strip()


async def generate_text_reply(
    *,
    cfg: LlmConfig,
    system_prompt: str,
    user_prompt: str,
) -> str | None:
    if not is_llm_enabled(cfg):
        return None

    provider = _normalize_provider(cfg.provider)
    if provider not in {"openai", "openai-compatible", "compatible", "gemini"}:
        return None

    messages: list[dict[str, Any]] = []
    if system_prompt.strip():
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})

    return await openai_chat_completion(cfg=cfg, messages=messages, model=cfg.openai_chat_model)


async def generate_chat_reply(
    *,
    cfg: LlmConfig,
    messages: list[dict[str, Any]],
) -> str | None:
    if not is_llm_enabled(cfg):
        return None

    provider = _normalize_provider(cfg.provider)
    if provider not in {"openai", "openai-compatible", "compatible", "gemini"}:
        return None

    return await openai_chat_completion(cfg=cfg, messages=messages, model=cfg.openai_chat_model)


async def describe_image_with_vision(
    *,
    cfg: LlmConfig,
    instruction: str,
    image_bytes: bytes,
    image_mime: str,
) -> str | None:
    if not is_llm_enabled(cfg):
        return None

    provider = _normalize_provider(cfg.provider)
    if provider not in {"openai", "openai-compatible", "compatible", "gemini"}:
        return None

    image_url = _data_url_for_image(image_bytes, image_mime)

    # OpenAI-compatible vision via chat-completions content parts
    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": instruction},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        }
    ]

    return await openai_chat_completion(cfg=cfg, messages=messages, model=cfg.openai_vision_model)


async def openai_image_generation(
    *,
    cfg: LlmConfig,
    prompt: str,
    model: str,
    size: str = "1024x1024",
) -> dict[str, str]:
    url = _openai_url(cfg.openai_base_url, "/v1/images/generations")

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "n": 1,
        "response_format": "b64_json",
    }

    headers = {"Content-Type": "application/json"}
    if (cfg.openai_api_key or "").strip():
        headers["Authorization"] = f"Bearer {cfg.openai_api_key}"

    async with httpx.AsyncClient(timeout=cfg.request_timeout_s) as client:
        resp = await client.post(url, headers=headers, content=json.dumps(payload))

    if resp.status_code >= 400:
        raise LlmError(f"LLM HTTP {resp.status_code}: {resp.text[:2000]}")

    data = resp.json()
    try:
        item = data["data"][0]
    except Exception as e:
        raise LlmError(f"Unexpected image response shape: {str(e)}")

    b64 = item.get("b64_json")
    if isinstance(b64, str) and b64.strip():
        return {"b64_json": b64.strip()}

    url_out = item.get("url")
    if isinstance(url_out, str) and url_out.strip():
        return {"url": url_out.strip()}

    raise LlmError("Image generation returned no image")


async def generate_image_b64(
    *,
    cfg: LlmConfig,
    prompt: str,
    size: str = "1024x1024",
) -> str | None:
    if not is_llm_enabled(cfg):
        return None

    provider = _normalize_provider(cfg.provider)
    if provider not in {"openai", "openai-compatible", "compatible", "gemini"}:
        return None

    data = await openai_image_generation(
        cfg=cfg,
        prompt=prompt,
        model=cfg.openai_image_model,
        size=size,
    )
    return data.get("b64_json")
