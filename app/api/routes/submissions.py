from datetime import datetime
from typing import Optional
from decimal import Decimal
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.submission import Submission, SubmissionStatus
from app.models.competition import Competition, CompetitionStatus
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionUpdate,
    SubmissionResponse,
    SubmissionListResponse,
)
from app.core.security import get_current_user
from app.core.stripe_service import create_payment_intent, get_payment_intent
from app.core.s3_service import upload_video, generate_presigned_url, delete_file
from app.config import get_settings
import stripe

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter()


async def get_current_user_obj(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current user as a User object.
    Raises 404 if user not found.
    """
    result = await db.execute(select(User).where(User.id == int(current_user["user_id"])))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.post("/", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_data: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Create a new submission.

    Requires authentication. Validates:
    - Competition exists and is active
    - Competition is not full (if status is "submitted")
    - User hasn't already submitted to this competition

    If status is "submitted":
    - Creates a Stripe PaymentIntent for the entry fee
    - Creates a Payment record with status="pending"
    - Sets submission status to "pending_payment"
    - Returns payment_intent_client_secret for frontend to complete payment
    - Does NOT increment competition.current_entries or update prize_pool yet
      (this happens when payment is confirmed via webhook)
    """
    # Fetch competition
    result = await db.execute(
        select(Competition).where(Competition.id == submission_data.competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found",
        )

    # Check competition is active
    if competition.status != CompetitionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Competition is not active. Current status: {competition.status}",
        )

    # Check if user already has a pending submission for this competition
    if submission_data.status == SubmissionStatus.SUBMITTED:
        existing_submission_result = await db.execute(
            select(Submission)
            .options(selectinload(Submission.payments))
            .where(
                Submission.competition_id == submission_data.competition_id,
                Submission.user_id == current_user.id,
                Submission.status.in_([
                    SubmissionStatus.DRAFT,
                    SubmissionStatus.PENDING_PAYMENT
                ])
            )
        )
        existing_submission = existing_submission_result.scalar_one_or_none()

        if existing_submission:
            # Find the existing payment
            existing_payment = None
            for payment in existing_submission.payments:
                if payment.type == PaymentType.ENTRY_FEE:
                    existing_payment = payment
                    break

            if existing_payment and existing_payment.status == PaymentStatus.PENDING:
                # Retrieve the PaymentIntent from Stripe to get client_secret
                try:
                    payment_intent = stripe.PaymentIntent.retrieve(
                        existing_payment.stripe_payment_intent_id
                    )

                    # Fetch the complete submission with relationships
                    result = await db.execute(
                        select(Submission)
                        .options(
                            selectinload(Submission.user),
                            selectinload(Submission.competition)
                        )
                        .where(Submission.id == existing_submission.id)
                    )
                    complete_submission = result.scalar_one()

                    # Convert to response model and add payment secret
                    response_data = SubmissionResponse.model_validate(complete_submission)
                    response_data.payment_intent_client_secret = payment_intent.client_secret

                    return response_data

                except stripe.error.StripeError as e:
                    # If we can't retrieve the payment intent, raise error
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to retrieve existing payment intent: {str(e)}"
                    )
            else:
                # Submission exists but no pending payment - shouldn't happen
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You already have a submission (ID: {existing_submission.id}) for this competition. Please contact support."
                )

    # Check if user already has a fully submitted submission for this competition
    result = await db.execute(
        select(Submission).where(
            Submission.user_id == current_user.id,
            Submission.competition_id == submission_data.competition_id,
            Submission.status.in_([
                SubmissionStatus.SUBMITTED,
                SubmissionStatus.UNDER_REVIEW,
                SubmissionStatus.WINNER
            ])
        )
    )
    existing_submission = result.scalar_one_or_none()

    if existing_submission:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already submitted an entry for this competition",
        )

    # If submitting (not draft), check competition is not full
    if submission_data.status == SubmissionStatus.SUBMITTED:
        if competition.current_entries >= competition.max_entries:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competition is full",
            )

    # Create submission
    db_submission = Submission(
        competition_id=submission_data.competition_id,
        user_id=current_user.id,
        title=submission_data.title,
        description=submission_data.description,
        status=submission_data.status.value,  # Extract lowercase enum value
    )

    db.add(db_submission)

    await db.commit()
    await db.refresh(db_submission)

    # Fetch with relationships
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == db_submission.id)
    )
    submission = result.scalar_one()

    return SubmissionResponse.model_validate(submission)


