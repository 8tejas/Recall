from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import (
    User, Exercise, Question, Attempt, ReviewSchedule, Topic, Unit, Subject, utc_now
)
from backend.app.schemas.all_schemas import (
    ExerciseAttemptRequest,
    ExerciseAttemptOut,
    WrittenSubmissionRequest,
    SelfEvaluationRequest,
    AnswerEvaluationOut,
)
from backend.app.services.memorization_engine import MemorizationEngine
from backend.app.services.fsrs_scheduler import SpacedRepetitionScheduler
from backend.app.services.ai_provider import get_ai_provider

router = APIRouter(tags=["exercises_and_practice"])

def _update_or_create_schedule(
    db: Session,
    user_id: str,
    item_type: str,
    item_id: str,
    title: str,
    topic: Optional[Topic],
    rating: str
):
    schedule = (
        db.query(ReviewSchedule)
        .filter(ReviewSchedule.user_id == user_id, ReviewSchedule.item_id == item_id)
        .first()
    )
    
    current_stability = schedule.stability if schedule else 1.0
    current_difficulty = schedule.difficulty if schedule else 5.0
    reps = schedule.reps if schedule else 0
    lapses = schedule.lapses if schedule else 0

    sched_data = SpacedRepetitionScheduler.calculate_next_review(
        current_stability=current_stability,
        current_difficulty=current_difficulty,
        reps=reps,
        lapses=lapses,
        rating=rating
    )

    if not schedule:
        unit = topic.unit if topic else None
        subject = unit.subject if unit else None
        schedule = ReviewSchedule(
            user_id=user_id,
            item_type=item_type,
            item_id=item_id,
            title=title,
            topic_id=topic.id if topic else None,
            topic_title=topic.title if topic else None,
            subject_title=subject.name if subject else None,
            stability=sched_data["stability"],
            difficulty=sched_data["difficulty"],
            reps=sched_data["reps"],
            lapses=sched_data["lapses"],
            last_reviewed=sched_data["last_reviewed"],
            due_date=sched_data["due_date"]
        )
        db.add(schedule)
    else:
        schedule.stability = sched_data["stability"]
        schedule.difficulty = sched_data["difficulty"]
        schedule.reps = sched_data["reps"]
        schedule.lapses = sched_data["lapses"]
        schedule.last_reviewed = sched_data["last_reviewed"]
        schedule.due_date = sched_data["due_date"]

    db.commit()


