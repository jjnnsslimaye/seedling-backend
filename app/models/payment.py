from datetime import datetime
from decimal import Decimal
from typing import Optional
import enum
from sqlalchemy import String, Numeric, DateTime, Enum, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class PaymentType(str, enum.Enum):
    """Payment type enum."""
    ENTRY_FEE = "entry_fee"
    PRIZE_PAYOUT = "prize_payout"
    REFUND = "refund"


class PaymentStatus(str, enum.Enum):
    """Payment status enum."""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    """Payment database model."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), nullable=False, index=True)
    submission_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("submissions.id"), nullable=True, index=True
    )

    # Payment details
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Payment type and status
    type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType),
        nullable=False,
        index=True
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True
    )

    # Stripe integration fields
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    stripe_transfer_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)

    # Processing timestamp
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="payments")
    competition: Mapped["Competition"] = relationship("Competition", back_populates="payments")
    submission: Mapped[Optional["Submission"]] = relationship("Submission", back_populates="payments")

    __table_args__ = (
        Index("ix_payments_user_status", "user_id", "status"),
        Index("ix_payments_competition_type", "competition_id", "type"),
        Index("ix_payments_status_type", "status", "type"),
    )

    def __repr__(self) -> str:
        return f"<Payment(id={self.id}, amount={self.amount}, type={self.type}, status={self.status})>"
