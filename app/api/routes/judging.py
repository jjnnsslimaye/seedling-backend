from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.submission import Submission, SubmissionStatus
from app.models.competition import Competition
from app.models.user import User, UserRole
from app.models.judge_assignment import JudgeAssignment
from app.schemas.judging import JudgeScoreSubmit, SubmissionWithScores
from app.core.security import require_role, get_current_user_obj

router = APIRouter()


@router.get("/assignments", response_model=List[dict])
async def get_judge_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_obj),
):
    """
    Get all competition assignments for the current judge.

    Returns list of competitions with assignment details:
    - competition info
    - list of assigned submissions
    - scoring progress (completed/total)
    """

    # Get all judge assignments for current user
    result = await db.execute(
        select(JudgeAssignment)
        .options(
            selectinload(JudgeAssignment.submission).selectinload(Submission.competition),
            selectinload(JudgeAssignment.submission).selectinload(Submission.user)
        )
        .where(JudgeAssignment.judge_id == current_user.id)
    )
    assignments = result.scalars().all()

    # Group assignments by competition
    competitions_map = {}

    for assignment in assignments:
        comp_id = assignment.submission.competition_id

        if comp_id not in competitions_map:
            competitions_map[comp_id] = {
                "competition": assignment.submission.competition,
                "submissions": [],
                "completed": 0,
                "total": 0
            }

        # Check if judge has scored this submission
        has_scored = assignment.completed_at is not None
        judge_score = None

        # Get judge's score from submission's human_scores
        if assignment.submission.human_scores:
            judges_list = assignment.submission.human_scores.get("judges", [])
            for judge_score_entry in judges_list:
                if judge_score_entry.get("judge_id") == current_user.id:
                    judge_score = judge_score_entry.get("overall")
                    break

        # Add submission to list
        competitions_map[comp_id]["submissions"].append({
            "id": assignment.submission.id,
            "title": assignment.submission.title,
            "user": {
                "id": assignment.submission.user.id,
                "username": assignment.submission.user.username
            },
            "has_scored": has_scored,
            "judge_score": judge_score
        })

        competitions_map[comp_id]["total"] += 1
        if has_scored:
            competitions_map[comp_id]["completed"] += 1

    # Format response
    response = []
    for comp_data in competitions_map.values():
        response.append({
            "competition": {
                "id": comp_data["competition"].id,
                "title": comp_data["competition"].title,
                "domain": comp_data["competition"].domain,
                "prize_pool": float(comp_data["competition"].prize_pool),
                "deadline": comp_data["competition"].deadline.isoformat(),
                "status": comp_data["competition"].status.value
            },
            "submissions": comp_data["submissions"],
            "completed": comp_data["completed"],
            "total": comp_data["total"]
        })

    return response


@router.get("/competitions/{competition_id}/submissions", response_model=List[SubmissionWithScores])
async def get_competition_submissions_for_judging(
    competition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN)),
):
    """
    Get all submissions for a competition that need judging.

    Accessible by: JUDGE, ADMIN

    - ADMIN: Can see all submissions
    - JUDGE: Can only see submissions they are assigned to

    For COMPLETE competitions: Shows ALL submissions (including rejected)
    For other competitions: Filters for SUBMITTED, UNDER_REVIEW, or WINNER
    Orders by final_score descending for completed, submitted_at ascending otherwise
    """
    # First, get the competition to check its status
    comp_result = await db.execute(
        select(Competition).where(Competition.id == competition_id)
    )
    competition = comp_result.scalar_one_or_none()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    # Determine if we should show all submissions (for completed competitions)
    from app.models.competition import CompetitionStatus
    show_all_submissions = competition.status == CompetitionStatus.COMPLETE

    # Build query that joins with judge assignments for judges
    if current_user.role == UserRole.JUDGE:
        # For judges, select both Submission and JudgeAssignment
        query = (
            select(Submission, JudgeAssignment)
            .join(JudgeAssignment, Submission.id == JudgeAssignment.submission_id)
            .options(
                selectinload(Submission.user),
                selectinload(Submission.competition),
            )
            .where(
                Submission.competition_id == competition_id,
                JudgeAssignment.judge_id == current_user.id,
            )
        )

        # Add status filter only if competition is not complete
        if not show_all_submissions:
            query = query.where(
                Submission.status.in_([
                    SubmissionStatus.SUBMITTED,
                    SubmissionStatus.UNDER_REVIEW,
                    SubmissionStatus.WINNER,
                ])
            )

        # Order by final_score desc for completed competitions, otherwise by submitted_at
        if show_all_submissions:
            query = query.order_by(Submission.final_score.desc().nullslast())
        else:
            query = query.order_by(Submission.submitted_at.asc())

        result = await db.execute(query)
        rows = result.all()

        # Convert to SubmissionWithScores format with assignment data
        return [
            SubmissionWithScores.from_submission(
                submission=submission,
                assignment=assignment,
                current_judge_id=current_user.id
            )
            for submission, assignment in rows
        ]
    else:
        # For admins, just select submissions (no assignment filtering)
        query = (
            select(Submission)
            .options(
                selectinload(Submission.user),
                selectinload(Submission.competition),
            )
            .where(
                Submission.competition_id == competition_id,
            )
        )

        # Add status filter only if competition is not complete
        if not show_all_submissions:
            query = query.where(
                Submission.status.in_([
                    SubmissionStatus.SUBMITTED,
                    SubmissionStatus.UNDER_REVIEW,
                    SubmissionStatus.WINNER,
                ])
            )

        # Order by final_score desc for completed competitions, otherwise by submitted_at
        if show_all_submissions:
            query = query.order_by(Submission.final_score.desc().nullslast())
        else:
            query = query.order_by(Submission.submitted_at.asc())

        result = await db.execute(query)
        submissions = result.scalars().all()

        # Convert to SubmissionWithScores format without assignment data
        return [SubmissionWithScores.from_submission(submission) for submission in submissions]


