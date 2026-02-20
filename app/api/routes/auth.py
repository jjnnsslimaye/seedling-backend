from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import secrets
from app.database import get_db
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.token import Token
from app.schemas.auth import PasswordResetRequest, PasswordReset, PasswordResetResponse
from app.core.security import verify_password, create_access_token, get_password_hash
from app.config import get_settings
from app.services.email_service import send_password_reset_email

router = APIRouter()
settings = get_settings()


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login endpoint that returns a JWT token."""
    if settings.debug:
        print(f"DEBUG: Login attempt with username/email: '{form_data.username}'")

    # Try username first (case-insensitive)
    result = await db.execute(
        select(User).where(func.lower(User.username) == form_data.username.lower())
    )
    user = result.scalar_one_or_none()
    if settings.debug:
        print(f"DEBUG: User found by username: {user is not None}")

    # If not found by username, try email (case-insensitive)
    if not user:
        if settings.debug:
            print(f"DEBUG: Trying email lookup (case-insensitive)...")
        result = await db.execute(
            select(User).where(func.lower(User.email) == form_data.username.lower())
        )
        user = result.scalar_one_or_none()
        if settings.debug:
            print(f"DEBUG: User found by email: {user is not None}")

    # Now check if user exists
    if not user:
        if settings.debug:
            print(f"DEBUG: No user found with username or email: '{form_data.username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if settings.debug:
        print(f"DEBUG: Verifying password for user: {user.username}")
    if not verify_password(form_data.password, user.hashed_password):
        if settings.debug:
            print(f"DEBUG: Password verification failed for user: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if settings.debug:
        print(f"DEBUG: Password verified successfully for user: {user.username}")

    if not user.is_active:
        if settings.debug:
            print(f"DEBUG: User is inactive: {user.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )

    if settings.debug:
        print(f"DEBUG: User is active, generating token for user: {user.username}, role: {user.role.value}")
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role.value,  # Include role in JWT token
        },
        expires_delta=access_token_expires,
    )

    if settings.debug:
        print(f"DEBUG: Login successful for user: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/request-password-reset", response_model=PasswordResetResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset email. Always returns success for security."""

    # Find user by email (case-insensitive)
    result = await db.execute(
        select(User).where(func.lower(User.email) == request.email.lower())
    )
    user = result.scalar_one_or_none()

    # For security, always return success even if user doesn't exist
    # This prevents email enumeration attacks
    if not user:
        return {"message": "If that email exists, a reset link has been sent"}

    # Generate secure random token
    reset_token = secrets.token_urlsafe(32)

    # Hash the token before storing (for security)
    hashed_token = get_password_hash(reset_token)

    # Create password reset token record
    expires_at = datetime.utcnow() + timedelta(hours=1)
    db_token = PasswordResetToken(
        user_id=user.id,
        token=hashed_token,
        expires_at=expires_at,
        used=False,
    )
    db.add(db_token)
    await db.commit()

    # Send reset email (send the unhashed token to user)
    try:
        await send_password_reset_email(
            to_email=user.email,
            reset_token=reset_token,
            username=user.username
        )
    except Exception as e:
        # Log error but don't reveal to user
        if settings.debug:
            print(f"ERROR: Failed to send password reset email: {str(e)}")

    return {"message": "If that email exists, a reset link has been sent"}


@router.post("/reset-password", response_model=PasswordResetResponse)
async def reset_password(
    request: PasswordReset,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""

    # Get all non-used, non-expired tokens
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > datetime.utcnow()
        )
    )
    tokens = result.scalars().all()

    # Find matching token by verifying hash
    db_token = None
    for token in tokens:
        if verify_password(request.token, token.token):
            db_token = token
            break

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Get the user
    result = await db.execute(
        select(User).where(User.id == db_token.user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update user's password
    user.hashed_password = get_password_hash(request.new_password)

    # Mark token as used
    db_token.used = True

    await db.commit()

    return {"message": "Password reset successfully"}
