from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Friendship, User
from ..schemas import FriendRequestCreate, FriendshipOut, UserResponse

router = APIRouter(prefix="/friends", tags=["friends"])


def _to_out(friendship: Friendship, current_user_id: int) -> FriendshipOut:
    """Return FriendshipOut with the *other* user as `friend`."""
    other = (
        friendship.addressee
        if friendship.requester_id == current_user_id
        else friendship.requester
    )
    return FriendshipOut(
        id=friendship.id,
        friend=UserResponse.model_validate(other),
        status=friendship.status,
        created_at=friendship.created_at,
    )


@router.post("/request", status_code=status.HTTP_201_CREATED)
def send_request(
    payload: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    target = db.query(User).filter(User.username == payload.username.lower().strip()).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot send a friend request to yourself")

    existing = (
        db.query(Friendship)
        .filter(
            or_(
                (Friendship.requester_id == current_user.id) & (Friendship.addressee_id == target.id),
                (Friendship.requester_id == target.id) & (Friendship.addressee_id == current_user.id),
            )
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Friend request already exists")

    friendship = Friendship(requester_id=current_user.id, addressee_id=target.id, status="pending")
    db.add(friendship)
    db.commit()
    return {"message": "Friend request sent"}


@router.get("", response_model=list[FriendshipOut])
def list_friends(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FriendshipOut]:
    friendships = (
        db.query(Friendship)
        .filter(
            or_(
                Friendship.requester_id == current_user.id,
                Friendship.addressee_id == current_user.id,
            ),
            Friendship.status == "accepted",
        )
        .all()
    )
    return [_to_out(f, current_user.id) for f in friendships]


@router.get("/requests", response_model=list[FriendshipOut])
def list_incoming_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FriendshipOut]:
    friendships = (
        db.query(Friendship)
        .filter(
            Friendship.addressee_id == current_user.id,
            Friendship.status == "pending",
        )
        .all()
    )
    return [_to_out(f, current_user.id) for f in friendships]


@router.post("/{request_id}/accept", response_model=FriendshipOut)
def accept_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendshipOut:
    friendship = db.query(Friendship).filter(Friendship.id == request_id).first()
    if not friendship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend request not found")
    if friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to accept this request")
    if friendship.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")

    friendship.status = "accepted"
    db.commit()
    db.refresh(friendship)
    return _to_out(friendship, current_user.id)


@router.delete("/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_friend(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    friendship = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found")
    if friendship.requester_id != current_user.id and friendship.addressee_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    db.delete(friendship)
    db.commit()
