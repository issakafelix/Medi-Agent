from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from ..db import get_session
from ..models import Message
from ..schemas import OkResponse, RatingRequest

router = APIRouter(tags=["ratings"])


@router.post("/api/messages/{message_id}/rating", response_model=OkResponse)
def rate_message(message_id: int, payload: RatingRequest, session: Session = Depends(get_session)) -> OkResponse:
    msg = session.get(Message, message_id)
    if msg is None:
        raise HTTPException(status_code=404, detail="Message not found")

    msg.rating = payload.rating
    session.add(msg)
    session.commit()
    return OkResponse(ok=True)
