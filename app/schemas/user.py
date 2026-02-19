from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    username: str


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str
    role: UserRole = UserRole.FOUNDER


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None  # Required for email changes
    is_active: Optional[bool] = None


class UserUpdateAdmin(UserUpdate):
    """Schema for admin-only user updates."""

    role: Optional[UserRole] = None


class UserResponse(UserBase):
    """Schema for user responses."""

    id: int
    is_active: bool
    role: UserRole
    is_superuser: bool  # Backward compatibility (computed property)
    created_at: datetime
    updated_at: datetime

    # Avatar URL
    avatar_url: Optional[str] = None

    # Stripe Connect fields for payout status
    stripe_connect_account_id: Optional[str] = None
    connect_onboarding_complete: bool = False
    connect_charges_enabled: bool = False
    connect_payouts_enabled: bool = False
    connect_onboarded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
