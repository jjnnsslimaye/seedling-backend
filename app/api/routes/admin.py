from typing import List
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from app.database import get_db
from app.models.judge_assignment import JudgeAssignment
from app.models.competition import Competition, CompetitionStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.schemas.admin import (
    BulkJudgeAssignmentRequest,
    JudgeAssignmentResponse,
    CompetitionLeaderboard,
    LeaderboardEntry,
    SelectWinnersRequest,
    WinnerSelectionResponse,
    WinnerInfo,
    PayoutResult,
    DistributePrizesResponse,
)
from app.core.security import require_role, get_current_user_obj
from app.services.email_service import send_winner_notification, send_participant_notification
import stripe
from app.config import get_settings
import logging

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.stripe_secret_key

# Enable Stripe debug logging (debug mode only)
if settings.debug:
    stripe.log = 'debug'
stripe.enable_telemetry = False

# Also set up basic logging to see Stripe's actual requests
logging.basicConfig()
logging.getLogger('stripe').setLevel(logging.DEBUG)


@router.post("/competitions/{competition_id}/assign-judges", response_model=List[JudgeAssignmentResponse])
async def assign_judges_to_competition(
    competition_id: int,
    assignment_request: BulkJudgeAssignmentRequest,
    replace: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Assign judges to submissions in a competition.

    Accessible by: ADMIN only

    Query Parameters:
    - replace: If True, deletes all existing judge assignments for the competition before creating new ones

    Validates:
    - Competition exists and is in CLOSED or JUDGING status
    - All judges are valid users with JUDGE or ADMIN role
    - All submissions belong to the competition and are available for judging
    - No duplicate assignments (idempotent, unless replace=True)

    Returns all judge assignments for the competition (new + existing, or only new if replace=True).
    """
    # 1. Validate competition exists
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition {competition_id} not found",
        )

    # 2. Validate competition status
    if competition.status not in [CompetitionStatus.CLOSED, CompetitionStatus.JUDGING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot assign judges. Competition must be in CLOSED or JUDGING status. Current status: {competition.status.value}",
        )

    # Collect all unique judge_ids and submission_ids from request
    all_judge_ids = set()
    all_submission_ids = set()

    for assignment in assignment_request.assignments:
        all_judge_ids.add(assignment.judge_id)
        all_submission_ids.update(assignment.submission_ids)

    # 3. Validate all judges exist and have correct roles
    result = await db.execute(
        select(User).where(User.id.in_(all_judge_ids))
    )
    judges = result.scalars().all()
    judges_dict = {judge.id: judge for judge in judges}

    for judge_id in all_judge_ids:
        if judge_id not in judges_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {judge_id} is not a judge or does not exist.",
            )
        judge = judges_dict[judge_id]
        if judge.role not in [UserRole.JUDGE, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {judge_id} is not a judge or does not exist.",
            )

    # 4. Validate all submissions belong to this competition and are available for judging
    result = await db.execute(
        select(Submission).where(Submission.id.in_(all_submission_ids))
    )
    submissions = result.scalars().all()
    submissions_dict = {sub.id: sub for sub in submissions}

    for sub_id in all_submission_ids:
        if sub_id not in submissions_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Submission {sub_id} does not belong to this competition.",
            )

        submission = submissions_dict[sub_id]

        # Check if submission belongs to competition
        if submission.competition_id != competition_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Submission {sub_id} does not belong to this competition.",
            )

        # Check if submission status is valid for judging
        if submission.status not in [SubmissionStatus.SUBMITTED, SubmissionStatus.UNDER_REVIEW]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Submission {sub_id} is not available for judging (status: {submission.status.value}).",
            )

    # 5. If replace=True, delete all existing judge assignments for this competition
    if replace:
        # Get all submission IDs for this competition
        result = await db.execute(
            select(Submission.id).where(Submission.competition_id == competition_id)
        )
        competition_submission_ids = result.scalars().all()

        # Delete all judge assignments for these submissions
        await db.execute(
            delete(JudgeAssignment).where(
                JudgeAssignment.submission_id.in_(competition_submission_ids)
            )
        )
        # Note: Changes will be committed at the end with new assignments

    # 6. Get existing assignments for this competition to avoid duplicates (unless replace=True)
    existing_pairs = set()
    if not replace:
        result = await db.execute(
            select(JudgeAssignment)
            .join(Submission)
            .where(Submission.competition_id == competition_id)
        )
        existing_assignments = result.scalars().all()
        existing_pairs = {(assignment.judge_id, assignment.submission_id) for assignment in existing_assignments}

    # 7. Create new assignments (skip duplicates if not replacing)
    new_assignments = []
    for assignment in assignment_request.assignments:
        for submission_id in assignment.submission_ids:
            pair = (assignment.judge_id, submission_id)
            if pair not in existing_pairs:
                new_assignment = JudgeAssignment(
                    judge_id=assignment.judge_id,
                    submission_id=submission_id,
                    assigned_by=current_user.id,
                )
                new_assignments.append(new_assignment)
                db.add(new_assignment)

    # 8. Commit all changes (deletions + new assignments) atomically
    await db.commit()

    # 9. Fetch all assignments for this competition with relationships loaded
    result = await db.execute(
        select(JudgeAssignment)
        .join(Submission)
        .where(Submission.competition_id == competition_id)
        .options(
            selectinload(JudgeAssignment.judge),
            selectinload(JudgeAssignment.submission),
        )
    )
    all_assignments = result.scalars().all()

    # 10. Build response
    response = []
    for assignment in all_assignments:
        response.append(
            JudgeAssignmentResponse(
                id=assignment.id,
                judge_id=assignment.judge_id,
                judge_name=assignment.judge.username,
                submission_id=assignment.submission_id,
                submission_title=assignment.submission.title,
                assigned_by=assignment.assigned_by,
                assigned_at=assignment.assigned_at,
                completed_at=assignment.completed_at,
            )
        )

    return response


@router.get("/competitions/{competition_id}/judge-assignments", response_model=List[JudgeAssignmentResponse])
async def get_judge_assignments_for_competition(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Get all judge assignments for a competition.

    Accessible by: ADMIN only

    Returns list of all judge assignments with submission and judge details.
    """
    # Validate competition exists
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition {competition_id} not found",
        )

    # Fetch all assignments for this competition
    result = await db.execute(
        select(JudgeAssignment)
        .join(Submission)
        .where(Submission.competition_id == competition_id)
        .options(
            selectinload(JudgeAssignment.judge),
            selectinload(JudgeAssignment.submission),
        )
        .order_by(Submission.title)
    )
    assignments = result.scalars().all()

    # Build response
    response = []
    for assignment in assignments:
        response.append(
            JudgeAssignmentResponse(
                id=assignment.id,
                judge_id=assignment.judge_id,
                judge_name=assignment.judge.username,
                submission_id=assignment.submission_id,
                submission_title=assignment.submission.title,
                assigned_by=assignment.assigned_by,
                assigned_at=assignment.assigned_at,
                completed_at=assignment.completed_at,
            )
        )

    return response


