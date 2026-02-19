from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class JudgeAssignment(Base):
    """Judge assignment database model."""

    __tablename__ = "judge_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    judge_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id"),
        nullable=False,
        index=True
    )
    assigned_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    # Timestamps
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True
    )

    # Relationships
    judge: Mapped["User"] = relationship(
        "User",
        foreign_keys=[judge_id],
        back_populates="judge_assignments"
    )
    submission: Mapped["Submission"] = relationship(
        "Submission",
        back_populates="judge_assignments"
    )
    assigner: Mapped["User"] = relationship(
        "User",
        foreign_keys=[assigned_by],
        back_populates="assignments_made"
    )

    __table_args__ = (
        UniqueConstraint("judge_id", "submission_id", name="uq_judge_submission"),
        Index("ix_judge_assignments_judge_id", "judge_id"),
        Index("ix_judge_assignments_submission_id", "submission_id"),
        Index("ix_judge_assignments_assigned_by", "assigned_by"),
    )

    def __repr__(self) -> str:
        return f"<JudgeAssignment(id={self.id}, judge_id={self.judge_id}, submission_id={self.submission_id})>"
