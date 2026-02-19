from pydantic import BaseModel, EmailStr, Field


class PasswordResetRequest(BaseModel):
    """Schema for requesting a password reset."""
    email: EmailStr


class PasswordReset(BaseModel):
    """Schema for resetting password with token."""
    token: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)


class PasswordResetResponse(BaseModel):
    """Generic response for password reset operations."""
    message: str
