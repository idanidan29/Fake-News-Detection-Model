from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Friendship, SessionInvite, User
from ..schemas import (
    NotificationFriendRequestOut,
    NotificationSessionInviteOut,
    NotificationsSummaryOut,
    UserResponse,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/summary", response_model=NotificationsSummaryOut)
def notifications_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationsSummaryOut:
    friend_requests = (
        db.query(Friendship)
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .order_by(Friendship.created_at.desc())
        .limit(10)
        .all()
    )

    session_invites = (
        db.query(SessionInvite)
        .filter(
            SessionInvite.to_user_id == current_user.id,
            SessionInvite.status == "pending",
        )
        .order_by(SessionInvite.created_at.desc())
        .limit(10)
        .all()
    )

    friend_count = (
        db.query(Friendship)
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .count()
    )

    invite_count = (
        db.query(SessionInvite)
        .filter(
            SessionInvite.to_user_id == current_user.id,
            SessionInvite.status == "pending",
        )
        .count()
    )

    return NotificationsSummaryOut(
        pending_friend_requests_count=friend_count,
        pending_session_invites_count=invite_count,
        pending_friend_requests=[
            NotificationFriendRequestOut(
                request_id=item.id,
                from_user=UserResponse.model_validate(item.requester),
                created_at=item.created_at,
            )
            for item in friend_requests
        ],
        pending_session_invites=[
            NotificationSessionInviteOut(
                invite_id=item.id,
                session_id=item.session_id,
                session_title=item.session.title,
                session_topic=item.session.topic,
                from_user=UserResponse.model_validate(item.from_user),
                created_at=item.created_at,
            )
            for item in session_invites
        ],
    )
