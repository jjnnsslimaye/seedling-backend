from datetime import datetime
from typing import List, Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


class JudgeAssignmentCreate(BaseModel):
    """Schema for creating judge assignments."""

    judge_id: int = Field(..., gt=0, description="ID of the judge to assign")
    submission_ids: List[int] = Field(
        ...,
        min_length=1,
        description="List of submission IDs to assign to this judge"
    )


class BulkJudgeAssignmentRequest(BaseModel):
    """Schema for bulk judge assignment requests."""

    assignments: List[JudgeAssignmentCreate] = Field(
        ...,
        min_length=1,
        description="List of judge assignments to create"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "assignments": [
                    {"judge_id": 2, "submission_ids": [1, 2, 3]},
                    {"judge_id": 5, "submission_ids": [4, 5, 6]}
                ]
            }
        }
    )


class JudgeAssignmentResponse(BaseModel):
    """Schema for judge assignment API responses."""

    id: int
    judge_id: int
    judge_name: str
    submission_id: int
    submission_title: str
    assigned_by: int
    assigned_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AssignmentSummary(BaseModel):
    """Schema for showing assignment status summary per judge."""

    judge_id: int
    judge_name: str
    total_assigned: int
    total_completed: int
    submission_ids: List[int]

    model_config = ConfigDict(from_attributes=True)


class LeaderboardEntry(BaseModel):
    """Schema for a single leaderboard entry."""

    rank: int
    submission_id: int
    title: str
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    final_score: Optional[Decimal] = None
    human_scores_average: Optional[float] = None
    num_judges_assigned: int
    num_judges_completed: int
    judging_complete: bool
    has_tie: bool = False
    is_public: bool = False

    model_config = ConfigDict(from_attributes=True)


class CompetitionLeaderboard(BaseModel):
    """Schema for competition leaderboard response."""

    competition_id: int
    competition_title: str
    domain: str
    status: str
    prize_pool: Decimal
    prize_structure: Dict[str, Any]
    entries: List[LeaderboardEntry]
    total_submissions: int
    eligible_submissions: int
    fully_judged_count: int

    model_config = ConfigDict(from_attributes=True)


class WinnerSelection(BaseModel):
    """Schema for selecting a single winner."""

    submission_id: int = Field(..., gt=0, description="Submission ID")
    place: str = Field(..., description="Place/ranking (e.g., 'first', 'second', 'third')")


class SelectWinnersRequest(BaseModel):
    """Schema for selecting competition winners."""

    winners: List[WinnerSelection] = Field(
        ...,
        min_length=1,
        description="List of winners with their placements"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "winners": [
                    {"submission_id": 12, "place": "first"},
                    {"submission_id": 11, "place": "second"},
                    {"submission_id": 10, "place": "third"}
                ]
            }
        }
    )


class WinnerInfo(BaseModel):
    """Schema for winner information in response."""

    place: str
    submission_id: int
    title: str
    username: str
    prize_amount: Decimal


class WinnerSelectionResponse(BaseModel):
    """Schema for winner selection response."""

    competition_id: int
    status: str
    winners: List[WinnerInfo]


class PayoutResult(BaseModel):
    """Schema for individual payout result."""

    submission_id: int
    user_id: int
    username: str
    placement: str
    prize_amount: Decimal
    stripe_payout_id: Optional[str] = None
    status: str  # "success", "pending_bank_info", "already_paid", "error"
    message: Optional[str] = None


class DistributePrizesResponse(BaseModel):
    """Schema for prize distribution response."""

    competition_id: int
    competition_title: str
    successful_payouts: List[PayoutResult]
    pending_bank_info: List[PayoutResult]
    failed_payouts: List[PayoutResult]
    already_paid: List[PayoutResult]
    total_distributed: Decimal
    total_expected: Decimal
    summary: str
