from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    timestamp: Optional[datetime] = None
    conversation_id: Optional[int] = None
    tone: Optional[str] = Field(default=None, max_length=40)
    verbosity: Optional[str] = Field(default=None, max_length=40)
    memory: Optional[str] = Field(default=None, max_length=4000)
    preset: Optional[str] = Field(default=None, max_length=40)


class ChatResponse(BaseModel):
    reply: str
    conversation_id: int
    user_message_id: int
    bot_message_id: int


class HistoryItem(BaseModel):
    conversation_id: int
    message_id: int
    role: str
    content: str
    created_at: datetime


class HistoryResponse(BaseModel):
    items: list[HistoryItem]


class ConversationSummary(BaseModel):
    conversation_id: int
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationsResponse(BaseModel):
    conversations: list[ConversationSummary]


class ConversationMessage(BaseModel):
    message_id: int
    role: str
    content: str
    created_at: datetime
    rating: Optional[int] = None


class ConversationDetail(BaseModel):
    conversation_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[ConversationMessage]


class RatingRequest(BaseModel):
    rating: int = Field(ge=-1, le=1)


class OkResponse(BaseModel):
    ok: bool = True


class ImageDescribeResponse(BaseModel):
    description: str


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    size: Optional[str] = Field(default=None, max_length=20)


class ImageGenerateResponse(BaseModel):
    # A data URL like: data:image/png;base64,....
    image_data_url: str


class GeocodeResponse(BaseModel):
    lat: float
    lon: float
    display_name: str


class HospitalItem(BaseModel):
    id: str
    name: str
    kind: str
    lat: float
    lon: float
    distance_km: float
    address: Optional[str] = None
    phone: Optional[str] = None


class HospitalsNearbyResponse(BaseModel):
    hospitals: list[HospitalItem]
