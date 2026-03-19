from __future__ import annotations

import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from PIL import Image

from ..config import get_settings
from ..llm import LlmConfig, LlmError, describe_image_with_vision, generate_image_b64, is_llm_enabled
from ..schemas import ImageDescribeResponse, ImageGenerateRequest, ImageGenerateResponse

router = APIRouter(tags=["image"])


@router.post("/api/image/describe", response_model=ImageDescribeResponse)
async def describe_image(image: UploadFile = File(...)) -> ImageDescribeResponse:
    settings = get_settings()

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    raw = await image.read()
    if len(raw) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail="Payload too large")

    try:
        im = Image.open(io.BytesIO(raw))
        im.load()
        width, height = im.size
        fmt = (im.format or "unknown").upper()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image")

    # If a vision-capable provider is configured, return a real caption.
    cfg = LlmConfig(
        provider=settings.llm_provider,
        openai_api_key=settings.openai_api_key or None,
        openai_base_url=settings.openai_base_url,
        openai_chat_model=settings.openai_chat_model,
        openai_vision_model=settings.openai_vision_model,
        openai_image_model=settings.openai_image_model,
        request_timeout_s=settings.llm_request_timeout_s,
    )

    fallback = f"Image received: {fmt} {width}x{height}."
    try:
        instruction = (
            "Describe the image in 1–3 sentences, focusing only on what is clearly visible. "
            "If there is readable text, quote it verbatim. If text is blurry/unclear, say so and do not guess. "
            "If you are uncertain about any detail, explicitly state the uncertainty."
        )
        caption = await describe_image_with_vision(
            cfg=cfg,
            instruction=instruction,
            image_bytes=raw,
            image_mime=(image.content_type or "image/png"),
        )
        return ImageDescribeResponse(description=(caption or fallback))
    except LlmError:
        return ImageDescribeResponse(description=fallback)


@router.post("/api/image/generate", response_model=ImageGenerateResponse)
async def generate_image(payload: ImageGenerateRequest) -> ImageGenerateResponse:
    settings = get_settings()

    cfg = LlmConfig(
        provider=settings.llm_provider,
        openai_api_key=settings.openai_api_key or None,
        openai_base_url=settings.openai_base_url,
        openai_chat_model=settings.openai_chat_model,
        openai_vision_model=settings.openai_vision_model,
        openai_image_model=settings.openai_image_model,
        request_timeout_s=settings.llm_request_timeout_s,
    )

    if not is_llm_enabled(cfg):
        raise HTTPException(status_code=400, detail="Image generation is not configured. Set LLM provider and OpenAI API key.")

    prompt = (payload.prompt or "").strip()
    size = (payload.size or settings.openai_image_size or "1024x1024").strip()

    try:
        b64 = await generate_image_b64(cfg=cfg, prompt=prompt, size=size)
        if not b64:
            raise HTTPException(status_code=500, detail="Image generation returned no image")
        return ImageGenerateResponse(image_data_url=f"data:image/png;base64,{b64}")
    except LlmError as e:
        raise HTTPException(status_code=502, detail=str(e)[:500])