@router.get("/", response_model=list[SubmissionListResponse])
async def list_submissions(
    competition_id: Optional[int] = Query(None, description="Filter by competition ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    List current user's submissions.

    Optional filter by competition_id.
    """
    query = (
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.user_id == current_user.id)
    )

    # Apply competition filter if provided
    if competition_id is not None:
        query = query.where(Submission.competition_id == competition_id)

    query = query.order_by(Submission.created_at.desc())

    result = await db.execute(query)
    submissions = result.scalars().all()

    # Generate fresh presigned URLs for competition images
    for submission in submissions:
        if submission.competition and submission.competition.image_key:
            try:
                submission.competition.image_url = generate_presigned_url(
                    submission.competition.image_key,
                    expiration=604800  # 7 days
                )
            except Exception as e:
                logger.error(f"Failed to generate presigned URL for competition {submission.competition.id}: {e}")
                # Leave the existing image_url as-is if generation fails

    return submissions


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get a single submission by ID.

    Users can only view their own submissions unless they are admins.
    Returns 404 if submission not found.
    Returns 403 if user is not authorized to view this submission.
    """
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Check authorization: user must own the submission or be admin
    if submission.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this submission",
        )

    return submission


@router.patch("/{submission_id}", response_model=SubmissionResponse)
async def update_submission(
    submission_id: int,
    submission_data: SubmissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Update a submission.

    Users can only update their own submissions (unless admin).
    Users cannot edit submissions after they are submitted (unless admin).

    If status changes from draft to submitted:
    - Creates a Stripe PaymentIntent for the entry fee
    - Creates a Payment record with status="pending"
    - Sets submission status to "pending_payment" (NOT submitted)
    - Returns payment_intent_client_secret for frontend to complete payment
    - Does NOT increment competition.current_entries or update prize_pool yet
      (this happens when payment is confirmed via webhook)
    """
    # Fetch submission
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Check authorization: user must own the submission or be admin
    if submission.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this submission",
        )

    # Check if submission is already submitted (non-admin can't edit)
    # Allow editing of DRAFT and PENDING_PAYMENT submissions
    if (
        submission.status not in [SubmissionStatus.DRAFT, SubmissionStatus.PENDING_PAYMENT]
        and not current_user.is_superuser
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit submission after it has been submitted",
        )

    # Get update data
    update_data = submission_data.model_dump(exclude_unset=True)

    # Check if status is changing from draft/pending_payment to submitted
    status_changing_to_submitted = (
        "status" in update_data
        and submission.status in [SubmissionStatus.DRAFT, SubmissionStatus.PENDING_PAYMENT]
        and update_data["status"] == SubmissionStatus.SUBMITTED
    )

    # Initialize payment client secret variable
    payment_intent_client_secret = None

    if status_changing_to_submitted:
        # Fetch competition to check capacity
        result = await db.execute(
            select(Competition).where(Competition.id == submission.competition_id)
        )
        competition = result.scalar_one()

        # Check competition is not full
        if competition.current_entries >= competition.max_entries:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Competition is full",
            )

        # Check competition is still active
        if competition.status != CompetitionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Competition is not active. Current status: {competition.status}",
            )

        # STEP 1: Check if payment already exists for this submission (idempotency)
        existing_payment_result = await db.execute(
            select(Payment)
            .where(Payment.submission_id == submission.id)
            .where(Payment.type == PaymentType.ENTRY_FEE)
            .order_by(Payment.created_at.desc())
        )
        existing_payment = existing_payment_result.scalar_one_or_none()

        # STEP 2: If payment exists, verify status with Stripe
        if existing_payment and existing_payment.stripe_payment_intent_id:
            try:
                # Query Stripe for actual payment status
                stripe_intent = stripe.PaymentIntent.retrieve(
                    existing_payment.stripe_payment_intent_id
                )

                # CASE A: Payment already succeeded (webhook failed to update DB)
                if stripe_intent.status == 'succeeded':
                    logger.info(f"Payment {existing_payment.id} already succeeded in Stripe, syncing DB")

                    # Update our DB to match Stripe reality
                    existing_payment.status = PaymentStatus.COMPLETED
                    existing_payment.processed_at = datetime.utcnow()

                    update_data["status"] = SubmissionStatus.SUBMITTED
                    update_data["submitted_at"] = datetime.utcnow()

                    # Update competition stats (since webhook didn't run)
                    platform_fee = competition.entry_fee * (competition.platform_fee_percentage / 100)
                    competition.current_entries += 1
                    competition.prize_pool += (competition.entry_fee - platform_fee)

                    # Apply updates and commit
                    for field, value in update_data.items():
                        setattr(submission, field, value)

                    await db.commit()
                    await db.refresh(submission)

                    # Fetch with relationships for response
                    result = await db.execute(
                        select(Submission)
                        .options(
                            selectinload(Submission.user),
                            selectinload(Submission.competition),
                        )
                        .where(Submission.id == submission.id)
                    )
                    submission = result.scalar_one()

                    return submission

                # CASE B: Payment requires new payment method (failed/cancelled)
                elif stripe_intent.status in ['requires_payment_method', 'canceled']:
                    logger.info(f"Previous payment failed/cancelled, creating new payment intent")
                    # Fall through to create new payment intent below
                    pass

                # CASE C: Payment is still processing
                elif stripe_intent.status in ['processing', 'requires_action', 'requires_confirmation']:
                    logger.info(f"Payment still processing, returning existing client secret")
                    payment_intent_client_secret = stripe_intent.client_secret

                    # Set status to PENDING_PAYMENT
                    update_data["status"] = SubmissionStatus.PENDING_PAYMENT
                    update_data["submitted_at"] = datetime.utcnow()

                    # Don't create new payment record, use existing
                    # Skip to applying updates

            except stripe.error.StripeError as e:
                logger.error(f"Error checking Stripe payment status: {str(e)}")
                # If Stripe query fails, allow creating new payment as fallback
                pass

        # STEP 3: Create new payment intent (only if no active payment exists)
        if payment_intent_client_secret is None:
            amount_cents = int(competition.entry_fee * 100)

            try:
                payment_intent = create_payment_intent(
                    amount=amount_cents,
                    currency="usd",
                    metadata={
                        "user_id": str(current_user.id),
                        "competition_id": str(competition.id),
                        "submission_id": str(submission.id),
                        "type": "entry_fee",
                    }
                )
                payment_intent_client_secret = payment_intent.client_secret

                # Set status to PENDING_PAYMENT (NOT SUBMITTED)
                update_data["status"] = SubmissionStatus.PENDING_PAYMENT
                update_data["submitted_at"] = datetime.utcnow()

                # Create Payment record
                db_payment = Payment(
                    user_id=current_user.id,
                    submission_id=submission.id,
                    competition_id=competition.id,
                    amount=competition.entry_fee,
                    stripe_payment_intent_id=payment_intent.id,
                    status=PaymentStatus.PENDING.value,  # Extract lowercase enum value
                    type=PaymentType.ENTRY_FEE.value  # Extract lowercase enum value
                )
                db.add(db_payment)

                # DO NOT update competition stats yet
                # (webhook will handle current_entries and prize_pool after payment confirms)

            except stripe.error.StripeError as e:
                logger.error(f"Stripe error creating payment intent: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Payment processing error: {str(e)}"
                )

    # Apply updates
    for field, value in update_data.items():
        setattr(submission, field, value)

    await db.commit()
    await db.refresh(submission)

    # Fetch with relationships
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission.id)
    )
    submission = result.scalar_one()

    # Convert to response model and add payment secret if present
    response_data = SubmissionResponse.model_validate(submission)
    if payment_intent_client_secret:
        response_data.payment_intent_client_secret = payment_intent_client_secret

    return response_data


@router.post("/{submission_id}/create-payment-intent")
async def create_submission_payment_intent(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Create payment intent for a DRAFT submission.
    Called when user clicks 'Pay Now' on payment page.

    This atomically:
    1. Creates Stripe payment intent
    2. Creates payment record in database
    3. Updates submission status to PENDING_PAYMENT
    """
    # Fetch submission
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    # Authorization check - user must own submission
    if submission.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this submission"
        )

    # Submission must be DRAFT status
    if submission.status != SubmissionStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Submission must be DRAFT status. Current status: {submission.status}"
        )

    # Get competition
    result = await db.execute(
        select(Competition).where(Competition.id == submission.competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found"
        )

    # Create Stripe payment intent
    amount_cents = int(competition.entry_fee * 100)

    try:
        payment_intent = create_payment_intent(
            amount=amount_cents,
            currency="usd",
            metadata={
                "user_id": str(current_user.id),
                "competition_id": str(competition.id),
                "submission_id": str(submission.id),
                "type": "entry_fee",
            }
        )
    except Exception as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment processing error: {str(e)}"
        )

    # Create payment record in database
    db_payment = Payment(
        user_id=current_user.id,
        competition_id=competition.id,
        submission_id=submission.id,
        amount=competition.entry_fee,
        type=PaymentType.ENTRY_FEE.value,  # Extract lowercase enum value
        status=PaymentStatus.PENDING.value,  # Extract lowercase enum value
        stripe_payment_intent_id=payment_intent.id,
    )
    db.add(db_payment)

    # Update submission status to PENDING_PAYMENT
    submission.status = SubmissionStatus.PENDING_PAYMENT
    submission.submitted_at = datetime.utcnow()

    # Commit all changes atomically
    await db.commit()

    logger.info(f"Created payment intent for submission {submission_id}")

    return {"client_secret": payment_intent.client_secret}


