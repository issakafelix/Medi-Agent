from __future__ import annotations

from datetime import datetime
import logging

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel import Session

from ..config import get_settings
from ..db import get_session
from ..llm import LlmConfig, LlmError, generate_chat_reply, generate_image_b64, is_llm_enabled
from ..models import Conversation, Message
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])


def _normalize_llm_provider(provider: str | None) -> str:
    return (provider or "").strip().lower() or "disabled"


# Advanced Programming & IT Expert System Prompts
PROMPT_PRESETS: dict[str, str] = {
    "default": """You are an expert AI Medical Diagnostician and Health Assistant.

Your primary role is to help diagnose diseases based on symptoms, assist with step-by-step treatment/medication processes, and recommend appropriate hospitals or specialists.

IMPORTANT RULES:
1) Always include a disclaimer that you are an AI and this is NOT a substitute for professional medical advice. If symptoms indicate a severe emergency (chest pain, stroke symptoms, uncontrolled bleeding), immediately urge the user to seek emergency medical attention.
2) Ask clarifying questions (duration, severity, patient age/sex) if they haven't provided enough info.
3) Provide a differential diagnosis list of potential conditions.
4) Suggest step-by-step over-the-counter medications and home treatments for safe conditions. Mention seeking a pharmacist's advice where necessary.
5) Ask the user for their City/State/Location so you can recommend specific, high-quality hospitals or clinics that specialize in their infection or condition. If they have already provided a location, proactively recommend 2-3 top hospitals.""",

    "pediatrics": """You are an expert Pediatrician AI Assistant. 
You specialize in infant, child, and adolescent health.
Always ask for the child's age and weight, as medication dosages and symptom severity vary wildly.
Provide step-by-step guidance on safe home care for children.
Strongly advise consulting a real pediatrician for fevers in infants under 3 months or persistent symptoms.
Always state you are an AI and not a real doctor.""",

    "neurology": """You are an expert Neurology AI Assistant.
You specialize in the nervous system, including headaches, migraines, nerve pain, seizures, and cognitive issues.
Ask for details like symptom onset, triggers, and frequency.
Recommend step-by-step treatments (e.g. for migraines).
Ask the user for their location to suggest the best local neurology clinics or specialized stroke/brain centers.
Always state you are an AI and not a real doctor.""",

    "orthopedics": """You are an expert Orthopedics AI Assistant.
You specialize in musculoskeletal issues, including bone pain, joint issues, arthritis, and sports injuries.
Ask about the mechanism of injury, swelling, and range of motion.
Provide step-by-step advice on R.I.C.E. (Rest, Ice, Compression, Elevation) where appropriate.
If the user provides a location, recommend top-rated sports medicine clinics or orthopedic hospitals in their area.
Always state you are an AI and not a real physical therapist or doctor.""",

    "pharmacy": """You are an expert Pharmacist AI Assistant.
You specialize in medications, drug interactions, side effects, and safe dosages.
Ask what other medications or supplements the user is currently taking to check for interactions.
Explain step-by-step how and when to take over-the-counter medications.
Always state you are an AI. Strongly advise them to confirm with a real pharmacist before combining any medications."""
}


def _build_system_prompt(
    *,
    preset: str | None,
    tone: str | None,
    verbosity: str | None,
    memory: str | None,
) -> str:
    p = (preset or "default").strip().lower() or "default"
    base = PROMPT_PRESETS.get(p, "")

    lines: list[str] = []
    if base.strip():
        lines.append(base.strip())

    # Groundedness / reliability
    lines.append(
        "Be accurate and grounded. If you are unsure or lack enough information, say so and ask a clarifying question. "
        "Do not invent facts, quotes, links, or citations."
    )

    # Preferences
    t = (tone or "neutral").strip().lower()
    v = (verbosity or "normal").strip().lower()
    lines.append(f"Respond with tone: {t}.")
    lines.append(f"Respond with verbosity: {v}.")

    # Lightweight memory
    mem = (memory or "").strip()
    if mem:
        lines.append("User memory (treat as preferences/context):")
        lines.append(mem)

    return "\n".join([l for l in lines if l.strip()]).strip()


def _demo_llm_reply(
    user_text: str,
    *,
    tone: str | None,
    verbosity: str | None,
    memory: str | None,
    preset: str | None,
) -> str:
    # Placeholder. Replace with a real LLM provider.
    t = tone or "neutral"
    v = verbosity or "normal"
    p = preset or "default"
    mem = (memory or "").strip()

    head = f"(preset={p}) " if p != "default" else ""
    base = (
        f"{head}I received your message: \"{user_text}\". "
        "This is a backend demo response. Configure an LLM provider to generate real answers."
    )

    if v == "concise":
        out = f"{head}Got it: \"{user_text}\"."
    elif v == "detailed":
        out = base + "\n\nNext steps:\n- Tell me the goal\n- Provide constraints\n- Share relevant context"
    else:
        out = base

    out += f"\n\nPreferences: tone={t}, verbosity={v}"
    if mem:
        clipped = mem[:300] + ("…" if len(mem) > 300 else "")
        out += f"\nMemory (saved): {clipped}"

    return out


from ..auth import get_current_user

