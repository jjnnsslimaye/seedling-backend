from datetime import datetime
from decimal import Decimal
from typing import Optional
import enum
from sqlalchemy import String, Text, Boolean, Numeric, DateTime, Enum, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship, attributes
from app.database import Base


# Scoring weights
AI_SCORE_WEIGHT = 0.0
HUMAN_SCORE_WEIGHT = 1.0


class SubmissionStatus(str, enum.Enum):
    """Submission status enum."""
    DRAFT = "draft"
    PENDING_PAYMENT = "pending_payment"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    WINNER = "winner"
    NOT_SELECTED = "not_selected"
    REJECTED = "rejected"


class Submission(Base):
    """Submission database model."""

    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # Foreign keys
    competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # Basic information
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Attachments stored as JSON array
    attachments: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Status
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, values_callable=lambda x: [e.value for e in x], create_type=False),
        default=SubmissionStatus.DRAFT.value,
        server_default='draft',
        nullable=False,
        index=True
    )

    # Privacy
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Scoring
    ai_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    human_scores: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    final_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    placement: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)

    # Feedback
    judge_feedback: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Submission timestamp
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True, index=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    competition: Mapped["Competition"] = relationship("Competition", back_populates="submissions")
    user: Mapped["User"] = relationship("User", back_populates="submissions")
    payments: Mapped[list["Payment"]] = relationship(
        "Payment", back_populates="submission", cascade="all, delete-orphan"
    )
    judge_assignments: Mapped[list["JudgeAssignment"]] = relationship(
        "JudgeAssignment", back_populates="submission", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_submissions_competition_status", "competition_id", "status"),
        Index("ix_submissions_user_competition", "user_id", "competition_id"),
        Index("ix_submissions_status_final_score", "status", "final_score"),
    )

    def add_judge_score(
        self,
        judge_id: int,
        judge_name: str,
        criteria_scores: dict,
        feedback: str
    ) -> "Submission":
        """
        Add or update a judge's score for this submission.

        Args:
            judge_id: ID of the judge
            judge_name: Name of the judge
            criteria_scores: Dict of criterion name to score (e.g., {"innovation": 8.5})
            feedback: Judge's qualitative feedback

        Returns:
            self for method chaining
        """
        # Load existing human_scores or initialize
        if self.human_scores is None:
            self.human_scores = {"judges": [], "average": 0.0}

        # Calculate weighted average score for this judge using competition rubric
        overall = 0.0
        if criteria_scores and self.competition and self.competition.rubric:
            # Extract rubric (could be nested under "criteria" or at root level)
            rubric_criteria = self.competition.rubric.get("criteria", self.competition.rubric)

            if isinstance(rubric_criteria, dict):
                total_weighted_score = 0.0
                total_weight = 0.0

                for criterion, score in criteria_scores.items():
                    # Get weight from rubric (default to 1.0 if not specified)
                    criterion_details = rubric_criteria.get(criterion, {})
                    weight = criterion_details.get("weight", 1.0) if isinstance(criterion_details, dict) else 1.0

                    total_weighted_score += score * weight
                    total_weight += weight

                # Calculate weighted average
                overall = total_weighted_score / total_weight if total_weight > 0 else 0.0
            else:
                # Fallback to simple average if rubric format is unexpected
                overall = sum(criteria_scores.values()) / len(criteria_scores)
        elif criteria_scores:
            # Fallback to simple average if no rubric available
            overall = sum(criteria_scores.values()) / len(criteria_scores)

        # Create score entry
        score_entry = {
            "judge_id": judge_id,
            "judge_name": judge_name,
            "criteria_scores": criteria_scores,
            "overall": overall,
            "feedback": feedback,
            "submitted_at": datetime.utcnow().isoformat()
        }

        # Check if this judge already scored
        judges_list = self.human_scores.get("judges", [])
        judge_index = None
        for idx, judge_score in enumerate(judges_list):
            if judge_score.get("judge_id") == judge_id:
                judge_index = idx
                break

        if judge_index is not None:
            # Update existing score
            judges_list[judge_index] = score_entry
        else:
            # Append new score
            judges_list.append(score_entry)

        # Update judges list
        self.human_scores["judges"] = judges_list

        # Recalculate average across all judges
        if judges_list:
            total_overall = sum(judge["overall"] for judge in judges_list)
            self.human_scores["average"] = total_overall / len(judges_list)
        else:
            self.human_scores["average"] = 0.0

        # Update judge_feedback as an array
        feedback_entry = {
            "judge_id": judge_id,
            "judge_name": judge_name,
            "feedback": feedback,
            "submitted_at": datetime.utcnow().isoformat()
        }

        # Initialize or load existing feedback array
        if self.judge_feedback is None:
            feedback_array = []
        elif isinstance(self.judge_feedback, str):
            # If it's a string, convert to array format
            feedback_array = []
        else:
            # Assuming it's already stored as JSON/dict
            feedback_array = self.judge_feedback if isinstance(self.judge_feedback, list) else []

        # Check if this judge already has feedback
        feedback_index = None
        for idx, fb in enumerate(feedback_array):
            if fb.get("judge_id") == judge_id:
                feedback_index = idx
                break

        if feedback_index is not None:
            feedback_array[feedback_index] = feedback_entry
        else:
            feedback_array.append(feedback_entry)

        self.judge_feedback = feedback_array

        # Recalculate final score
        self.recalculate_final_score()

        # Mark JSON fields as modified so SQLAlchemy persists the changes
        attributes.flag_modified(self, "human_scores")
        attributes.flag_modified(self, "judge_feedback")

        return self

    def recalculate_final_score(self) -> "Submission":
        """
        Recalculate the final score based on AI and human scores with weights.

        Returns:
            self for method chaining
        """
        # Get human average
        human_avg = 0.0
        if self.human_scores and isinstance(self.human_scores, dict):
            human_avg = self.human_scores.get("average", 0.0)

        # Get AI average
        ai_avg = 0.0
        if self.ai_scores and isinstance(self.ai_scores, dict):
            # Assuming ai_scores has an "average" field similar to human_scores
            # If it's structured differently, adjust accordingly
            ai_avg = self.ai_scores.get("average", 0.0)

        # Calculate weighted final score
        final = (AI_SCORE_WEIGHT * ai_avg) + (HUMAN_SCORE_WEIGHT * human_avg)
        self.final_score = Decimal(str(round(final, 2)))

        return self

    def __repr__(self) -> str:
        return f"<Submission(id={self.id}, title={self.title}, status={self.status})>"