@router.post("/{submission_id}/check-payment-status")
async def check_submission_payment_status(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Check payment status with Stripe for a PENDING_PAYMENT submission.
    Called when user clicks 'Check Payment Status' button.

    This:
    1. Queries Stripe API for payment intent status
    2. If payment succeeded, updates submission to SUBMITTED and payment to COMPLETED
    3. Returns current status to frontend
    """
    # Fetch submission
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found"
        )

    # Authorization check - user must own submission
    if submission.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this submission"
        )

    # Submission must be PENDING_PAYMENT status
    if submission.status != SubmissionStatus.PENDING_PAYMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check payment status. Submission status is: {submission.status}"
        )

    # Get associated payment record
    result = await db.execute(
        select(Payment).where(
            Payment.submission_id == submission_id,
            Payment.type == PaymentType.ENTRY_FEE
        )
    )
    payment = result.scalar_one_or_none()

    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment record not found for this submission"
        )

    if not payment.stripe_payment_intent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe payment intent ID found"
        )

    # Query Stripe for payment intent status
    try:
        payment_intent = get_payment_intent(payment.stripe_payment_intent_id)
    except Exception as e:
        logger.error(f"Error retrieving payment intent from Stripe: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check payment status with Stripe"
        )

    # Check if payment succeeded in Stripe
    if payment_intent.status == "succeeded":
        # Update submission to SUBMITTED
        submission.status = SubmissionStatus.SUBMITTED
        if not submission.submitted_at:
            submission.submitted_at = datetime.utcnow()

        # Update payment to COMPLETED
        payment.status = PaymentStatus.COMPLETED

        # Update competition stats (since webhook didn't fire)
        result = await db.execute(
            select(Competition).where(Competition.id == submission.competition_id)
        )
        competition = result.scalar_one()

        # Calculate platform fee and prize pool contribution
        platform_fee = competition.entry_fee * (competition.platform_fee_percentage / 100)
        prize_contribution = competition.entry_fee - platform_fee

        # Update competition stats
        competition.current_entries += 1
        competition.prize_pool += prize_contribution

        # Commit all changes
        await db.commit()

        logger.info(f"Payment confirmed for submission {submission_id}. Updated to SUBMITTED.")

        return {
            "submission_status": "submitted",
            "payment_status": "completed",
            "message": "Payment confirmed! Your submission is complete."
        }

    elif payment_intent.status == "requires_payment_method":
        return {
            "submission_status": "pending_payment",
            "payment_status": "pending",
            "message": "Payment not yet completed. Please complete payment on the payment page."
        }

    elif payment_intent.status == "processing":
        return {
            "submission_status": "pending_payment",
            "payment_status": "pending",
            "message": "Payment is being processed. Please check again in a few moments."
        }

    elif payment_intent.status in ["requires_action", "requires_confirmation"]:
        return {
            "submission_status": "pending_payment",
            "payment_status": "pending",
            "message": "Payment requires additional action. Please complete payment on the payment page."
        }

    elif payment_intent.status == "canceled":
        # Update payment to FAILED
        payment.status = PaymentStatus.FAILED
        await db.commit()

        return {
            "submission_status": "pending_payment",
            "payment_status": "failed",
            "message": "Payment was canceled. Please create a new payment."
        }

    else:
        # Other statuses (failed, requires_capture, etc.)
        return {
            "submission_status": "pending_payment",
            "payment_status": "pending",
            "message": f"Payment status: {payment_intent.status}. Please contact support if this persists."
        }


@router.post("/{submission_id}/video", response_model=SubmissionResponse)
async def upload_submission_video(
    submission_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Upload a video file for a submission.

    Requirements:
    - User must own the submission or be an admin
    - Submission must be in draft or pending_payment status
    - File must be a valid video format under 100MB

    Uploads video to S3 and stores s3_key and video_url in submission.attachments.
    Returns the updated submission.
    """
    # Fetch submission
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Check authorization: user must own the submission or be admin
    if submission.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to upload video for this submission",
        )

    # Check submission status is draft or pending_payment
    if submission.status not in [SubmissionStatus.DRAFT, SubmissionStatus.PENDING_PAYMENT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot upload video to submission with status: {submission.status}",
        )

    # Delete old video from S3 if it exists
    if submission.attachments:
        for attachment in submission.attachments:
            if attachment.get("type") == "video":
                old_s3_key = attachment.get("s3_key")
                if old_s3_key:
                    try:
                        delete_file(old_s3_key)
                    except Exception as e:
                        # Log error but don't fail the upload if old file doesn't exist
                        if settings.debug:
                            print(f"Warning: Failed to delete old video {old_s3_key}: {str(e)}")
                break

    # Upload video to S3
    s3_key, s3_url = upload_video(
        file=file,
        user_id=current_user.id,
        submission_id=submission_id
    )

    # Update submission attachments with video information
    if submission.attachments is None:
        submission.attachments = []

    # Create video info object
    video_info = {
        "type": "video",
        "s3_key": s3_key,
        "url": s3_url,
        "uploaded_at": datetime.utcnow().isoformat(),
    }

    # Check if a video already exists in attachments and replace it
    video_exists = False
    for i, attachment in enumerate(submission.attachments):
        if attachment.get("type") == "video":
            submission.attachments[i] = video_info
            video_exists = True
            break

    # If no video exists, append the new one
    if not video_exists:
        submission.attachments.append(video_info)

    # Mark as modified for SQLAlchemy to detect change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(submission, "attachments")

    await db.commit()
    await db.refresh(submission)

    # Fetch with relationships
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission.id)
    )
    submission = result.scalar_one()

    return submission


