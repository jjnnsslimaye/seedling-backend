from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate, UserUpdateAdmin
from app.core.security import get_password_hash, verify_password, get_current_user, get_current_user_obj, require_role
from app.services.email_service import send_email_change_notification
from app.core.s3_service import generate_presigned_url
from app.config import get_settings
from PIL import Image
import io
import uuid
import boto3
import logging

settings = get_settings()
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    List all users. Optionally filter by role.

    Admin only endpoint.
    """
    # Only admins can list users
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can list users"
        )

    query = select(User)

    if role:
        query = query.where(User.role == role)

    result = await db.execute(query)
    users = result.scalars().all()

    # Generate fresh presigned URLs for avatars
    user_responses = []
    for user in users:
        # Create UserResponse from the user object
        user_response = UserResponse.model_validate(user)

        # Generate presigned URL if user has an avatar
        if user.avatar_url:
            try:
                user_response.avatar_url = generate_presigned_url(
                    user.avatar_url,
                    expiration=3600  # 1 hour
                )
            except Exception as e:
                logger.warning(f"Failed to generate presigned URL for user {user.id}: {str(e)}")
                # Continue without avatar URL if generation fails
                user_response.avatar_url = None

        user_responses.append(user_response)

    return user_responses


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new user."""
    # Check for existing email (case-insensitive)
    result = await db.execute(
        select(User).where(func.lower(User.email) == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Check for existing username (case-insensitive)
    result = await db.execute(
        select(User).where(func.lower(User.username) == user_data.username.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email.lower(),  # Store email in lowercase
        username=user_data.username.lower(),  # Store username in lowercase
        hashed_password=hashed_password,
    )

    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)

    return db_user


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user information."""
    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user information."""
    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    update_data = user_data.model_dump(exclude_unset=True)

    # Store old email for notification (before any changes)
    old_email = user.email
    email_changed = False

    # If email is being changed, require password verification
    if "email" in update_data and update_data["email"] != user.email:
        email_changed = True
        if "current_password" not in update_data or not update_data["current_password"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is required to change email",
            )

        # Verify the current password
        if not verify_password(update_data["current_password"], user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

    # Remove current_password from update_data (we don't want to store it)
    update_data.pop("current_password", None)

    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    if "email" in update_data:
        # Check if new email is already taken (case-insensitive)
        new_email = update_data["email"].lower()
        if new_email != user.email.lower():
            result = await db.execute(
                select(User).where(func.lower(User.email) == new_email)
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered",
                )
        update_data["email"] = new_email  # Normalize email to lowercase

    if "username" in update_data:
        # Check if new username is already taken (case-insensitive)
        new_username = update_data["username"].lower()
        if new_username != user.username.lower():
            result = await db.execute(
                select(User).where(func.lower(User.username) == new_username)
            )
            if result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken",
                )
        update_data["username"] = new_username  # Normalize username to lowercase

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    # Send email notification to old email address if email was changed
    if email_changed:
        try:
            await send_email_change_notification(
                old_email=old_email,
                new_email=user.email,
                username=user.username
            )
        except Exception as e:
            # Log error but don't fail the update if email notification fails
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to send email change notification: {str(e)}")

    return user


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and set user avatar image.

    Accepts: image files (jpg, png, gif, etc.)
    Returns: avatar_url (S3 key)

    Image is automatically:
    - Resized to 256x256 pixels
    - Converted to JPEG format
    - Uploaded to S3
    """
    # Fetch user object
    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image",
        )

    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # Resize to 256x256 (square)
        image = image.resize((256, 256), Image.Resampling.LANCZOS)

        # Convert to RGB if necessary (handle PNGs with alpha)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode in ('RGBA', 'LA'):
                background.paste(image, mask=image.split()[-1])
            else:
                background.paste(image)
            image = background

        # Save to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='JPEG', quality=90)
        img_byte_arr.seek(0)

        # Generate unique filename
        filename = f"avatars/{user.id}/{uuid.uuid4()}.jpg"

        # Upload to S3
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )

        s3_client.upload_fileobj(
            img_byte_arr,
            settings.aws_s3_bucket,
            filename,
            ExtraArgs={'ContentType': 'image/jpeg'},
        )

        # Delete old avatar from S3 if exists
        if user.avatar_url:
            try:
                s3_client.delete_object(
                    Bucket=settings.aws_s3_bucket,
                    Key=user.avatar_url,
                )
            except Exception as e:
                logger.warning(f"Failed to delete old avatar: {str(e)}")
                # Continue anyway - old file cleanup is not critical

        # Update user record
        user.avatar_url = filename
        await db.commit()
        await db.refresh(user)

        logger.info(f"Avatar uploaded successfully for user {user.id}")

        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": filename,
        }

    except Exception as e:
        logger.error(f"Failed to upload avatar for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload avatar: {str(e)}",
        )


@router.get("/me/avatar-url")
async def get_avatar_url(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get presigned URL for user's avatar.

    Returns a temporary URL that can be used to access the avatar image.
    URL expires in 1 hour.
    """
    # Fetch user object
    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.avatar_url:
        return {"avatar_url": None}

    try:
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )

        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.aws_s3_bucket,
                'Key': user.avatar_url,
            },
            ExpiresIn=3600,  # 1 hour
        )

        return {"avatar_url": presigned_url}

    except Exception as e:
        logger.error(f"Failed to generate presigned URL for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate avatar URL",
        )


@router.delete("/me/avatar")
async def delete_avatar(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete user's avatar.

    Removes the avatar from S3 storage and sets avatar_url to None.
    """
    # Fetch user object
    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.avatar_url:
        return {"message": "No avatar to delete"}

    try:
        # Delete from S3
        s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )

        s3_client.delete_object(
            Bucket=settings.aws_s3_bucket,
            Key=user.avatar_url,
        )

        # Update database
        user.avatar_url = None
        await db.commit()
        await db.refresh(user)

        logger.info(f"Avatar deleted successfully for user {user.id}")

        return {"message": "Avatar deleted successfully"}

    except Exception as e:
        logger.error(f"Failed to delete avatar for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete avatar: {str(e)}",
        )


@router.patch("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    user_data: UserUpdateAdmin,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a user's role (admin only).

    Requirements:
    - Only ADMIN can access this endpoint
    - Cannot change your own role (security measure)
    - New role must be a valid UserRole value

    Args:
        user_id: The ID of the user whose role to update
        user_data: UserUpdateAdmin schema with role field
        current_user: Current authenticated admin user
        db: Database session

    Returns:
        Updated user information
    """
    # Check if admin is trying to change their own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change your own role",
        )

    # Fetch the target user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Get the update data
    update_data = user_data.model_dump(exclude_unset=True)

    # Validate that role field is present and is a valid UserRole
    if "role" not in update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role field is required",
        )

    # Update user role
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    return user
