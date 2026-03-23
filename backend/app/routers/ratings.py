from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..db import get_session
from ..models import Message
from ..schemas import OkResponse, RatingRequest

router = APIRouter(tags=["ratings"])


from ..auth import get_current_user
from ..models import Conversation

@router.post("/api/messages/{message_id}/rating", response_model=OkResponse)
def rate_message(
    message_id: int, 
    payload: RatingRequest, 
    session: Session = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> OkResponse:
    msg = session.get(Message, message_id)
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")

    convo = session.get(Conversation, msg.conversation_id)
    if convo is None or convo.user_id != user["uid"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    msg.rating = payload.rating
    session.add(msg)
    session.commit()
    return OkResponse(ok=True)