@router.get("/{submission_id}/video-url")
async def get_submission_video_url(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get a presigned URL for accessing a submission's video.

    Authorization:
    - FOUNDER: Can only access their own submissions
    - JUDGE: Can access any submission (for review purposes)
    - ADMIN: Can access any submission

    Returns a temporary presigned URL valid for 1 hour.
    """
    # Fetch submission
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Role-based authorization
    is_owner = submission.user_id == current_user.id
    is_privileged = current_user.role in [UserRole.JUDGE, UserRole.ADMIN]

    if not (is_owner or is_privileged):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this submission's video. "
                   "Founders can only view their own submissions.",
        )

    # Find video attachment in attachments list
    video_attachment = None
    if submission.attachments:
        for attachment in submission.attachments:
            if attachment.get("type") == "video":
                video_attachment = attachment
                break

    if not video_attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No video attached to this submission",
        )

    # Get s3_key from video attachment
    s3_key = video_attachment.get("s3_key")
    if not s3_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Video attachment is missing s3_key",
        )

    # Generate presigned URL
    expiration = 3600  # 1 hour
    video_url = generate_presigned_url(s3_key=s3_key, expiration=expiration)

    return {
        "video_url": video_url,
        "expires_in": expiration,
    }


@router.delete("/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Delete a submission.

    Can only delete draft submissions.
    Users can only delete their own submissions (unless admin).
    Returns 204 on success.
    """
    # Fetch submission
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Check authorization: user must own the submission or be admin
    if submission.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this submission",
        )

    # Check status is draft
    if submission.status != SubmissionStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete draft submissions",
        )

    await db.delete(submission)
    await db.commit()

    return None


