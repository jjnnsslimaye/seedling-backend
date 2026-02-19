from datetime import datetime
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field


# NOTE: The following schemas are deprecated and replaced by Stripe Connect
# They are kept here temporarily for backwards compatibility but should not be used
# Use app.schemas.connect_account.ConnectAccountStatusResponse instead

class TestTokenResponse(BaseModel):
    """DEPRECATED: Schema for test token creation response."""

    token: str
    message: str
    warning: str
    instructions: str


class BankAccountTokenRequest(BaseModel):
    """DEPRECATED: Schema for adding a bank account using Stripe token."""

    bank_token: str = Field(
        ...,
        description="Stripe bank account token from Stripe.js (e.g., btok_ABC123)"
    )


class BankAccountResponse(BaseModel):
    """DEPRECATED: Schema for bank account response."""

    message: str
    bank_account_last4: str
    verification_needed: bool = True


class VerifyBankAccountRequest(BaseModel):
    """DEPRECATED: Schema for verifying bank account with micro-deposit amounts."""

    amount1: int = Field(..., ge=1, le=99, description="First micro-deposit amount in cents")
    amount2: int = Field(..., ge=1, le=99, description="Second micro-deposit amount in cents")


class VerifyBankAccountResponse(BaseModel):
    """DEPRECATED: Schema for bank account verification response."""

    message: str
    verified: bool


class BankAccountStatus(BaseModel):
    """DEPRECATED: Use ConnectAccountStatus instead."""

    exists: bool
    verified: bool
    last4: Optional[str] = None


class ConnectAccountStatus(BaseModel):
    """Schema for Stripe Connect account status in payout context."""

    has_connect_account: bool = Field(..., description="Whether user has a Connect account")
    onboarding_complete: bool = Field(..., description="Whether Connect onboarding is complete")
    payouts_enabled: bool = Field(..., description="Whether payouts are enabled")
    connect_account_id: Optional[str] = Field(None, description="Stripe Connect account ID")


class WinningSubmissionPayout(BaseModel):
    """Schema for winning submission payout info."""

    submission_id: int
    competition_title: str
    placement: str
    prize_amount: Decimal
    payout_status: Optional[str] = None
    payout_initiated_at: Optional[datetime] = None
    payout_completed_at: Optional[datetime] = None


class PayoutStatusResponse(BaseModel):
    """Schema for payout status response."""

    connect_account: ConnectAccountStatus
    winning_submissions: List[WinningSubmissionPayout]

    model_config = ConfigDict(from_attributes=True)
