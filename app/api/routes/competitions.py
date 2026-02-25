from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.competition import Competition, CompetitionStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.schemas.competition import (
    CompetitionCreate,
    CompetitionUpdate,
    CompetitionResponse,
    CompetitionListResponse,
)
from app.schemas.admin import CompetitionLeaderboard, LeaderboardEntry
from app.core.security import require_role, get_current_user_obj
from app.services.email_service import send_competition_announcement
from app.core.s3_service import generate_presigned_url, s3_client, delete_file
from app.config import get_settings
import logging
import os

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


@router.get("/", response_model=list[CompetitionListResponse])
async def list_competitions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    status_filter: Optional[CompetitionStatus] = Query(None, alias="status", description="Filter by competition status"),
    domain: Optional[str] = Query(None, description="Filter by domain"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: AsyncSession = Depends(get_db),
):
    """
    List competitions with optional filtering and pagination.

    - **skip**: Number of records to skip (default: 0)
    - **limit**: Maximum number of records to return (default: 100, max: 100)
    - **status**: Filter by competition status (optional)
    - **domain**: Filter by domain (optional)
    - **search**: Search in title and description (case-insensitive, optional)
    """
    query = select(Competition).options(selectinload(Competition.creator))

    # Apply filters
    if status_filter is not None:
        query = query.where(Competition.status == status_filter)
    if domain is not None:
        query = query.where(Competition.domain == domain)

    # Filter by search if provided (search in title and description)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Competition.title.ilike(search_term),
                Competition.description.ilike(search_term)
            )
        )

    # Apply ordering, pagination
    query = query.order_by(Competition.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    competitions = result.scalars().all()

    # Generate fresh presigned URLs for all competitions with images
    for comp in competitions:
        if comp.image_key:
            try:
                comp.image_url = generate_presigned_url(comp.image_key, expiration=604800)  # 7 days
            except Exception as e:
                logger.warning(f"Failed to generate presigned URL for competition {comp.id}: {e}")
                comp.image_url = None

    return competitions


@router.get("/{competition_id}", response_model=CompetitionResponse)
async def get_competition(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a single competition by ID with full details.

    Returns 404 if competition not found.
    """
    result = await db.execute(
        select(Competition)
        .options(selectinload(Competition.creator))
        .where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Generate fresh presigned URL if image exists
    if competition.image_key:
        try:
            competition.image_url = generate_presigned_url(competition.image_key, expiration=604800)  # 7 days
        except Exception as e:
            logger.warning(f"Failed to generate presigned URL for competition {competition.id}: {e}")
            competition.image_url = None

    return competition


@router.post("/", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
    competition_data: CompetitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Create a new competition.

    Requires ADMIN role.

    The prize_pool starts at 0 and grows as submissions are made.
    """
    # Create competition
    db_competition = Competition(
        title=competition_data.title,
        description=competition_data.description,
        domain=competition_data.domain,
        entry_fee=competition_data.entry_fee,
        prize_pool=0,
        platform_fee_percentage=competition_data.platform_fee_percentage,
        max_entries=competition_data.max_entries,
        deadline=competition_data.deadline.replace(tzinfo=None),
        open_date=competition_data.open_date.replace(tzinfo=None),
        judging_sla_days=competition_data.judging_sla_days,
        rubric=competition_data.rubric,
        prize_structure=competition_data.prize_structure,
        created_by=current_user.id,
    )

    db.add(db_competition)
    await db.commit()
    await db.refresh(db_competition)

    # Fetch with relationships
    result = await db.execute(
        select(Competition)
        .options(selectinload(Competition.creator))
        .where(Competition.id == db_competition.id)
    )
    competition = result.scalar_one()

    return competition


@router.patch("/{competition_id}", response_model=CompetitionResponse)
async def update_competition(
    competition_id: int,
    competition_data: CompetitionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Update a competition.

    Requires ADMIN role.
    All fields are optional - only provided fields will be updated.
    """
    # Fetch competition
    result = await db.execute(
        select(Competition)
        .options(selectinload(Competition.creator))
        .where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Special handling when completing a competition
    if competition_data.status == CompetitionStatus.COMPLETE:
        # Validation 1: Competition must currently be in JUDGING status
        if competition.status != CompetitionStatus.JUDGING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete competition. Must be in JUDGING status. Current status: {competition.status.value}"
            )

        # Validation 2: Winners must be selected
        winner_result = await db.execute(
            select(func.count(Submission.id)).where(
                Submission.competition_id == competition_id,
                Submission.status == SubmissionStatus.WINNER
            )
        )
        winner_count = winner_result.scalar()

        if winner_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot complete competition. No winners have been selected yet."
            )

        # Validation 3: Number of winners matches prize_structure
        expected_winners = len(competition.prize_structure) if competition.prize_structure else 0
        if winner_count != expected_winners:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot complete competition. Expected {expected_winners} winners but found {winner_count}."
            )

        # TODO: Future enhancements when completing:
        # - Lock competition data (prevent further edits)
        # - Send email notifications to all participants
        # - Trigger analytics/reporting
        # - Log completion event

    # Store old status before update
    old_status = competition.status

    # Update fields
    update_data = competition_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if isinstance(value, datetime) and value.tzinfo is not None:
            value = value.replace(tzinfo=None)
        setattr(competition, field, value)

    await db.commit()
    await db.refresh(competition)

    # Check if status changed from DRAFT to UPCOMING
    if old_status == CompetitionStatus.DRAFT and competition.status == CompetitionStatus.UPCOMING:
        # Send email announcements to all founders
        try:
            # Fetch all founder users
            result = await db.execute(
                select(User).where(User.role == UserRole.FOUNDER)
            )
            founders = result.scalars().all()

            # Format dates for email
            start_date = competition.open_date.strftime('%B %d, %Y') if competition.open_date else 'TBD'
            end_date = competition.deadline.strftime('%B %d, %Y') if competition.deadline else 'TBD'

            # Send email to each founder
            for founder in founders:
                try:
                    await send_competition_announcement(
                        to_email=founder.email,
                        username=founder.username,
                        competition_id=competition.id,
                        competition_title=competition.title,
                        domain=competition.domain,
                        description=competition.description,
                        prize_pool=competition.prize_pool,
                        entry_fee=competition.entry_fee,
                        max_entries=competition.max_entries,
                        start_date=start_date,
                        end_date=end_date,
                        frontend_url=settings.frontend_url
                    )
                except Exception as email_error:
                    logger.error(f"Failed to send competition announcement to founder {founder.id}: {str(email_error)}")
                    continue

            logger.info(f"Competition announcement emails sent for competition {competition.id} to {len(founders)} founders")

        except Exception as e:
            logger.error(f"Failed to send competition announcements for competition {competition.id}: {str(e)}")
            # Don't fail the status update if emails fail

    # Fetch with relationships
    result = await db.execute(
        select(Competition)
        .options(selectinload(Competition.creator))
        .where(Competition.id == competition.id)
    )
    competition = result.scalar_one()

    return competition


@router.get("/{competition_id}/results", response_model=CompetitionLeaderboard)
async def get_competition_results(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get public competition results (leaderboard).

    Accessible by: All authenticated users

    Returns:
    - Full leaderboard with rankings
    - Only shows completed competitions
    - Winner information and placements
    - Submission titles (usernames hidden for privacy)
    """
    # 1. Fetch competition
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition {competition_id} not found",
        )

    # 2. Only show results for COMPLETE competitions
    if competition.status != CompetitionStatus.COMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition results are only available for completed competitions",
        )

    # 3. Query eligible submissions with relationships
    result = await db.execute(
        select(Submission)
        .where(
            Submission.competition_id == competition_id,
            Submission.status.in_([
                SubmissionStatus.SUBMITTED,
                SubmissionStatus.UNDER_REVIEW,
                SubmissionStatus.WINNER,
                SubmissionStatus.NOT_SELECTED,
            ])
        )
        .options(
            selectinload(Submission.user),
            selectinload(Submission.judge_assignments),
        )
    )
    eligible_submissions = result.scalars().all()

    # Count total submissions
    total_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.competition_id == competition_id
        )
    )
    total_submissions = total_result.scalar()

    # 4. Build submission data with judging stats
    submission_data = []
    for submission in eligible_submissions:
        # Calculate judging stats
        num_judges_assigned = len(submission.judge_assignments)
        num_judges_completed = sum(
            1 for assignment in submission.judge_assignments
            if assignment.completed_at is not None
        )
        judging_complete = (
            num_judges_assigned > 0 and
            num_judges_completed == num_judges_assigned
        )

        # Extract human scores average
        human_scores_average = None
        if submission.human_scores and isinstance(submission.human_scores, dict):
            human_scores_average = submission.human_scores.get("average")

        submission_data.append({
            "submission": submission,
            "num_judges_assigned": num_judges_assigned,
            "num_judges_completed": num_judges_completed,
            "judging_complete": judging_complete,
            "human_scores_average": human_scores_average,
        })

    # 5. Sort: fully judged first (by score DESC), then incomplete (by submission ID)
    submission_data.sort(
        key=lambda x: (
            not x["judging_complete"],
            -x["submission"].final_score if x["submission"].final_score is not None else 0,
            x["submission"].id
        )
    )

    # 6. Assign ranks and detect ties
    entries = []
    current_rank = 1
    previous_score = None
    fully_judged_count = sum(1 for data in submission_data if data["judging_complete"])

    for idx, data in enumerate(submission_data):
        submission = data["submission"]
        score = submission.final_score

        # Only assign ranks to scored submissions
        if score is not None:
            # Check for tie
            has_tie = False
            if previous_score is not None and score == previous_score:
                has_tie = True
            else:
                if idx > 0 and previous_score is not None:
                    current_rank = idx + 1

            # Mark previous entry as tied too if scores match
            if has_tie and entries:
                entries[-1].has_tie = True

            # Generate presigned URL for avatar if available
            avatar_url = None
            if submission.user and submission.user.avatar_url:
                try:
                    avatar_url = generate_presigned_url(submission.user.avatar_url, expiration=86400)  # 24 hours
                except Exception as e:
                    logger.warning(f"Failed to generate presigned URL for avatar: {e}")
                    avatar_url = None

            entry = LeaderboardEntry(
                rank=current_rank,
                submission_id=submission.id,
                title=submission.title,
                user_id=submission.user_id,
                username=submission.user.username if submission.user else "Unknown",
                avatar_url=avatar_url,
                final_score=submission.final_score,
                human_scores_average=data["human_scores_average"],
                num_judges_assigned=data["num_judges_assigned"],
                num_judges_completed=data["num_judges_completed"],
                judging_complete=data["judging_complete"],
                has_tie=has_tie,
                is_public=submission.is_public,
            )
            entries.append(entry)
            previous_score = score
        else:
            # Unscored submission - no rank
            # Generate presigned URL for avatar if available
            avatar_url = None
            if submission.user and submission.user.avatar_url:
                try:
                    avatar_url = generate_presigned_url(submission.user.avatar_url, expiration=86400)  # 24 hours
                except Exception as e:
                    logger.warning(f"Failed to generate presigned URL for avatar: {e}")
                    avatar_url = None

            entry = LeaderboardEntry(
                rank=999,
                submission_id=submission.id,
                title=submission.title,
                user_id=submission.user_id,
                username=submission.user.username if submission.user else "Unknown",
                avatar_url=avatar_url,
                final_score=None,
                human_scores_average=data["human_scores_average"],
                num_judges_assigned=data["num_judges_assigned"],
                num_judges_completed=data["num_judges_completed"],
                judging_complete=data["judging_complete"],
                has_tie=False,
                is_public=submission.is_public,
            )
            entries.append(entry)

    # 7. Return leaderboard
    return CompetitionLeaderboard(
        competition_id=competition.id,
        competition_title=competition.title,
        domain=competition.domain,
        status=competition.status.value,
        prize_pool=competition.prize_pool,
        prize_structure=competition.prize_structure,
        entries=entries,
        total_submissions=total_submissions or 0,
        eligible_submissions=len(eligible_submissions),
        fully_judged_count=fully_judged_count,
    )


