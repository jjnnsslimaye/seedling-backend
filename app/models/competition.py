from datetime import datetime
from decimal import Decimal
from typing import Optional
import enum
from sqlalchemy import String, Text, Integer, Numeric, DateTime, Enum, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class CompetitionStatus(str, enum.Enum):
    """Competition status enum."""
    DRAFT = "draft"
    UPCOMING = "upcoming"
    ACTIVE = "active"
    CLOSED = "closed"
    JUDGING = "judging"
    COMPLETE = "complete"


class Competition(Base):
    """Competition database model."""

    __tablename__ = "competitions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Basic information
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(String(100), nullable=False, index=True)

    # Image fields
    image_key: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Financial fields
    entry_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    prize_pool: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    platform_fee_percentage: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)

    # Entry management
    max_entries: Mapped[int] = mapped_column(Integer, nullable=False)
    current_entries: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Dates
    deadline: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    open_date: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)

    # Judging
    judging_sla_days: Mapped[int] = mapped_column(Integer, nullable=False)

    # Status
    status: Mapped[CompetitionStatus] = mapped_column(
        Enum(CompetitionStatus, create_type=False),
        default=CompetitionStatus.DRAFT,
        nullable=False,
        index=True
    )

    # JSON fields
    rubric: Mapped[dict] = mapped_column(JSON, nullable=False)
    prize_structure: Mapped[dict] = mapped_column(JSON, nullable=False)

    # Foreign key
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    creator: Mapped["User"] = relationship("User", back_populates="competitions")
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission", back_populates="competition", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="competition", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_competitions_status_deadline", "status", "deadline"),
        Index("ix_competitions_domain_status", "domain", "status"),
    )

    def __repr__(self) -> str:
        return f"<Competition(id={self.id}, title={self.title}, status={self.status})>"
