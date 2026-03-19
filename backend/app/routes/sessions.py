from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Friendship, Session as SessionModel, SessionCard, SessionInvite, SessionParticipant, SessionSwipe, User
from ..schemas import (
    SessionCardOut,
    SessionCreateRequest,
    SessionCurrentCardOut,
    SessionDetailOut,
    SessionInviteCreateRequest,
    SessionInviteOut,
    SessionInviteRespondRequest,
    SessionOut,
    SessionParticipantOut,
    SessionSwipeRequest,
    UserResponse,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

SEED_CARDS_BY_TOPIC = {
    "movie": [
        {"id": "movie_1", "title": "Inception", "description": "A mind-bending sci-fi heist.", "image_url": ""},
        {"id": "movie_2", "title": "Interstellar", "description": "A journey beyond Earth to save humanity.", "image_url": ""},
        {"id": "movie_3", "title": "The Dark Knight", "description": "A gritty superhero crime thriller.", "image_url": ""},
    ],
    "game": [
        {"id": "game_1", "title": "It Takes Two", "description": "Co-op adventure for two players.", "image_url": ""},
        {"id": "game_2", "title": "Stardew Valley", "description": "Relaxed farming and life sim.", "image_url": ""},
        {"id": "game_3", "title": "Overcooked 2", "description": "Chaotic co-op cooking fun.", "image_url": ""},
    ],
    "book": [
        {"id": "book_1", "title": "Project Hail Mary", "description": "Sci-fi survival with humor and science.", "image_url": ""},
        {"id": "book_2", "title": "Atomic Habits", "description": "Practical guide to building better habits.", "image_url": ""},
        {"id": "book_3", "title": "The Alchemist", "description": "A philosophical adventure novel.", "image_url": ""},
    ],
    "event": [
        {"id": "event_1", "title": "Escape Room", "description": "Collaborative puzzle-solving experience.", "image_url": ""},
        {"id": "event_2", "title": "Board Game Night", "description": "Low-cost social evening at home.", "image_url": ""},
        {"id": "event_3", "title": "Food Festival", "description": "Explore local food stands together.", "image_url": ""},
    ],
}


def _session_out(session: SessionModel) -> SessionOut:
    return SessionOut(
        id=session.id,
        title=session.title,
        topic=session.topic,
        status=session.status,
        host=UserResponse.model_validate(session.host),
        created_at=session.created_at,
    )


def _is_participant(db: Session, session_id: int, user_id: int) -> bool:
    participant = (
        db.query(SessionParticipant)
        .filter(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == user_id,
        )
        .first()
    )
    return participant is not None


def _invite_out(invite: SessionInvite) -> SessionInviteOut:
    return SessionInviteOut(
        id=invite.id,
        session_id=invite.session_id,
        session_title=invite.session.title,
        session_topic=invite.session.topic,
        from_user=UserResponse.model_validate(invite.from_user),
        to_user=UserResponse.model_validate(invite.to_user),
        status=invite.status,
        created_at=invite.created_at,
    )


def _card_out(card: SessionCard) -> SessionCardOut:
    return SessionCardOut(
        id=card.id,
        external_id=card.external_id,
        title=card.title,
        description=card.description,
        image_url=card.image_url,
        position=card.position,
    )


def _seed_session_cards(db: Session, session: SessionModel) -> None:
    if db.query(SessionCard).filter(SessionCard.session_id == session.id).first():
        return

    topic = session.topic.lower()
    seed_cards = SEED_CARDS_BY_TOPIC.get(topic) or [
        {"id": "custom_1", "title": "Option A", "description": "First custom suggestion.", "image_url": ""},
        {"id": "custom_2", "title": "Option B", "description": "Second custom suggestion.", "image_url": ""},
        {"id": "custom_3", "title": "Option C", "description": "Third custom suggestion.", "image_url": ""},
    ]

    for index, item in enumerate(seed_cards):
        db.add(
            SessionCard(
                session_id=session.id,
                position=index,
                external_id=item["id"],
                title=item["title"],
                description=item["description"],
                image_url=item["image_url"],
            )
        )
    db.commit()


def _current_card(db: Session, session: SessionModel) -> SessionCard | None:
    return (
        db.query(SessionCard)
        .filter(
            SessionCard.session_id == session.id,
            SessionCard.position == session.current_card_index,
        )
        .first()
    )


def _next_unvoted_card_for_user(db: Session, session_id: int, user_id: int) -> SessionCard | None:
    voted_card_ids = (
        db.query(SessionSwipe.card_id)
        .filter(
            SessionSwipe.session_id == session_id,
            SessionSwipe.user_id == user_id,
        )
        .subquery()
    )

    return (
        db.query(SessionCard)
        .filter(
            SessionCard.session_id == session_id,
            ~SessionCard.id.in_(voted_card_ids),
        )
        .order_by(SessionCard.position.asc())
        .first()
    )


def _next_unvoted_card_after_position(
    db: Session,
    session_id: int,
    user_id: int,
    position: int,
) -> SessionCard | None:
    voted_card_ids = (
        db.query(SessionSwipe.card_id)
        .filter(
            SessionSwipe.session_id == session_id,
            SessionSwipe.user_id == user_id,
        )
        .subquery()
    )

    return (
        db.query(SessionCard)
        .filter(
            SessionCard.session_id == session_id,
            SessionCard.position > position,
            ~SessionCard.id.in_(voted_card_ids),
        )
        .order_by(SessionCard.position.asc())
        .first()
    )


def _current_card_state(db: Session, session: SessionModel, user_id: int, include_next: bool = False) -> SessionCurrentCardOut:
    if session.status == "matched" and session.matched_card_id:
        card = db.query(SessionCard).filter(SessionCard.id == session.matched_card_id).first()
    else:
        card = _next_unvoted_card_for_user(db, session.id, user_id)

    participant_count = (
        db.query(SessionParticipant)
        .filter(SessionParticipant.session_id == session.id)
        .count()
    )

    if not card:
        return SessionCurrentCardOut(
            card=None,
            session_status=session.status,
            total_participants=participant_count,
            votes_count=0,
            has_voted=False,
            is_match=session.status == "matched",
            next_card=None,
        )

    votes = (
        db.query(SessionSwipe)
        .filter(
            SessionSwipe.session_id == session.id,
            SessionSwipe.card_id == card.id,
        )
        .all()
    )
    
    # Prefetch the next card after the current one for instant transitions.
    next_card = None
    if include_next:
        next_unvoted = _next_unvoted_card_after_position(db, session.id, user_id, card.position)
        if next_unvoted:
            next_card = _card_out(next_unvoted)
    
    return SessionCurrentCardOut(
        card=_card_out(card),
        session_status=session.status,
        total_participants=participant_count,
        votes_count=len(votes),
        has_voted=False,
        is_match=session.matched_card_id == card.id and session.status == "matched",
        next_card=next_card,
    )


def _can_view_session(db: Session, session_id: int, user_id: int) -> tuple[bool, bool]:
    is_participant = _is_participant(db, session_id, user_id)
    can_join = (
        db.query(SessionInvite)
        .filter(
            SessionInvite.session_id == session_id,
            SessionInvite.to_user_id == user_id,
            SessionInvite.status == "pending",
        )
        .first()
        is not None
    )
    return is_participant, can_join


def _delete_session_graph(db: Session, session_id: int) -> None:
    db.query(SessionSwipe).filter(SessionSwipe.session_id == session_id).delete(synchronize_session=False)
    db.query(SessionCard).filter(SessionCard.session_id == session_id).delete(synchronize_session=False)
    db.query(SessionInvite).filter(SessionInvite.session_id == session_id).delete(synchronize_session=False)
    db.query(SessionParticipant).filter(SessionParticipant.session_id == session_id).delete(synchronize_session=False)
    db.query(SessionModel).filter(SessionModel.id == session_id).delete(synchronize_session=False)


@router.post("", response_model=SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    session = SessionModel(
        host_user_id=current_user.id,
        title=payload.title.strip(),
        topic=payload.topic.strip().lower(),
        status="active",
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    db.add(SessionParticipant(session_id=session.id, user_id=current_user.id))
    db.commit()
    _seed_session_cards(db, session)
    db.refresh(session)
    return _session_out(session)


@router.get("/mine", response_model=list[SessionOut])
def list_my_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    sessions = (
        db.query(SessionModel)
        .join(SessionParticipant, SessionParticipant.session_id == SessionModel.id)
        .filter(SessionParticipant.user_id == current_user.id)
        .order_by(SessionModel.created_at.desc())
        .all()
    )
    return [_session_out(item) for item in sessions]


@router.get("/invites/mine", response_model=list[SessionInviteOut])
def list_my_invites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SessionInviteOut]:
    invites = (
        db.query(SessionInvite)
        .filter(
            SessionInvite.to_user_id == current_user.id,
            SessionInvite.status == "pending",
        )
        .order_by(SessionInvite.created_at.desc())
        .all()
    )
    return [_invite_out(item) for item in invites]


@router.get("/{session_id}", response_model=SessionDetailOut)
def get_session_detail(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    is_participant, can_join = _can_view_session(db, session_id, current_user.id)
    if not is_participant and not can_join:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this session")

    participants = (
        db.query(SessionParticipant)
        .filter(SessionParticipant.session_id == session_id)
        .order_by(SessionParticipant.created_at.asc())
        .all()
    )
    invites = (
        db.query(SessionInvite)
        .filter(SessionInvite.session_id == session_id)
        .order_by(SessionInvite.created_at.desc())
        .all()
    )

    return SessionDetailOut(
        session=_session_out(session),
        participants=[
            SessionParticipantOut(
                id=participant.id,
                user=UserResponse.model_validate(participant.user),
                created_at=participant.created_at,
            )
            for participant in participants
        ],
        invites=[_invite_out(invite) for invite in invites],
        is_participant=is_participant,
        can_join=can_join,
    )


@router.post("/{session_id}/invite", response_model=SessionInviteOut, status_code=status.HTTP_201_CREATED)
def invite_user(
    session_id: int,
    payload: SessionInviteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionInviteOut:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot invite users to a closed session")

    if not _is_participant(db, session_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant in this session")

    username = payload.username.strip().lower()
    target_user = db.query(User).filter(User.username == username).first()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if target_user.id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot invite yourself")

    are_friends = (
        db.query(Friendship)
        .filter(
            or_(
                and_(Friendship.requester_id == current_user.id, Friendship.addressee_id == target_user.id),
                and_(Friendship.requester_id == target_user.id, Friendship.addressee_id == current_user.id),
            ),
            Friendship.status == "accepted",
        )
        .first()
    )
    if not are_friends:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only invite friends")

    already_participant = _is_participant(db, session_id, target_user.id)
    if already_participant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already in the session")

    existing_invite = (
        db.query(SessionInvite)
        .filter(
            SessionInvite.session_id == session_id,
            SessionInvite.to_user_id == target_user.id,
            SessionInvite.status == "pending",
        )
        .first()
    )
    if existing_invite:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invite already pending for this user")

    invite = SessionInvite(
        session_id=session_id,
        from_user_id=current_user.id,
        to_user_id=target_user.id,
        status="pending",
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return _invite_out(invite)


@router.post("/{session_id}/join", response_model=SessionDetailOut)
def join_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionDetailOut:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    invite = (
        db.query(SessionInvite)
        .filter(
            SessionInvite.session_id == session_id,
            SessionInvite.to_user_id == current_user.id,
            SessionInvite.status == "pending",
        )
        .first()
    )

    if not _is_participant(db, session_id, current_user.id) and not invite:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to join this session")

    if invite:
        invite.status = "accepted"

    if not _is_participant(db, session_id, current_user.id):
        db.add(SessionParticipant(session_id=session_id, user_id=current_user.id))

    db.commit()
    return get_session_detail(session_id=session_id, current_user=current_user, db=db)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def leave_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    participant = (
        db.query(SessionParticipant)
        .filter(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not part of this session")

    db.delete(participant)

    db.query(SessionInvite).filter(
        SessionInvite.session_id == session_id,
        SessionInvite.to_user_id == current_user.id,
        SessionInvite.status == "pending",
    ).delete(synchronize_session=False)

    remaining_participants = (
        db.query(SessionParticipant)
        .filter(
            SessionParticipant.session_id == session_id,
            SessionParticipant.user_id != current_user.id,
        )
        .count()
    )

    if remaining_participants == 0:
        _delete_session_graph(db, session_id)
        db.commit()
        return

    if session.host_user_id == current_user.id:
        next_participant = (
            db.query(SessionParticipant)
            .filter(SessionParticipant.session_id == session_id)
            .order_by(SessionParticipant.created_at.asc())
            .first()
        )
        if next_participant:
            session.host_user_id = next_participant.user_id

    db.commit()


@router.get("/{session_id}/current-card", response_model=SessionCurrentCardOut)
def get_current_card(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionCurrentCardOut:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    is_participant, can_join = _can_view_session(db, session_id, current_user.id)
    if not is_participant and not can_join:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this session")

    _seed_session_cards(db, session)
    return _current_card_state(db, session, current_user.id, include_next=True)


@router.post("/{session_id}/swipe", response_model=SessionCurrentCardOut)
def swipe_current_card(
    session_id: int,
    payload: SessionSwipeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionCurrentCardOut:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status == "matched":
        return _current_card_state(db, session, current_user.id)
    if session.status != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not active")
    if not _is_participant(db, session_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant in this session")

    _seed_session_cards(db, session)
    card = _next_unvoted_card_for_user(db, session_id, current_user.id)
    if not card:
        return _current_card_state(db, session, current_user.id)

    existing_swipe = (
        db.query(SessionSwipe)
        .filter(
            SessionSwipe.session_id == session_id,
            SessionSwipe.card_id == card.id,
            SessionSwipe.user_id == current_user.id,
        )
        .first()
    )
    if existing_swipe:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already voted on this card")

    db.add(
        SessionSwipe(
            session_id=session_id,
            card_id=card.id,
            user_id=current_user.id,
            direction=payload.direction,
        )
    )
    db.commit()

    participant_count = db.query(SessionParticipant).filter(SessionParticipant.session_id == session_id).count()
    right_votes = (
        db.query(SessionSwipe)
        .filter(
            SessionSwipe.session_id == session_id,
            SessionSwipe.card_id == card.id,
            SessionSwipe.direction == "right",
        )
        .count()
    )

    # Session ends only on unanimous right for the same card.
    if participant_count > 0 and right_votes >= participant_count:
        session.status = "matched"
        session.matched_card_id = card.id
        db.commit()

    db.refresh(session)
    return _current_card_state(db, session, current_user.id, include_next=True)


@router.post("/invites/{invite_id}/respond", response_model=SessionInviteOut)
def respond_to_invite(
    invite_id: int,
    payload: SessionInviteRespondRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionInviteOut:
    invite = db.query(SessionInvite).filter(SessionInvite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")
    if invite.to_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to respond to this invite")
    if invite.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite already handled")

    invite.status = "accepted" if payload.decision == "accept" else "declined"

    if payload.decision == "accept" and not _is_participant(db, invite.session_id, current_user.id):
        db.add(SessionParticipant(session_id=invite.session_id, user_id=current_user.id))

    db.commit()
    db.refresh(invite)
    return _invite_out(invite)


@router.post("/{session_id}/start", response_model=SessionOut)
def start_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionOut:
    session = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    if session.status != "lobby":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session is not in lobby")
    if not _is_participant(db, session_id, current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a participant in this session")

    session.status = "active"
    db.commit()
    db.refresh(session)
    return _session_out(session)
