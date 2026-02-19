from datetime import datetime
from typing import Optional
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class UserBankAccount(Base):
    """User bank account database model for Stripe payouts."""

    __tablename__ = "user_bank_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Stripe reference
    stripe_bank_account_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True
    )

    # Bank account information
    bank_account_last4: Mapped[str] = mapped_column(
        String(4),
        nullable=False
    )
    bank_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    account_holder_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )

    # Account status
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True
    )
    verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="bank_accounts"
    )

    __table_args__ = (
        Index("ix_user_bank_accounts_user_id", "user_id"),
        Index("ix_user_bank_accounts_stripe_bank_account_id", "stripe_bank_account_id", unique=True),
        Index("ix_user_bank_accounts_is_default", "is_default"),
    )

    def __repr__(self) -> str:
        return f"<UserBankAccount(id={self.id}, user_id={self.user_id}, last4={self.bank_account_last4})>"
