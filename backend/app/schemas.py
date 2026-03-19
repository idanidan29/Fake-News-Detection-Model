from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    username: str = Field(min_length=2, max_length=40)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    username: str
    email: EmailStr
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Friends ──────────────────────────────────────────────────────────────────

class FriendRequestCreate(BaseModel):
    username: str


class FriendshipOut(BaseModel):
    id: int
    friend: UserResponse
    status: str
    created_at: datetime


# ── Sessions ─────────────────────────────────────────────────────────────────

SessionStatus = Literal["lobby", "active", "matched", "closed"]
InviteStatus = Literal["pending", "accepted", "declined"]


class SessionCreateRequest(BaseModel):
    title: str = Field(min_length=2, max_length=140)
    topic: str = Field(min_length=2, max_length=40)


class SessionInviteCreateRequest(BaseModel):
    username: str = Field(min_length=2, max_length=40)


class SessionInviteRespondRequest(BaseModel):
    decision: Literal["accept", "decline"]


class SessionSwipeRequest(BaseModel):
    direction: Literal["left", "right"]


class SessionOut(BaseModel):
    id: int
    title: str
    topic: str
    status: SessionStatus
    host: UserResponse
    created_at: datetime


class SessionParticipantOut(BaseModel):
    id: int
    user: UserResponse
    created_at: datetime


class SessionInviteOut(BaseModel):
    id: int
    session_id: int
    session_title: str
    session_topic: str
    from_user: UserResponse
    to_user: UserResponse
    status: InviteStatus
    created_at: datetime


class SessionDetailOut(BaseModel):
    session: SessionOut
    participants: list[SessionParticipantOut]
    invites: list[SessionInviteOut]
    is_participant: bool
    can_join: bool


class SessionCardOut(BaseModel):
    id: int
    external_id: str
    title: str
    description: str
    image_url: str
    position: int


class SessionCurrentCardOut(BaseModel):
    card: SessionCardOut | None
    session_status: SessionStatus
    total_participants: int
    votes_count: int
    has_voted: bool
    is_match: bool
    next_card: SessionCardOut | None = None  # Prefetched for faster transitions


# ── Notifications ────────────────────────────────────────────────────────────

class NotificationFriendRequestOut(BaseModel):
    request_id: int
    from_user: UserResponse
    created_at: datetime


class NotificationSessionInviteOut(BaseModel):
    invite_id: int
    session_id: int
    session_title: str
    session_topic: str
    from_user: UserResponse
    created_at: datetime


class NotificationsSummaryOut(BaseModel):
    pending_friend_requests_count: int
    pending_session_invites_count: int
    pending_friend_requests: list[NotificationFriendRequestOut]
    pending_session_invites: list[NotificationSessionInviteOut]