@router.delete("/{competition_id}")
async def delete_competition(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Delete a competition. Only allowed for draft competitions.

    Requires ADMIN role.
    """
    # Get competition
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Only allow deleting draft competitions
    if competition.status != CompetitionStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft competitions",
        )

    # Delete the competition
    await db.delete(competition)
    await db.commit()

    return {"message": "Competition deleted successfully"}


@router.post("/{competition_id}/upload-image", response_model=CompetitionResponse)
async def upload_competition_image(
    competition_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Upload cover image for a competition.

    Requires ADMIN role.

    Validates file type (jpg, jpeg, png, webp) and size (max 5MB).
    Uploads to S3 and updates competition record.
    """
    # Debug logging
    if settings.debug:
        print("=" * 80)
        print("=== IMAGE UPLOAD ENDPOINT CALLED ===")
        print(f"Competition ID: {competition_id}")
        print(f"File: {file.filename if file else 'No file'}")
        print(f"File content type: {file.content_type if file else 'N/A'}")
        print(f"User: {current_user.email}")
        print(f"User role: {current_user.role}")
        print("=" * 80)

    # Fetch competition
    result = await db.execute(
        select(Competition)
        .options(selectinload(Competition.creator))
        .where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only JPG, PNG, and WebP images are allowed.",
        )

    # Validate file size (5MB max)
    contents = await file.read()
    file_size = len(contents)
    max_size = 5 * 1024 * 1024  # 5MB in bytes

    if settings.debug:
        print(f"File size: {file_size / (1024 * 1024):.2f}MB")

    if file_size > max_size:
        if settings.debug:
            print(f"ERROR: File too large!")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is 5MB, got {file_size / (1024 * 1024):.2f}MB.",
        )

    # Determine file extension
    ext_map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }
    extension = ext_map[file.content_type]
    if settings.debug:
        print(f"File extension: {extension}")

    # Delete old image if exists
    if competition.image_key:
        try:
            delete_file(competition.image_key)
            logger.info(f"Deleted old competition image: {competition.image_key}")
        except Exception as e:
            logger.warning(f"Failed to delete old competition image: {e}")

    # Upload new image to S3
    s3_key = f"competitions/{competition_id}/cover-image.{extension}"
    if settings.debug:
        print(f"S3 key: {s3_key}")
        print(f"S3 bucket: {settings.aws_s3_bucket}")

    try:
        s3_client.put_object(
            Bucket=settings.aws_s3_bucket,
            Key=s3_key,
            Body=contents,
            ContentType=file.content_type,
        )
        if settings.debug:
            print(f"✓ Successfully uploaded to S3: {s3_key}")
        logger.info(f"Uploaded competition image to S3: {s3_key}")
    except Exception as e:
        if settings.debug:
            print(f"✗ Failed to upload to S3: {e}")
        logger.error(f"Failed to upload competition image to S3: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image. Please try again.",
        )

    # Update competition record with image_key only (URL generated on GET requests)
    competition.image_key = s3_key
    competition.image_url = None  # Don't store URL in DB - will be generated fresh on each GET
    if settings.debug:
        print(f"Updating competition {competition_id} with image_key")

    await db.commit()
    await db.refresh(competition)
    if settings.debug:
        print(f"✓ Competition updated successfully")
        print("=" * 80)

    # Fetch with relationships
    result = await db.execute(
        select(Competition)
        .options(selectinload(Competition.creator))
        .where(Competition.id == competition.id)
    )
    competition = result.scalar_one()

    # Generate fresh presigned URL for immediate response (7 days)
    if competition.image_key:
        try:
            competition.image_url = generate_presigned_url(competition.image_key, expiration=604800)
            if settings.debug:
                print(f"✓ Generated presigned URL for response: {competition.image_url[:50]}...")
        except Exception as e:
            if settings.debug:
                print(f"✗ Failed to generate presigned URL: {e}")
            logger.warning(f"Failed to generate presigned URL: {e}")
            competition.image_url = None

    return competition


@router.delete("/{competition_id}/image")
async def delete_competition_image(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Delete cover image for a competition.

    Requires ADMIN role.

    Removes image from S3 and clears image fields in competition record.
    """
    # Fetch competition
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    if not competition.image_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition does not have an image to delete",
        )

    # Delete from S3
    try:
        delete_file(competition.image_key)
        logger.info(f"Deleted competition image from S3: {competition.image_key}")
    except Exception as e:
        logger.warning(f"Failed to delete competition image from S3: {e}")
        # Continue anyway to clear the database fields

    # Clear image fields
    competition.image_key = None
    competition.image_url = None

    await db.commit()

    return {"message": "Competition image deleted successfully"}
