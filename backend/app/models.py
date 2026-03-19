from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    username: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Friendship(Base):
    __tablename__ = "friendships"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friendship_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    requester_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    addressee_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    requester: Mapped["User"] = relationship("User", foreign_keys=[requester_id])
    addressee: Mapped["User"] = relationship("User", foreign_keys=[addressee_id])


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    host_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(140), nullable=False)
    topic: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="lobby")
    current_card_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    matched_card_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("session_cards.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    host: Mapped["User"] = relationship("User", foreign_keys=[host_user_id])


class SessionParticipant(Base):
    __tablename__ = "session_participants"
    __table_args__ = (
        UniqueConstraint("session_id", "user_id", name="uq_session_participant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["Session"] = relationship("Session", foreign_keys=[session_id])
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])


class SessionInvite(Base):
    __tablename__ = "session_invites"
    __table_args__ = (
        UniqueConstraint("session_id", "to_user_id", name="uq_session_invite_target"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    from_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    to_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["Session"] = relationship("Session", foreign_keys=[session_id])
    from_user: Mapped["User"] = relationship("User", foreign_keys=[from_user_id])
    to_user: Mapped["User"] = relationship("User", foreign_keys=[to_user_id])


class SessionCard(Base):
    __tablename__ = "session_cards"
    __table_args__ = (
        UniqueConstraint("session_id", "position", name="uq_session_card_position"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    external_id: Mapped[str] = mapped_column(String(120), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1200), nullable=False, default="")
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["Session"] = relationship("Session", foreign_keys=[session_id])


class SessionSwipe(Base):
    __tablename__ = "session_swipes"
    __table_args__ = (
        UniqueConstraint("session_id", "card_id", "user_id", name="uq_session_card_user_swipe"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    card_id: Mapped[int] = mapped_column(Integer, ForeignKey("session_cards.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["Session"] = relationship("Session", foreign_keys=[session_id])
    card: Mapped["SessionCard"] = relationship("SessionCard", foreign_keys=[card_id])
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
