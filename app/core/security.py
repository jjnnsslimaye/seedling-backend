from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import get_settings
from app.database import get_db

settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError:
        return None


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Get current user from JWT token.
    Use as a dependency in protected routes.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    return {"user_id": user_id, **payload}


async def get_current_user_obj(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get the current user as a User object from database.

    This is the standard dependency for routes that need user object.
    Raises 404 if user not found.
    """
    # Import here to avoid circular import
    from app.models.user import User

    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


def require_role(*allowed_roles):
    """
    Factory function that creates a dependency to check if user has required role.

    Usage:
        @router.post("/competitions")
        async def create_competition(
            user: User = Depends(require_role(UserRole.ADMIN))
        ):
            # Only ADMIN users can access
            ...

        @router.get("/submissions/{id}/video-url")
        async def get_video_url(
            user: User = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN))
        ):
            # Both JUDGE and ADMIN can access
            ...

    Args:
        *allowed_roles: One or more UserRole values that are allowed access

    Returns:
        Dependency function that returns User object if authorized

    Raises:
        403 Forbidden if user doesn't have required role
    """
    async def check_role(current_user = Depends(get_current_user_obj)):
        # Import here to avoid circular import
        from app.models.user import UserRole

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(r.value for r in allowed_roles)}",
            )
        return current_user

    return check_role
