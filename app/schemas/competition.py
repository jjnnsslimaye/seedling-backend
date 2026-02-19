from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.competition import CompetitionStatus


class UserInfo(BaseModel):
    """Simplified user info for nested responses."""

    id: int
    username: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class CompetitionBase(BaseModel):
    """Base competition schema with common fields."""

    title: str = Field(..., max_length=255)
    description: str
    domain: str = Field(..., max_length=100)
    entry_fee: Decimal = Field(..., ge=0)
    max_entries: int = Field(..., gt=0)
    deadline: datetime
    open_date: datetime
    judging_sla_days: int = Field(..., gt=0)
    rubric: dict[str, Any]
    prize_structure: dict[str, Any]
    platform_fee_percentage: Decimal = Field(..., ge=0, le=100)
    image_key: Optional[str] = None
    image_url: Optional[str] = None


class CompetitionCreate(CompetitionBase):
    """Schema for creating a new competition."""

    pass


class CompetitionUpdate(BaseModel):
    """Schema for updating a competition. All fields are optional."""

    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    domain: Optional[str] = Field(None, max_length=100)
    entry_fee: Optional[Decimal] = Field(None, ge=0)
    max_entries: Optional[int] = Field(None, gt=0)
    deadline: Optional[datetime] = None
    open_date: Optional[datetime] = None
    judging_sla_days: Optional[int] = Field(None, gt=0)
    rubric: Optional[dict[str, Any]] = None
    prize_structure: Optional[dict[str, Any]] = None
    platform_fee_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    status: Optional[CompetitionStatus] = None


class CompetitionResponse(CompetitionBase):
    """Schema for competition API responses with full details."""

    id: int
    prize_pool: Decimal
    current_entries: int
    status: CompetitionStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
    creator: UserInfo

    model_config = ConfigDict(from_attributes=True)


class CompetitionListResponse(BaseModel):
    """Simplified schema for competition listings without full rubric/prize_structure."""

    id: int
    title: str
    description: str
    domain: str
    entry_fee: Decimal
    prize_pool: Decimal
    platform_fee_percentage: Decimal
    max_entries: int
    current_entries: int
    deadline: datetime
    open_date: datetime
    status: CompetitionStatus
    created_by: int
    created_at: datetime
    creator: UserInfo
    image_key: Optional[str] = None
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
