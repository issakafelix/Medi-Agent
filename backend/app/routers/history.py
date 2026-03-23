from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from ..db import get_session
from ..models import Message
from ..schemas import HistoryItem, HistoryResponse

router = APIRouter(tags=["history"])


from ..auth import get_current_user
from ..models import Conversation

@router.get("/api/history", response_model=HistoryResponse)
def history(
    limit: int = Query(default=50, ge=1, le=200),
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> HistoryResponse:
    uid = user["uid"]
    stmt = (
        select(Message)
        .join(Conversation)
        .where(Conversation.user_id == uid)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    rows = session.exec(stmt).all()
    items = [
        HistoryItem(
            conversation_id=m.conversation_id,
            message_id=m.id or 0,
            role=m.role,
            content=m.content,
            created_at=m.created_at,
        )
        for m in rows
    ]
    return HistoryResponse(items=items)