@router.post("/submissions/{submission_id}/score", response_model=SubmissionWithScores)
async def submit_judge_score(
    submission_id: int,
    score_data: JudgeScoreSubmit,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN)),
):
    """
    Submit or update a judge's score for a submission.

    Accessible by: JUDGE, ADMIN

    Validates:
    - Submission exists
    - Competition and its rubric exist
    - All criteria in criteria_scores match the competition rubric keys
    - All score values are between 0-10 (validated by schema)

    Updates the submission with the judge's scores and feedback.
    """
    # Fetch submission with relationships
    result = await db.execute(
        select(Submission)
        .where(Submission.id == submission_id)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Validate judge is assigned to this submission (JUDGE role only, ADMIN bypasses)
    if current_user.role == UserRole.JUDGE:
        assignment_result = await db.execute(
            select(JudgeAssignment).where(
                JudgeAssignment.judge_id == current_user.id,
                JudgeAssignment.submission_id == submission_id,
            )
        )
        assignment = assignment_result.scalar_one_or_none()

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to judge this submission",
            )

    # Validate competition exists
    if not submission.competition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competition not found for this submission",
        )

    # Validate rubric exists and is valid JSON
    competition = submission.competition
    if not competition.rubric or not isinstance(competition.rubric, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition rubric is invalid or missing",
        )

    # Extract rubric criteria keys
    # Assuming rubric structure is like: {"criteria": {"innovation": {...}, "feasibility": {...}}}
    # or could be: {"innovation": {...}, "feasibility": {...}}
    rubric_criteria = competition.rubric.get("criteria", competition.rubric)
    if not isinstance(rubric_criteria, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition rubric format is invalid",
        )

    rubric_keys = set(rubric_criteria.keys())
    score_keys = set(score_data.criteria_scores.keys())

    # Validate all score keys match rubric keys
    if score_keys != rubric_keys:
        missing_in_scores = rubric_keys - score_keys
        extra_in_scores = score_keys - rubric_keys

        error_parts = []
        if missing_in_scores:
            error_parts.append(f"Missing criteria: {', '.join(missing_in_scores)}")
        if extra_in_scores:
            error_parts.append(f"Unknown criteria: {', '.join(extra_in_scores)}")

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Criteria mismatch. {' '.join(error_parts)}. Expected: {', '.join(rubric_keys)}",
        )

    # Double-check score values are 0-10 (already validated by schema, but safety check)
    for criterion, score in score_data.criteria_scores.items():
        if not 0 <= score <= 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Score for '{criterion}' must be between 0 and 10",
            )

    # Add judge score to submission
    submission.add_judge_score(
        judge_id=current_user.id,
        judge_name=current_user.username,
        criteria_scores=score_data.criteria_scores,
        feedback=score_data.feedback,
    )

    # Commit changes
    await db.commit()
    await db.refresh(submission)

    # Mark assignment as completed if judge is scoring
    assignment = None
    if current_user.role == UserRole.JUDGE:
        # Fetch the assignment (we already validated it exists earlier)
        assignment_result = await db.execute(
            select(JudgeAssignment).where(
                JudgeAssignment.judge_id == current_user.id,
                JudgeAssignment.submission_id == submission_id,
            )
        )
        assignment = assignment_result.scalar_one_or_none()

        if assignment and assignment.completed_at is None:
            assignment.completed_at = datetime.utcnow()
            await db.commit()

    # Return updated submission with assignment data
    return SubmissionWithScores.from_submission(
        submission=submission,
        assignment=assignment,
        current_judge_id=current_user.id if current_user.role == UserRole.JUDGE else None
    )


@router.get("/submissions/{submission_id}", response_model=SubmissionWithScores)
async def get_submission_for_judging(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.JUDGE, UserRole.ADMIN)),
):
    """
    Get full details of a submission including all scores.

    Accessible by: JUDGE, ADMIN

    - ADMIN: Can view any submission
    - JUDGE: Can only view submissions they are assigned to

    Returns submission with parsed judge scores and feedback.
    """
    # Fetch submission with relationships
    result = await db.execute(
        select(Submission)
        .where(Submission.id == submission_id)
        .options(
            selectinload(Submission.user),
            selectinload(Submission.competition),
        )
    )
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Submission not found",
        )

    # Validate judge is assigned to this submission (JUDGE role only, ADMIN bypasses)
    assignment = None
    if current_user.role == UserRole.JUDGE:
        assignment_result = await db.execute(
            select(JudgeAssignment).where(
                JudgeAssignment.judge_id == current_user.id,
                JudgeAssignment.submission_id == submission_id,
            )
        )
        assignment = assignment_result.scalar_one_or_none()

        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to judge this submission",
            )

    # Return submission with assignment data if available
    return SubmissionWithScores.from_submission(
        submission=submission,
        assignment=assignment,
        current_judge_id=current_user.id if current_user.role == UserRole.JUDGE else None
    )