class ReassignJudgeRequest(BaseModel):
    new_judge_id: int


@router.patch("/judge-assignments/{assignment_id}", response_model=JudgeAssignmentResponse)
async def reassign_judge(
    assignment_id: int,
    request: ReassignJudgeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Reassign a judge assignment to a different judge.

    Accessible by: ADMIN only

    Validates:
    - Assignment exists
    - New judge exists and has JUDGE or ADMIN role
    - New judge is different from current judge

    Deletes the old assignment and creates a new one with the new judge.
    Returns the new assignment details.
    """
    # 1. Fetch the existing assignment
    result = await db.execute(
        select(JudgeAssignment)
        .where(JudgeAssignment.id == assignment_id)
        .options(
            selectinload(JudgeAssignment.judge),
            selectinload(JudgeAssignment.submission),
        )
    )
    old_assignment = result.scalar_one_or_none()

    if not old_assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assignment {assignment_id} not found",
        )

    # 2. Validate new judge exists and has correct role
    result = await db.execute(
        select(User).where(User.id == request.new_judge_id)
    )
    new_judge = result.scalar_one_or_none()

    if not new_judge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {request.new_judge_id} not found",
        )

    if new_judge.role not in [UserRole.JUDGE, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {request.new_judge_id} is not a judge or admin",
        )

    # 3. Check if the new judge is different from the current judge
    if request.new_judge_id == old_assignment.judge_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New judge is the same as the current judge",
        )

    # 4. Create new assignment
    new_assignment = JudgeAssignment(
        judge_id=request.new_judge_id,
        submission_id=old_assignment.submission_id,
        assigned_by=current_user.id,
    )
    db.add(new_assignment)

    # 5. Delete old assignment
    await db.delete(old_assignment)

    # 6. Commit changes
    await db.commit()
    await db.refresh(new_assignment)

    # 7. Fetch new assignment with relationships
    result = await db.execute(
        select(JudgeAssignment)
        .where(JudgeAssignment.id == new_assignment.id)
        .options(
            selectinload(JudgeAssignment.judge),
            selectinload(JudgeAssignment.submission),
        )
    )
    assignment = result.scalar_one()

    # 8. Build response
    return JudgeAssignmentResponse(
        id=assignment.id,
        judge_id=assignment.judge_id,
        judge_name=assignment.judge.username,
        submission_id=assignment.submission_id,
        submission_title=assignment.submission.title,
        assigned_by=assignment.assigned_by,
        assigned_at=assignment.assigned_at,
        completed_at=assignment.completed_at,
    )


@router.get("/competitions/{competition_id}/leaderboard", response_model=CompetitionLeaderboard)
async def get_competition_leaderboard(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Get competition leaderboard with judging progress.

    Accessible by: ADMIN only

    Returns:
    - Ranked submissions by final_score (highest first)
    - Judging completion status for each submission
    - Competition details and statistics
    - Handles ties with same rank
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

    # 2. Query eligible submissions with relationships
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

    # Count total submissions (including drafts)
    total_result = await db.execute(
        select(func.count(Submission.id)).where(
            Submission.competition_id == competition_id
        )
    )
    total_submissions = total_result.scalar()

    # 3. Build submission data with judging stats
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

    # 4. Sort: fully judged first (by score DESC), then incomplete (by submission ID)
    submission_data.sort(
        key=lambda x: (
            not x["judging_complete"],  # False (complete) sorts before True (incomplete)
            -x["submission"].final_score if x["submission"].final_score is not None else 0,
            x["submission"].id  # Tie-breaker for incomplete submissions
        )
    )

    # 5. Assign ranks and detect ties
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
                # Don't increment rank for tied scores
            else:
                # New score, update rank
                if idx > 0 and previous_score is not None:
                    current_rank = idx + 1

            # Mark previous entry as tied too if scores match
            if has_tie and entries:
                entries[-1].has_tie = True

            entry = LeaderboardEntry(
                rank=current_rank,
                submission_id=submission.id,
                title=submission.title,
                user_id=submission.user_id,
                username=submission.user.username,
                final_score=submission.final_score,
                human_scores_average=data["human_scores_average"],
                num_judges_assigned=data["num_judges_assigned"],
                num_judges_completed=data["num_judges_completed"],
                judging_complete=data["judging_complete"],
                has_tie=has_tie,
            )
            entries.append(entry)
            previous_score = score
        else:
            # Unscored submission - no rank
            entry = LeaderboardEntry(
                rank=999,  # High number to indicate unranked
                submission_id=submission.id,
                title=submission.title,
                user_id=submission.user_id,
                username=submission.user.username,
                final_score=None,
                human_scores_average=data["human_scores_average"],
                num_judges_assigned=data["num_judges_assigned"],
                num_judges_completed=data["num_judges_completed"],
                judging_complete=data["judging_complete"],
                has_tie=False,
            )
            entries.append(entry)

    # 7. Build response
    return CompetitionLeaderboard(
        competition_id=competition.id,
        competition_title=competition.title,
        domain=competition.domain,
        status=competition.status.value,
        prize_pool=competition.prize_pool,
        prize_structure=competition.prize_structure,
        entries=entries,
        total_submissions=total_submissions,
        eligible_submissions=len(eligible_submissions),
        fully_judged_count=fully_judged_count,
    )


@router.post("/competitions/{competition_id}/select-winners", response_model=WinnerSelectionResponse)
async def select_competition_winners(
    competition_id: int,
    winners_request: SelectWinnersRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Select winners for a competition.

    Accessible by: ADMIN only

    Validates:
    - Competition exists and is in JUDGING status
    - All eligible submissions are fully judged
    - Number of winners matches prize structure
    - All submissions exist and are eligible
    - No duplicates in submission IDs or places
    - Places match prize structure keys

    Updates:
    - Sets submission.status = WINNER
    - Sets submission.placement = place
    - Keeps competition.status = JUDGING

    Returns winner information with calculated prize amounts.
    """
    # 1. Validate competition exists
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition {competition_id} not found",
        )

    # 2. Validate competition status is JUDGING
    if competition.status != CompetitionStatus.JUDGING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition must be in JUDGING status to select winners",
        )

    # Get prize structure keys
    prize_structure_keys = set(competition.prize_structure.keys())

    # 4. Validate number of winners matches prize structure
    if len(winners_request.winners) != len(prize_structure_keys):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Must select {len(prize_structure_keys)} winners to match prize structure",
        )

    # Validate no duplicate submission_ids
    submission_ids = [w.submission_id for w in winners_request.winners]
    if len(submission_ids) != len(set(submission_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate submission in winners list",
        )

    # Validate no duplicate places
    places = [w.place for w in winners_request.winners]
    if len(places) != len(set(places)):
        duplicates = [p for p in places if places.count(p) > 1]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate place '{duplicates[0]}' in winners list",
        )

    # 7. Validate all places match prize structure keys
    places_set = set(places)
    if places_set != prize_structure_keys:
        invalid = places_set - prize_structure_keys
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid place '{list(invalid)[0]}'. Must be one of: {', '.join(sorted(prize_structure_keys))}",
            )

    # 5. Query all eligible submissions for this competition with judge assignments
    result = await db.execute(
        select(Submission)
        .where(
            Submission.competition_id == competition_id,
            Submission.status.in_([
                SubmissionStatus.SUBMITTED,
                SubmissionStatus.UNDER_REVIEW,
            ])
        )
        .options(
            selectinload(Submission.user),
            selectinload(Submission.judge_assignments),
        )
    )
    eligible_submissions = result.scalars().all()

    # 3. Check if all eligible submissions are fully judged
    unjudged_count = 0
    for submission in eligible_submissions:
        num_judges_assigned = len(submission.judge_assignments)
        num_judges_completed = sum(
            1 for assignment in submission.judge_assignments
            if assignment.completed_at is not None
        )
        judging_complete = (
            num_judges_assigned > 0 and
            num_judges_completed == num_judges_assigned
        )
        if not judging_complete:
            unjudged_count += 1

    if unjudged_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot select winners. {unjudged_count} submissions still need judging.",
        )

    # Build dict of eligible submissions
    submissions_dict = {sub.id: sub for sub in eligible_submissions}

    # Validate all winner submissions exist and are eligible
    for winner in winners_request.winners:
        if winner.submission_id not in submissions_dict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Submission {winner.submission_id} not found or doesn't belong to this competition",
            )

    # Update winners
    winner_info_list = []
    winner_submission_ids = []
    for winner in winners_request.winners:
        submission = submissions_dict[winner.submission_id]

        # Update submission
        submission.status = SubmissionStatus.WINNER
        submission.placement = winner.place
        winner_submission_ids.append(submission.id)

        # Calculate prize amount
        prize_percentage = competition.prize_structure[winner.place]
        prize_amount = float(competition.prize_pool) * prize_percentage

        winner_info_list.append(
            WinnerInfo(
                place=winner.place,
                submission_id=submission.id,
                title=submission.title,
                username=submission.user.username,
                prize_amount=prize_amount,
            )
        )

    # Mark non-winners as NOT_SELECTED
    # Query all other eligible submissions that were not selected as winners
    result = await db.execute(
        select(Submission)
        .where(
            Submission.competition_id == competition_id,
            Submission.status.in_([
                SubmissionStatus.SUBMITTED,
                SubmissionStatus.UNDER_REVIEW,
            ]),
            Submission.id.notin_(winner_submission_ids)
        )
    )
    non_winners = result.scalars().all()

    # Update all non-winners to NOT_SELECTED status
    for submission in non_winners:
        submission.status = SubmissionStatus.NOT_SELECTED

    # Commit all changes (winners and non-winners)
    await db.commit()

    # Send email notifications to all participants
    try:
        # Get all submissions for this competition with user data
        result = await db.execute(
            select(Submission, User)
            .join(User, Submission.user_id == User.id)
            .where(Submission.competition_id == competition_id)
        )
        all_submissions = result.all()

        # Sort by final_score to get rankings
        ranked_submissions = sorted(
            all_submissions,
            key=lambda x: x[0].final_score or 0,
            reverse=True
        )

        for rank, (submission, user) in enumerate(ranked_submissions, start=1):
            try:
                if submission.placement:  # Is a winner
                    # Get prize amount from competition prize structure
                    prize_percentage = competition.prize_structure.get(submission.placement, 0)
                    prize_amount = Decimal(str(float(competition.prize_pool) * prize_percentage))

                    # Check if user has payment setup
                    has_payment_setup = bool(
                        user.connect_payouts_enabled and
                        user.stripe_connect_account_id
                    )

                    # Send winner email
                    await send_winner_notification(
                        to_email=user.email,
                        username=user.username,
                        competition_title=competition.title,
                        placement=submission.placement,
                        prize_amount=prize_amount,
                        has_payment_setup=has_payment_setup,
                        submission_id=submission.id,
                        frontend_url=settings.frontend_url
                    )
                else:  # Not a winner
                    # Send participant email
                    await send_participant_notification(
                        to_email=user.email,
                        username=user.username,
                        competition_title=competition.title,
                        placement_rank=rank,
                        total_submissions=len(ranked_submissions),
                        submission_id=submission.id,
                        frontend_url=settings.frontend_url
                    )
            except Exception as email_error:
                # Log error but don't fail the entire operation
                logger.error(f"Failed to send notification to user {user.id}: {str(email_error)}")
                continue

    except Exception as e:
        logger.error(f"Failed to send notifications for competition {competition_id}: {str(e)}")
        # Don't fail the API call if emails fail

    # Build response
    return WinnerSelectionResponse(
        competition_id=competition.id,
        status=competition.status.value,
        winners=winner_info_list,
    )


