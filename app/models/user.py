from datetime import datetime
import enum
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserRole(str, enum.Enum):
    """User role enum for access control."""
    FOUNDER = "founder"
    JUDGE = "judge"
    ADMIN = "admin"


class User(Base):
    """User database model."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, create_type=False),
        default=UserRole.FOUNDER,
        nullable=False,
        index=True
    )
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)

    # Avatar URL (S3 key)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Stripe Connect for receiving payouts
    stripe_connect_account_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    connect_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    connect_charges_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    connect_payouts_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    connect_onboarded_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    competitions: Mapped[list["Competition"]] = relationship(
        "Competition", back_populates="creator", cascade="all, delete-orphan"
    )
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission", back_populates="user", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="user", cascade="all, delete-orphan"
    )
    judge_assignments: Mapped[list["JudgeAssignment"]] = relationship(
        "JudgeAssignment",
        foreign_keys="[JudgeAssignment.judge_id]",
        back_populates="judge",
        cascade="all, delete-orphan"
    )
    assignments_made: Mapped[list["JudgeAssignment"]] = relationship(
        "JudgeAssignment",
        foreign_keys="[JudgeAssignment.assigned_by]",
        back_populates="assigner",
        cascade="all, delete-orphan"
    )
    bank_accounts: Mapped[list["UserBankAccount"]] = relationship(
        "UserBankAccount",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    @property
    def is_superuser(self) -> bool:
        """Backward compatibility property. Returns True if user has ADMIN role."""
        return self.role == UserRole.ADMIN

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"
