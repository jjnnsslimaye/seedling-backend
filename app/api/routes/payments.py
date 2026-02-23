import logging
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import stripe
from app.database import get_db
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.submission import Submission, SubmissionStatus
from app.models.competition import Competition
from app.models.user import User
from app.config import get_settings
from app.core.security import get_current_user_obj

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)


@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Stripe webhook endpoint for handling payment events.

    Handles:
    - payment_intent.succeeded: Updates Payment, Submission, and Competition records (entry fees)
    - payment_intent.payment_failed: Marks Payment as failed (entry fees)
    - transfer.paid: Marks Payment as completed (prize payouts)
    - transfer.failed: Marks Payment as failed (prize payouts)
    - transfer.created: Logs transfer creation for audit trail (prize payouts)

    Returns 200 for all events to prevent Stripe from retrying.
    """
    # Get the raw body for signature verification
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        logger.error("Missing Stripe signature header")
        # Return 400 for missing signature
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing stripe-signature header",
        )

    # Verify webhook signature
    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            settings.stripe_webhook_secret,
        )
    except ValueError as e:
        # Invalid payload
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature",
        )

    # Get event data
    event_type = event["type"]
    event_data = event["data"]["object"]

    logger.info(f"Received Stripe webhook event: {event_type}")

    try:
        # Handle payment_intent.succeeded event
        if event_type == "payment_intent.succeeded":
            await handle_payment_intent_succeeded(db, event_data)

        # Handle payment_intent.payment_failed event
        elif event_type == "payment_intent.payment_failed":
            await handle_payment_intent_failed(db, event_data)

        # Handle transfer events (prize payouts)
        elif event_type == "transfer.paid":
            await handle_transfer_paid(db, event_data)

        elif event_type == "transfer.failed":
            await handle_transfer_failed(db, event_data)

        elif event_type == "transfer.created":
            await handle_transfer_created(db, event_data)

        else:
            # Log unhandled event types
            logger.info(f"Unhandled event type: {event_type}")

    except Exception as e:
        # Log the error but return 200 so Stripe doesn't retry
        logger.error(f"Error processing webhook event {event_type}: {str(e)}", exc_info=True)
        # Still return 200 to acknowledge receipt
        return {"status": "error", "message": str(e)}

    # Return 200 to acknowledge receipt
    return {"status": "success"}


async def handle_payment_intent_succeeded(
    db: AsyncSession,
    payment_intent: dict,
):
    """
    Handle successful payment intent.

    Updates:
    - Payment record: status to "completed", set processed_at
    - Submission record: status to "submitted", set submitted_at
    - Competition record: increment current_entries, update prize_pool
    """
    payment_intent_id = payment_intent["id"]
    logger.info(f"Processing payment_intent.succeeded for {payment_intent_id}")

    # Find Payment record
    result = await db.execute(
        select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error(f"Payment not found for PaymentIntent {payment_intent_id}")
        return

    # Check if already processed
    if payment.status == PaymentStatus.COMPLETED:
        logger.info(f"Payment {payment.id} already processed, skipping")
        return

    # Update Payment record
    payment.status = PaymentStatus.COMPLETED.value
    payment.processed_at = datetime.utcnow()

    # Find related Submission
    if payment.submission_id:
        result = await db.execute(
            select(Submission).where(Submission.id == payment.submission_id)
        )
        submission = result.scalar_one_or_none()

        if submission:
            # Update Submission status to submitted
            submission.status = SubmissionStatus.SUBMITTED.value
            submission.submitted_at = datetime.utcnow()

            # Find related Competition
            result = await db.execute(
                select(Competition).where(Competition.id == payment.competition_id)
            )
            competition = result.scalar_one_or_none()

            if competition:
                # Increment current entries
                competition.current_entries += 1

                # Update prize pool (add entry fee minus platform fee)
                platform_fee = competition.entry_fee * (competition.platform_fee_percentage / 100)
                competition.prize_pool += (competition.entry_fee - platform_fee)

                logger.info(
                    f"Updated competition {competition.id}: "
                    f"current_entries={competition.current_entries}, "
                    f"prize_pool={competition.prize_pool}"
                )
            else:
                logger.error(f"Competition not found for Payment {payment.id}")

            logger.info(f"Updated submission {submission.id} to submitted")
        else:
            logger.error(f"Submission not found for Payment {payment.id}")
    else:
        logger.warning(f"Payment {payment.id} has no associated submission")

    # Commit all changes
    await db.commit()

    logger.info(f"Successfully processed payment_intent.succeeded for {payment_intent_id}")


async def handle_payment_intent_failed(
    db: AsyncSession,
    payment_intent: dict,
):
    """
    Handle failed payment intent.

    Updates:
    - Payment record: status to "failed"
    """
    payment_intent_id = payment_intent["id"]
    logger.info(f"Processing payment_intent.payment_failed for {payment_intent_id}")

    # Find Payment record
    result = await db.execute(
        select(Payment).where(Payment.stripe_payment_intent_id == payment_intent_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.error(f"Payment not found for PaymentIntent {payment_intent_id}")
        return

    # Update Payment record
    payment.status = PaymentStatus.FAILED.value
    payment.processed_at = datetime.utcnow()

    await db.commit()

    logger.info(f"Successfully processed payment_intent.payment_failed for {payment_intent_id}")


async def handle_transfer_paid(db: AsyncSession, transfer: dict):
    """Handle transfer.paid event - prize payout completed."""
    transfer_id = transfer['id']
    logger.info(f"Processing transfer.paid: {transfer_id}")

    result = await db.execute(
        select(Payment).where(Payment.stripe_transfer_id == transfer_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"No payment found for transfer {transfer_id}")
        return

    payment.status = PaymentStatus.COMPLETED.value
    payment.processed_at = datetime.utcnow()
    await db.commit()

    logger.info(f"Payment {payment.id} marked as COMPLETED for transfer {transfer_id}")


async def handle_transfer_failed(db: AsyncSession, transfer: dict):
    """Handle transfer.failed event - prize payout failed."""
    transfer_id = transfer['id']
    failure_message = transfer.get('failure_message', 'Unknown error')
    failure_code = transfer.get('failure_code', 'unknown')

    logger.error(f"Processing transfer.failed: {transfer_id} - {failure_code}: {failure_message}")

    result = await db.execute(
        select(Payment).where(Payment.stripe_transfer_id == transfer_id)
    )
    payment = result.scalar_one_or_none()

    if not payment:
        logger.warning(f"No payment found for transfer {transfer_id}")
        return

    payment.status = PaymentStatus.FAILED.value
    await db.commit()

    logger.error(f"Payment {payment.id} marked as FAILED for transfer {transfer_id}")


async def handle_transfer_created(db: AsyncSession, transfer: dict):
    """Handle transfer.created event - log for audit trail."""
    transfer_id = transfer['id']
    amount = transfer['amount']
    destination = transfer['destination']

    logger.info(f"Transfer created: {transfer_id} - ${amount/100:.2f} to {destination}")


@router.get("/my-winnings")
async def get_my_winnings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get current user's prize winnings.

    Returns list of prize payout payments with competition and submission info.
    """
    # Fetch all prize payout payments for current user
    result = await db.execute(
        select(Payment)
        .where(
            Payment.user_id == current_user.id,
            Payment.type == PaymentType.PRIZE_PAYOUT
        )
        .options(
            selectinload(Payment.competition),
            selectinload(Payment.submission),
        )
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    # Format response
    return [
        {
            "id": payment.id,
            "amount": float(payment.amount),
            "status": payment.status.value,
            "stripe_transfer_id": payment.stripe_transfer_id,
            "created_at": payment.created_at.isoformat() if payment.created_at else None,
            "processed_at": payment.processed_at.isoformat() if payment.processed_at else None,
            "competition": {
                "id": payment.competition.id,
                "title": payment.competition.title,
                "domain": payment.competition.domain,
            } if payment.competition else None,
            "submission": {
                "id": payment.submission.id,
                "title": payment.submission.title,
                "placement": payment.submission.placement,
            } if payment.submission else None,
        }
        for payment in payments
    ]