@router.post("/api/exercises/{id}/attempt", response_model=ExerciseAttemptOut)
def record_exercise_attempt(
    id: str,
    req: ExerciseAttemptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exercise = db.query(Exercise).filter(Exercise.id == id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    topic = exercise.topic
    rating = req.performance_rating or ("completely_remembered" if (req.score or 0) >= 0.8 else "minor_omissions")

    attempt = Attempt(
        user_id=current_user.id,
        exercise_id=exercise.id,
        topic_id=topic.id,
        submission_text=req.submission_text,
        evaluation_mode="self" if req.performance_rating else "deterministic",
        score=req.score or 1.0,
        max_score=1.0,
        performance_rating=rating,
        feedback_json={"level_completed": req.level_completed} if req.level_completed else None
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Update spaced repetition schedule
    _update_or_create_schedule(
        db=db,
        user_id=current_user.id,
        item_type="exercise",
        item_id=exercise.id,
        title=exercise.title,
        topic=topic,
        rating=rating
    )

    return attempt


@router.post("/api/exercises/{id}/evaluate")
def evaluate_exercise_submission(
    id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exercise = db.query(Exercise).filter(Exercise.id == id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    mode = exercise.exercise_mode
    submission_text = payload.get("submission_text", "")

    if mode == "paragraph_reconstruction":
        ref_text = exercise.payload.get("reference_text", "")
        result = MemorizationEngine.evaluate_paragraph_reconstruction(ref_text, submission_text)
    elif mode == "list_recall":
        ref_items = exercise.payload.get("items", [])
        student_items = payload.get("student_items", [])
        if not student_items and submission_text:
            student_items = [line.strip() for line in submission_text.split("\n") if line.strip()]
        is_ordered = exercise.payload.get("is_ordered", True)
        result = MemorizationEngine.evaluate_list_sequence(ref_items, student_items, is_ordered=is_ordered)
    elif mode == "definition_recall":
        ref_def = exercise.payload.get("reference_definition", "")
        result = MemorizationEngine.evaluate_paragraph_reconstruction(ref_def, submission_text)
    else:
        # Default text comparison
        original = exercise.payload.get("original_text", "")
        result = MemorizationEngine.evaluate_paragraph_reconstruction(original, submission_text)

    # Save attempt
    score = result.get("score", 0.0)
    rating = "completely_remembered" if score >= 0.85 else ("minor_omissions" if score >= 0.6 else "major_omissions")
    
    attempt = Attempt(
        user_id=current_user.id,
        exercise_id=exercise.id,
        topic_id=exercise.topic_id,
        submission_text=submission_text,
        evaluation_mode="deterministic",
        score=score,
        max_score=1.0,
        performance_rating=rating,
        feedback_json=result
    )
    db.add(attempt)
    db.commit()

    # Spaced repetition schedule update
    _update_or_create_schedule(
        db=db,
        user_id=current_user.id,
        item_type="exercise",
        item_id=exercise.id,
        title=exercise.title,
        topic=exercise.topic,
        rating=rating
    )

    return result


# ---------------- Written Exam Question Evaluation ----------------
@router.post("/api/questions/{id}/submit")
async def submit_written_answer_ai(
    id: str,
    req: WrittenSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(Question).filter(Question.id == id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    ai = get_ai_provider()
    eval_result = await ai.evaluate_written_answer(
        question_data={
            "mark_category": question.mark_category,
            "statement": question.statement,
            "reference_answer": question.reference_answer,
            "essential_keywords": question.essential_keywords or [],
            "key_points": question.key_points or [],
            "structure_guide": question.structure_guide or [],
        },
        student_answer=req.submission_text
    )

    score = eval_result.get("estimated_marks", 0.0)
    max_score = float(question.mark_category)
    score_ratio = score / max_score if max_score > 0 else 0.0

    if score_ratio >= 0.85:
        rating = "completely_remembered"
    elif score_ratio >= 0.60:
        rating = "minor_omissions"
    elif score_ratio >= 0.35:
        rating = "major_omissions"
    else:
        rating = "unable"

    attempt = Attempt(
        user_id=current_user.id,
        question_id=question.id,
        topic_id=question.topic_id,
        submission_text=req.submission_text,
        evaluation_mode="ai",
        score=score,
        max_score=max_score,
        performance_rating=rating,
        feedback_json=eval_result
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Spaced repetition update
    _update_or_create_schedule(
        db=db,
        user_id=current_user.id,
        item_type="question",
        item_id=question.id,
        title=f"{question.mark_category}-Mark: {question.statement[:40]}...",
        topic=question.topic,
        rating=rating
    )

    eval_result["attempt_id"] = attempt.id
    eval_result["question_id"] = question.id
    return eval_result


@router.post("/api/questions/{id}/self-eval")
def submit_written_answer_self(
    id: str,
    req: SelfEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(Question).filter(Question.id == id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    max_marks = float(question.mark_category)
    multiplier_map = {
        "completely_remembered": 1.0,
        "minor_omissions": 0.75,
        "major_omissions": 0.40,
        "unable": 0.0,
    }
    score = round(max_marks * multiplier_map.get(req.performance_rating, 0.5), 1)

    attempt = Attempt(
        user_id=current_user.id,
        question_id=question.id,
        topic_id=question.topic_id,
        submission_text=req.submission_text,
        evaluation_mode="self",
        score=score,
        max_score=max_marks,
        performance_rating=req.performance_rating,
        feedback_json={"self_evaluation": True, "rating": req.performance_rating}
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Spaced repetition update
    _update_or_create_schedule(
        db=db,
        user_id=current_user.id,
        item_type="question",
        item_id=question.id,
        title=f"{question.mark_category}-Mark: {question.statement[:40]}...",
        topic=question.topic,
        rating=req.performance_rating
    )

    return {
        "attempt_id": attempt.id,
        "question_id": question.id,
        "score": score,
        "max_score": max_marks,
        "performance_rating": req.performance_rating,
        "reference_answer": question.reference_answer,
        "key_points": question.key_points
    }
