from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.submission import Submission, SubmissionStatus
from app.models.payment import Payment, PaymentType
from app.schemas.connect_account import (
    ConnectAccountResponse,
    ConnectAccountStatusResponse,
    RefreshLinkResponse,
)
from app.schemas.bank_account import (
    PayoutStatusResponse,
    ConnectAccountStatus,
    WinningSubmissionPayout,
)
from app.core.security import get_current_user_obj
import stripe
from app.config import get_settings

router = APIRouter()
settings = get_settings()

# Configure Stripe
stripe.api_key = settings.stripe_secret_key


@router.post("/", response_model=ConnectAccountResponse)
async def create_connect_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Create or retrieve Stripe Express Connected Account for receiving payouts.

    If user already has a complete account, returns error.
    If user has incomplete onboarding, creates new onboarding link.
    Otherwise, creates new Express account and onboarding link.

    Returns onboarding URL for user to complete Stripe's verification process.
    """
    try:
        # a. Check if user already has stripe_connect_account_id
        if current_user.stripe_connect_account_id:
            if current_user.connect_onboarding_complete:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Account already set up",
                )
            # User has account but onboarding incomplete - skip to step c
        else:
            # b. Create Stripe Express Connected Account
            account = stripe.Account.create(
                type='express',
                country='US',
                email=current_user.email,
                capabilities={
                    'transfers': {'requested': True},
                },
                business_type='individual',
                metadata={
                    'user_id': str(current_user.id),
                    'username': current_user.username,
                }
            )
            # Save account ID
            current_user.stripe_connect_account_id = account.id

        # c. Create account onboarding link
        account_link = stripe.AccountLink.create(
            account=current_user.stripe_connect_account_id,
            refresh_url=f"{settings.frontend_url}/payouts",
            return_url=f"{settings.frontend_url}/connect/complete",
            type='account_onboarding',
        )

        # d. Commit to database
        await db.commit()

        # e. Return response
        return ConnectAccountResponse(
            connect_account_id=current_user.stripe_connect_account_id,
            onboarding_url=account_link.url,
            message="Complete onboarding at the provided URL",
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating connect account: {str(e)}",
        )


@router.get("/status", response_model=ConnectAccountStatusResponse)
async def get_connect_account_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get current status of user's Stripe Connect account.

    Retrieves account details from Stripe and updates local database.
    Returns onboarding status and capability flags.
    """
    try:
        # a. If no stripe_connect_account_id
        if not current_user.stripe_connect_account_id:
            return ConnectAccountStatusResponse(
                status="not_started",
                onboarding_complete=False,
                charges_enabled=False,
                payouts_enabled=False,
                connect_account_id=None,
            )

        # b. Retrieve account from Stripe
        account = stripe.Account.retrieve(current_user.stripe_connect_account_id)

        # c. Check account capabilities
        charges_enabled = account.charges_enabled
        payouts_enabled = account.payouts_enabled
        details_submitted = account.details_submitted

        # d. Update user record if changed
        current_user.connect_charges_enabled = charges_enabled
        current_user.connect_payouts_enabled = payouts_enabled

        if details_submitted and not current_user.connect_onboarding_complete:
            current_user.connect_onboarding_complete = True
            current_user.connect_onboarded_at = datetime.utcnow()

        await db.commit()

        # e. Return status
        account_status = "active" if (charges_enabled and payouts_enabled) else "pending"

        return ConnectAccountStatusResponse(
            status=account_status,
            onboarding_complete=details_submitted,
            charges_enabled=charges_enabled,
            payouts_enabled=payouts_enabled,
            connect_account_id=current_user.stripe_connect_account_id,
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving account status: {str(e)}",
        )


@router.post("/refresh-link", response_model=RefreshLinkResponse)
async def refresh_onboarding_link(
    current_user: User = Depends(get_current_user_obj),
):
    """
    Generate a new onboarding link for incomplete Stripe Connect account.

    Useful for re-authentication or completing missing information.
    """
    try:
        # a. If no stripe_connect_account_id
        if not current_user.stripe_connect_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No connect account found",
            )

        # b. Create new account link
        account_link = stripe.AccountLink.create(
            account=current_user.stripe_connect_account_id,
            refresh_url=f"{settings.frontend_url}/payouts",
            return_url=f"{settings.frontend_url}/connect/complete",
            type='account_onboarding',
        )

        # c. Return response
        return RefreshLinkResponse(
            onboarding_url=account_link.url,
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating refresh link: {str(e)}",
        )


@router.get("/payout-status", response_model=PayoutStatusResponse)
async def get_payout_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get payout status including Stripe Connect account and winning submissions.

    Shows:
    - Connect account onboarding and payout status
    - All winning submissions with payout information
    - Payout status for each prize

    Returns comprehensive payout information.
    """
    # Build Connect account status
    connect_account_status = ConnectAccountStatus(
        has_connect_account=current_user.stripe_connect_account_id is not None,
        onboarding_complete=current_user.connect_onboarding_complete or False,
        payouts_enabled=current_user.connect_payouts_enabled or False,
        connect_account_id=current_user.stripe_connect_account_id,
    )

    # Get all winning submissions for this user
    result = await db.execute(
        select(Submission)
        .where(
            Submission.user_id == current_user.id,
            Submission.status == SubmissionStatus.WINNER,
        )
        .options(
            selectinload(Submission.competition),
            selectinload(Submission.payments),
        )
    )
    winning_submissions = result.scalars().all()

    # Build winning submissions list with payout info
    winning_submissions_list = []
    for submission in winning_submissions:
        # Find prize payout payment for this submission
        prize_payment = None
        for payment in submission.payments:
            if payment.type == PaymentType.PRIZE_PAYOUT:
                prize_payment = payment
                break

        # Calculate prize amount from competition
        prize_amount = 0
        if submission.placement and submission.competition:
            prize_structure = submission.competition.prize_structure
            if submission.placement in prize_structure:
                prize_percentage = prize_structure[submission.placement]
                prize_amount = float(submission.competition.prize_pool) * prize_percentage

        winning_submissions_list.append(
            WinningSubmissionPayout(
                submission_id=submission.id,
                competition_title=submission.competition.title,
                placement=submission.placement,
                prize_amount=prize_amount,
                payout_status=prize_payment.status.value if prize_payment else None,
                payout_initiated_at=prize_payment.created_at if prize_payment else None,
                payout_completed_at=prize_payment.processed_at if prize_payment else None,
            )
        )

    return PayoutStatusResponse(
        connect_account=connect_account_status,
        winning_submissions=winning_submissions_list,
    )
