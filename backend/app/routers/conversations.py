from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..db import get_session
from ..models import Conversation, Message
from ..schemas import (
    ConversationDetail,
    ConversationMessage,
    ConversationsResponse,
    ConversationSummary,
    OkResponse,
)

router = APIRouter(tags=["conversations"])


@router.get("/api/conversations", response_model=ConversationsResponse)
def list_conversations(
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
) -> ConversationsResponse:
    stmt = select(Conversation).order_by(Conversation.updated_at.desc()).limit(limit)
    rows = session.exec(stmt).all()
    return ConversationsResponse(
        conversations=[
            ConversationSummary(
                conversation_id=c.id or 0,
                title=c.title,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in rows
        ]
    )


@router.get("/api/conversations/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: int, session: Session = Depends(get_session)) -> ConversationDetail:
    convo = session.get(Conversation, conversation_id)
    if convo is None:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = session.exec(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    ).all()

    return ConversationDetail(
        conversation_id=convo.id or conversation_id,
        title=convo.title,
        created_at=convo.created_at,
        updated_at=convo.updated_at,
        messages=[
            ConversationMessage(
                message_id=m.id or 0,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
                rating=m.rating,
            )
            for m in msgs
        ],
    )


@router.delete("/api/conversations/{conversation_id}", response_model=OkResponse)
def delete_conversation(conversation_id: int, session: Session = Depends(get_session)) -> OkResponse:
    convo = session.get(Conversation, conversation_id)
    if convo is None:
        return OkResponse(ok=True)

    msgs = session.exec(select(Message).where(Message.conversation_id == conversation_id)).all()
    for m in msgs:
        session.delete(m)
    session.delete(convo)
    session.commit()
    return OkResponse(ok=True)
