from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from decimal import Decimal
from app.schemas.submission import SubmissionResponse
from app.core.s3_service import generate_presigned_url


class JudgeScoreSubmit(BaseModel):
    """Schema for submitting judge scores for a submission."""

    criteria_scores: Dict[str, float] = Field(
        ...,
        description="Scores for each judging criterion (e.g., {'innovation': 8.5, 'feasibility': 7.0})"
    )
    feedback: str = Field(..., description="Judge's qualitative feedback")

    @field_validator("criteria_scores")
    @classmethod
    def validate_score_range(cls, v: Dict[str, float]) -> Dict[str, float]:
        """Validate that all score values are between 0 and 10."""
        for criterion, score in v.items():
            if not 0 <= score <= 10:
                raise ValueError(
                    f"Score for '{criterion}' must be between 0 and 10, got {score}"
                )
        return v


class JudgeScoreInSubmission(BaseModel):
    """Schema for representing a judge's score within a submission response."""

    judge_id: int
    judge_name: str
    criteria_scores: Dict[str, float]
    overall: float = Field(..., description="Average of all criteria scores for this judge")
    feedback: str
    submitted_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionWithScores(SubmissionResponse):
    """Extended submission response that includes parsed human scores and feedback."""

    parsed_human_scores: list[JudgeScoreInSubmission] = Field(
        default_factory=list,
        description="Parsed list of judge scores from human_scores JSON"
    )
    parsed_judge_feedback: Optional[list[Dict[str, Any]]] = Field(
        None,
        description="Structured judge feedback list"
    )
    rubric: Optional[Dict[str, Any]] = Field(
        None,
        description="Competition rubric criteria"
    )
    is_scored: Optional[bool] = Field(
        None,
        description="Whether the current judge has scored this submission"
    )
    judge_score: Optional[float] = Field(
        None,
        description="The current judge's score for this submission"
    )
    founder_username: Optional[str] = Field(
        None,
        description="Username of the founder who submitted"
    )
    video_url: Optional[str] = Field(
        None,
        description="Presigned URL for accessing the submission video (valid for 1 hour)"
    )

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_submission(
        cls,
        submission: Any,
        assignment: Optional[Any] = None,
        current_judge_id: Optional[int] = None
    ) -> "SubmissionWithScores":
        """
        Create a SubmissionWithScores instance from a Submission model.
        Parses the human_scores JSON field into JudgeScoreInSubmission objects.

        Args:
            submission: The Submission model instance
            assignment: Optional JudgeAssignment for current judge
            current_judge_id: Optional current judge's ID to find their score
        """
        # Parse human_scores if available
        parsed_scores = []
        if submission.human_scores:
            # Assuming human_scores is a dict like:
            # {
            #   "judges": [
            #     {
            #       "judge_id": 1,
            #       "judge_name": "John Doe",
            #       "criteria_scores": {"innovation": 8.5, "feasibility": 7.0},
            #       "overall": 7.75,
            #       "feedback": "Great idea!",
            #       "submitted_at": "2025-01-01T12:00:00"
            #     }
            #   ],
            #   "average": 8.5
            # }
            scores_data = submission.human_scores.get("judges", [])
            for score_data in scores_data:
                parsed_scores.append(JudgeScoreInSubmission(**score_data))

        # Parse judge_feedback if available
        # judge_feedback is now a list of feedback objects
        parsed_feedback = None
        if submission.judge_feedback:
            if isinstance(submission.judge_feedback, list):
                parsed_feedback = submission.judge_feedback
            else:
                # Fallback for legacy data (shouldn't happen after migration)
                parsed_feedback = []

        # Get judge scoring status if assignment or current_judge_id provided
        is_scored = None
        judge_score = None
        if assignment:
            is_scored = assignment.completed_at is not None
            # Find judge's score from human_scores
            if current_judge_id and submission.human_scores:
                judges_list = submission.human_scores.get("judges", [])
                for judge_score_entry in judges_list:
                    if judge_score_entry.get("judge_id") == current_judge_id:
                        judge_score = judge_score_entry.get("overall")
                        break

        # Get founder username
        founder_username = submission.user.username if submission.user else None

        # Generate video URL if video attachment exists
        video_url = None
        if submission.attachments:
            for attachment in submission.attachments:
                if attachment.get("type") == "video" and attachment.get("s3_key"):
                    try:
                        video_url = generate_presigned_url(
                            s3_key=attachment["s3_key"],
                            expiration=3600  # 1 hour
                        )
                    except Exception:
                        # If URL generation fails, leave as None
                        video_url = None
                    break

        # Create the response using model_validate to handle all fields
        submission_dict = {
            "id": submission.id,
            "competition_id": submission.competition_id,
            "user_id": submission.user_id,
            "title": submission.title,
            "description": submission.description,
            "attachments": submission.attachments,
            "status": submission.status,
            "is_public": submission.is_public,
            "ai_scores": submission.ai_scores,
            "human_scores": submission.human_scores,
            "final_score": submission.final_score,
            "placement": submission.placement,
            "judge_feedback": submission.judge_feedback,
            "submitted_at": submission.submitted_at,
            "created_at": submission.created_at,
            "updated_at": submission.updated_at,
            "user": submission.user,
            "competition": submission.competition,
            "payment_intent_client_secret": getattr(submission, "payment_intent_client_secret", None),
            "parsed_human_scores": parsed_scores,
            "parsed_judge_feedback": parsed_feedback,
            "rubric": submission.competition.rubric if submission.competition else None,
            "is_scored": is_scored,
            "judge_score": judge_score,
            "founder_username": founder_username,
            "video_url": video_url,
        }

        return cls(**submission_dict)
