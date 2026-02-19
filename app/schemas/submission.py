from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Any, Optional, List, Dict
from pydantic import BaseModel, ConfigDict, Field
from app.models.submission import SubmissionStatus
from app.schemas.competition import UserInfo


class CompetitionInfo(BaseModel):
    """Simplified competition info for nested responses."""

    id: int
    title: str
    domain: str
    status: str
    image_url: Optional[str] = None
    prize_pool: Optional[Decimal] = None
    prize_structure: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class SubmissionBase(BaseModel):
    """Base submission schema with common fields."""

    competition_id: int = Field(..., gt=0)
    title: str = Field(..., max_length=255)
    description: str


class SubmissionCreate(SubmissionBase):
    """Schema for creating a new submission."""

    status: SubmissionStatus = SubmissionStatus.DRAFT
    is_public: bool = False


class SubmissionUpdate(BaseModel):
    """Schema for updating a submission. All fields are optional."""

    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    attachments: Optional[list[dict[str, Any]]] = None
    status: Optional[SubmissionStatus] = None
    is_public: Optional[bool] = None


class SubmissionResponse(SubmissionBase):
    """Schema for submission API responses with full details."""

    id: int
    user_id: int
    attachments: list[dict[str, Any]]
    status: SubmissionStatus
    is_public: bool
    ai_scores: Optional[dict[str, Any]]
    human_scores: Optional[dict[str, Any]]
    final_score: Optional[Decimal]
    placement: Optional[str]
    judge_feedback: Optional[list[dict[str, Any]]]
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    user: UserInfo
    competition: CompetitionInfo
    payment_intent_client_secret: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SubmissionListResponse(BaseModel):
    """Simplified schema for submission listings without scores/feedback."""

    id: int
    competition_id: int
    user_id: int
    title: str
    description: str
    status: SubmissionStatus
    is_public: bool
    placement: Optional[str]
    final_score: Optional[Decimal]
    submitted_at: Optional[datetime]
    created_at: datetime
    user: UserInfo
    competition: CompetitionInfo

    model_config = ConfigDict(from_attributes=True)