@router.get("/public/{submission_id}", response_model=SubmissionResponse)
async def get_public_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get a public submission's details.

    Any authenticated user can view public submissions.
    Returns submission with video, title, description.
    Scores and feedback are included in response but frontend should not display them.

    Returns:
    - 404 if submission not found
    - 403 if submission is not public
    """
    # Fetch submission with relationships
    result = await db.execute(
        select(Submission)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
        .where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Check if submission is public
    if not submission.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This submission is not available for public viewing",
        )

    # Return submission data
    return submission


@router.get("/public/{submission_id}/video-url")
async def get_public_submission_video(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get a presigned URL for accessing a public submission's video.

    Any authenticated user can view videos for public submissions.
    Returns a temporary presigned URL valid for 1 hour.

    Returns:
    - 404 if submission not found or no video attached
    - 403 if submission is not public
    """
    # Fetch submission
    result = await db.execute(
        select(Submission).where(Submission.id == submission_id)
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Check if submission is public
    if not submission.is_public:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This submission is not available for public viewing",
        )

    # Find video attachment in attachments list
    video_attachment = None
    if submission.attachments:
        for attachment in submission.attachments:
            if attachment.get("type") == "video":
                video_attachment = attachment
                break

    if not video_attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No video attached to this submission",
        )

    # Get s3_key from video attachment
    s3_key = video_attachment.get("s3_key")
    if not s3_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Video attachment is missing s3_key",
        )

    # Generate presigned URL
    expiration = 3600  # 1 hour
    video_url = generate_presigned_url(s3_key=s3_key, expiration=expiration)

    return {
        "video_url": video_url,
        "expires_in": expiration,
    }