@router.post("/competitions/{competition_id}/distribute-prizes", response_model=DistributePrizesResponse)
async def distribute_prizes(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Distribute prizes to competition winners via Stripe Connect transfers.

    Accessible by: ADMIN only

    Validations:
    - Competition exists and is COMPLETED
    - Winners have been selected

    Process:
    - Creates Stripe Transfers to winners' Connected Accounts
    - Creates Payment records for tracking
    - Skips winners without completed Stripe Connect onboarding
    - Skips winners already paid

    Returns summary of successful transfers, pending onboarding, and errors.
    """
    # 1. Validate competition exists
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition {competition_id} not found",
        )

    # 2. Validate competition status is COMPLETE
    if competition.status != CompetitionStatus.COMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition must be COMPLETED to distribute prizes",
        )

    # 3. Get all winning submissions with user and payment relationships
    result = await db.execute(
        select(Submission)
        .where(
            Submission.competition_id == competition_id,
            Submission.status == SubmissionStatus.WINNER,
        )
        .options(
            selectinload(Submission.user),
            selectinload(Submission.payments),
        )
    )
    winning_submissions = result.scalars().all()

    # 4. Validate winners exist
    if not winning_submissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No winners selected for this competition",
        )

    # Pre-flight check: Calculate total payout needed and verify sufficient balance
    total_payout_cents = 0

    for submission in winning_submissions:
        placement = submission.placement
        prize_percentage = competition.prize_structure.get(placement)
        if not prize_percentage:
            continue

        prize_amount = Decimal(str(float(competition.prize_pool) * prize_percentage))
        user = submission.user

        # Only count if user has verified Connect account
        if not (user.stripe_connect_account_id and
                user.connect_onboarding_complete and
                user.connect_payouts_enabled):
            continue

        # Check if already paid
        existing_payout = None
        for payment in submission.payments:
            if payment.type == PaymentType.PRIZE_PAYOUT:
                existing_payout = payment
                break

        # Only count if not already paid or processing
        if not existing_payout or existing_payout.status not in [PaymentStatus.COMPLETED, PaymentStatus.PENDING]:
            total_payout_cents += int(prize_amount * 100)

    # Check platform balance if we have payouts to make
    if total_payout_cents > 0:
        try:
            balance = stripe.Balance.retrieve()
            available_cents = balance.available[0]['amount']

            if available_cents < total_payout_cents:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient platform balance. Need ${total_payout_cents/100:.2f}, have ${available_cents/100:.2f}. Please add ${(total_payout_cents - available_cents)/100:.2f} to your Stripe account."
                )
        except stripe.error.StripeError as e:
            # Log warning but don't block if balance check fails
            if settings.debug:
                print(f"Warning: Could not verify platform balance: {e}")

    # Initialize result lists
    successful_payouts = []
    pending_bank_info = []
    failed_payouts = []
    already_paid = []
    total_distributed = Decimal("0.00")
    total_expected = Decimal("0.00")

    # 5. Process each winner
    for submission in winning_submissions:
        user = submission.user
        placement = submission.placement

        # Calculate prize amount
        prize_percentage = competition.prize_structure.get(placement)
        if not prize_percentage:
            # Skip if placement not in prize structure
            continue

        prize_amount = Decimal(str(float(competition.prize_pool) * prize_percentage))

        # Track total expected payouts
        total_expected += prize_amount

        # a. Check if user has verified Connect account
        if not user.stripe_connect_account_id:
            # User needs to create Connect account
            pending_bank_info.append(
                PayoutResult(
                    submission_id=submission.id,
                    user_id=user.id,
                    username=user.username,
                    placement=placement,
                    prize_amount=prize_amount,
                    status="pending_connect_account",
                    message="Winner needs to complete Stripe Connect onboarding",
                )
            )
            continue

        if not user.connect_onboarding_complete or not user.connect_payouts_enabled:
            # User started but didn't complete Connect onboarding
            pending_bank_info.append(
                PayoutResult(
                    submission_id=submission.id,
                    user_id=user.id,
                    username=user.username,
                    placement=placement,
                    prize_amount=prize_amount,
                    status="pending_connect_onboarding",
                    message="Winner needs to complete Stripe Connect onboarding",
                )
            )
            continue

        # c. Check if payout already exists
        existing_payout = None
        for payment in submission.payments:
            if payment.type == PaymentType.PRIZE_PAYOUT:
                existing_payout = payment
                break

        if existing_payout:
            if existing_payout.status in [PaymentStatus.COMPLETED, PaymentStatus.PENDING]:
                # Already paid or in progress
                already_paid.append(
                    PayoutResult(
                        submission_id=submission.id,
                        user_id=user.id,
                        username=user.username,
                        placement=placement,
                        prize_amount=prize_amount,
                        stripe_payout_id=existing_payout.stripe_transfer_id,
                        status="already_paid",
                        message=f"Payout already {existing_payout.status.value}",
                    )
                )
                continue

        # d. Create Stripe Transfer (with idempotency key)
        try:
            # Generate unique idempotency key for this specific payout
            # Format: comp-{competition_id}-sub-{submission_id}-v1
            # This prevents duplicate transfers even if backend crashes
            idempotency_key = f"comp-{competition_id}-sub-{submission.id}-v1"

            transfer = stripe.Transfer.create(
                amount=int(prize_amount * 100),
                currency='usd',
                destination=user.stripe_connect_account_id,
                metadata={
                    'competition_id': str(competition_id),
                    'submission_id': str(submission.id),
                    'placement': placement,
                    'user_id': str(user.id),
                },
                idempotency_key=idempotency_key  # Prevents duplicates within 24 hours
            )

            # e. Create Payment record
            new_payment = Payment(
                type=PaymentType.PRIZE_PAYOUT,
                amount=prize_amount,
                status=PaymentStatus.PENDING,
                stripe_transfer_id=transfer.id,
                user_id=user.id,
                competition_id=competition_id,
                submission_id=submission.id,
            )
            db.add(new_payment)

            # f. Add to successful list
            successful_payouts.append(
                PayoutResult(
                    submission_id=submission.id,
                    user_id=user.id,
                    username=user.username,
                    placement=placement,
                    prize_amount=prize_amount,
                    stripe_payout_id=transfer.id,
                    status="success",
                    message="Transfer initiated successfully",
                )
            )
            total_distributed += prize_amount

        except stripe.error.StripeError as e:
            # Stripe error during transfer creation - add to failed payouts
            failed_payouts.append(
                PayoutResult(
                    submission_id=submission.id,
                    user_id=user.id,
                    username=user.username,
                    placement=placement,
                    prize_amount=prize_amount,
                    status="error",
                    message=f"Stripe error: {str(e)}",
                )
            )
            continue

    # 6. Commit all Payment records
    await db.commit()

    # 7. Build summary message
    summary_parts = []
    if successful_payouts:
        summary_parts.append(f"{len(successful_payouts)} payouts initiated successfully")
    if pending_bank_info:
        summary_parts.append(f"{len(pending_bank_info)} winners need bank account setup")
    if failed_payouts:
        summary_parts.append(f"{len(failed_payouts)} payouts failed")
    if already_paid:
        summary_parts.append(f"{len(already_paid)} already paid")

    summary = ". ".join(summary_parts) if summary_parts else "No payouts processed"

    # 8. Return response
    return DistributePrizesResponse(
        competition_id=competition.id,
        competition_title=competition.title,
        successful_payouts=successful_payouts,
        pending_bank_info=pending_bank_info,
        failed_payouts=failed_payouts,
        already_paid=already_paid,
        total_distributed=total_distributed,
        total_expected=total_expected,
        summary=summary,
    )


@router.get("/competitions/{competition_id}/payments")
async def get_competition_payments(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    Get all prize payout payments for a competition.

    Accessible by: ADMIN only

    Returns list of payment records for PRIZE_PAYOUT type payments.
    """
    # Validate competition exists
    result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = result.scalar_one_or_none()

    if not competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Competition {competition_id} not found",
        )

    # Fetch all prize payout payments for this competition
    result = await db.execute(
        select(Payment)
        .where(
            Payment.competition_id == competition_id,
            Payment.type == PaymentType.PRIZE_PAYOUT
        )
        .options(
            selectinload(Payment.user),
            selectinload(Payment.submission)
        )
        .order_by(Payment.created_at.desc())
    )
    payments = result.scalars().all()

    # Build response
    payment_list = []
    for payment in payments:
        payment_list.append({
            "id": payment.id,
            "user_id": payment.user_id,
            "username": payment.user.username,
            "submission_id": payment.submission_id,
            "submission_title": payment.submission.title if payment.submission else None,
            "amount": float(payment.amount),
            "status": payment.status.value,
            "stripe_transfer_id": payment.stripe_transfer_id,
            "created_at": payment.created_at.isoformat(),
            "processed_at": payment.processed_at.isoformat() if payment.processed_at else None,
        })

    return payment_list