@router.post("/api/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest, 
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> ChatResponse:
    settings = get_settings()
    uid = user["uid"]

    raw_text = (payload.message or "").strip()
    is_image_cmd = raw_text.lower().startswith("/image ") or raw_text.lower().startswith("/img ")

    convo_id = payload.conversation_id
    if convo_id is None:
        title = (payload.message or "New chat").strip()[:40] or "New chat"
        convo = Conversation(title=title, user_id=uid, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        session.add(convo)
        session.commit()
        session.refresh(convo)
    else:
        convo = session.get(Conversation, convo_id)
        if convo is None:
            # Recreate with the provided ID if required (for offline-sync logic) but ensure it belongs to this user.
            convo = Conversation(id=convo_id, title="Chat", user_id=uid, updated_at=datetime.utcnow())
        elif convo.user_id != uid:
            raise HTTPException(status_code=403, detail="Forbidden")

        session.add(convo)
        session.commit()
        session.refresh(convo)

    user_msg = Message(conversation_id=convo.id, role="user", content=payload.message)
    session.add(user_msg)
    session.commit()
    session.refresh(user_msg)

    system_prompt = _build_system_prompt(
        preset=payload.preset,
        tone=payload.tone,
        verbosity=payload.verbosity,
        memory=payload.memory,
    )

    cfg_provider = _normalize_llm_provider(settings.llm_provider)
    cfg_api_key = settings.openai_api_key
    cfg_base_url = settings.openai_base_url
    cfg_chat_model = settings.openai_chat_model
    cfg_vision_model = settings.openai_vision_model

    if cfg_provider == "gemini":
        cfg_api_key = settings.gemini_api_key
        cfg_base_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        cfg_chat_model = settings.gemini_model
        cfg_vision_model = settings.gemini_model

    cfg = LlmConfig(
        provider=cfg_provider,
        openai_api_key=cfg_api_key or None,
        openai_base_url=cfg_base_url,
        openai_chat_model=cfg_chat_model,
        openai_vision_model=cfg_vision_model,
        openai_image_model=settings.openai_image_model,
        request_timeout_s=settings.llm_request_timeout_s,
    )

    reply: str
    try:
        if is_image_cmd:
            prompt = raw_text.split(" ", 1)[1].strip() if " " in raw_text else ""
            if not prompt:
                reply = "Usage: /image <prompt>"
            else:
                b64 = await generate_image_b64(cfg=cfg, prompt=prompt, size=settings.openai_image_size)
                if b64 is None and not is_llm_enabled(cfg):
                    reply = "⚠️ Image generation is not configured. Set `llm_provider` and `openai_api_key` on the backend."
                elif not b64:
                    reply = "⚠️ Image generation returned no image."
                else:
                    reply = f"![Generated image](data:image/png;base64,{b64})"

        else:
            # Provide short-term conversational memory by sending the last N messages.
            history_limit = 10
            rows = session.exec(
                select(Message)
                .where(Message.conversation_id == convo.id)
                .order_by(Message.created_at.desc())
                .limit(history_limit)
            ).all()

            rows = list(reversed(rows))
            openai_messages: list[dict[str, str]] = []
            if system_prompt.strip():
                openai_messages.append({"role": "system", "content": system_prompt})

            for m in rows:
                role_raw = str(m.role or "user").strip().lower()
                role = "assistant" if role_raw in {"bot", "assistant"} else "user"
                content = str(m.content or "")
                if not content.strip():
                    continue
                openai_messages.append({"role": role, "content": content})

            # Fallback guard: if something went wrong building history, at least send the latest user message.
            if not any(msg.get("role") == "user" for msg in openai_messages):
                openai_messages.append({"role": "user", "content": payload.message})

            llm_reply = await generate_chat_reply(cfg=cfg, messages=openai_messages)

            # If LLM is disabled/misconfigured, demo is fine.
            if llm_reply is None and not is_llm_enabled(cfg):
                reply = _demo_llm_reply(
                    payload.message,
                    tone=payload.tone,
                    verbosity=payload.verbosity,
                    memory=payload.memory,
                    preset=payload.preset,
                )
            # If LLM is enabled but we still got None, surface it (this should not normally happen).
            elif llm_reply is None:
                reply = (
                    "⚠️ LLM is enabled but returned no content. "
                    "This usually indicates an upstream/provider issue. "
                    "Check backend logs for details."
                )
            else:
                reply = llm_reply
    except LlmError as e:
        logging.getLogger("uvicorn.error").exception("LLM request failed")
        # IMPORTANT: don't silently fall back to demo text when the LLM is configured.
        # That makes it look like the system is working, when it's actually failing.
        if is_llm_enabled(cfg):
            reply = (
                "⚠️ The AI provider request failed (often rate limiting or network).\n"
                "Try again in a moment. If it keeps happening, verify your API key, billing, and provider settings.\n\n"
                f"Details: {str(e)[:300]}"
            )
        else:
            reply = _demo_llm_reply(
                payload.message,
                tone=payload.tone,
                verbosity=payload.verbosity,
                memory=payload.memory,
                preset=payload.preset,
            )

    bot_msg = Message(conversation_id=convo.id, role="bot", content=reply)
    session.add(bot_msg)

    convo.updated_at = datetime.utcnow()
    session.add(convo)

    session.commit()
    session.refresh(bot_msg)

    return ChatResponse(
        reply=reply,
        conversation_id=convo.id,
        user_message_id=user_msg.id or 0,
        bot_message_id=bot_msg.id or 0,
    )