@router.post("/test-balance")
async def test_stripe_balance(
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    TEMPORARY DEBUG ENDPOINT: Test Stripe balance access.

    Accessible by: ADMIN only

    Returns the raw Stripe balance object to verify API access and available funds.
    This endpoint should be removed once debugging is complete.
    """
    try:
        # Retrieve Stripe balance
        balance = stripe.Balance.retrieve()

        # Return all balance details
        return {
            "balance": balance,
            "available": balance.available,
            "pending": balance.pending,
            "connect_reserved": balance.get('connect_reserved', []),
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving balance: {str(e)}",
        )


@router.post("/test-connected-account/{account_id}")
async def test_connected_account(
    account_id: str,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    TEMPORARY DEBUG ENDPOINT: Check destination connected account status.

    Accessible by: ADMIN only

    Path parameter:
    - account_id: Stripe connected account ID (e.g., acct_xxx)

    Returns detailed account information to verify the connected account
    is properly configured and can receive transfers.
    This endpoint should be removed once debugging is complete.
    """
    try:
        # Retrieve the connected account
        account = stripe.Account.retrieve(account_id)

        # Return account details
        return {
            "id": account.id,
            "type": account.type,
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled,
            "details_submitted": account.details_submitted,
            "requirements": account.requirements,
            "capabilities": account.capabilities,
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving account: {str(e)}",
        )


# Schema for test transfer request
class TestTransferRequest(BaseModel):
    amount: int
    destination: str
    idempotency_key: str = None


@router.post("/test-transfer")
async def test_transfer(
    request: TestTransferRequest,
    current_user: User = Depends(require_role(UserRole.ADMIN)),
):
    """
    TEMPORARY DEBUG ENDPOINT: Test a minimal Stripe transfer.

    Accessible by: ADMIN only

    Body:
    - amount: Transfer amount in cents (e.g., 1500 for $15.00)
    - destination: Connected account ID (e.g., acct_xxx)
    - idempotency_key: Optional idempotency key for the transfer

    Attempts a simple transfer and returns detailed debugging information.
    This endpoint should be removed once debugging is complete.
    """
    if settings.debug:
        print("=" * 50)
        print("ATTEMPTING TEST TRANSFER")
        print(f"Amount: {request.amount}")
        print(f"Destination: {request.destination}")
        print(f"Idempotency Key: {request.idempotency_key}")

    try:
        transfer_params = {
            "amount": request.amount,
            "currency": 'usd',
            "destination": request.destination,
            "description": "Test transfer for debugging"
        }

        if request.idempotency_key:
            transfer_params["idempotency_key"] = request.idempotency_key

        transfer = stripe.Transfer.create(**transfer_params)
        if settings.debug:
            print("SUCCESS!")
            print(f"Transfer ID: {transfer.id}")
        return {"success": True, "transfer": transfer}

    except stripe.error.StripeError as e:
        if settings.debug:
            print("FAILED!")
            print(f"Error: {e}")
            print(f"Error dict: {e.json_body}")
        return {"success": False, "error": str(e), "details": e.json_body}
