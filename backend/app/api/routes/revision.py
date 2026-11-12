from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import (
    User, ReviewSchedule, Topic, Unit, Subject, Attempt, Exercise, Question, utc_now
)
from backend.app.schemas.all_schemas import (
    RevisionItemOut,
    RevisionReviewRequest,
)
from backend.app.services.fsrs_scheduler import SpacedRepetitionScheduler

router = APIRouter(tags=["revision_and_dashboard"])

@router.get("/api/revision/due", response_model=List[RevisionItemOut])
def get_due_revisions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    schedules = (
        db.query(ReviewSchedule)
        .filter(ReviewSchedule.user_id == current_user.id)
        .order_by(ReviewSchedule.due_date.asc())
        .all()
    )

    results = []
    for s in schedules:
        due = s.due_date
        # Make timezone-aware comparison if needed
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        is_overdue = due <= now

        results.append(RevisionItemOut(
            schedule_id=s.id,
            item_type=s.item_type,
            item_id=s.item_id,
            title=s.title or f"{s.item_type.capitalize()} Review",
            topic_id=s.topic_id,
            topic_title=s.topic_title or "Academic Topic",
            subject_title=s.subject_title or "Subject",
            stability=s.stability,
            difficulty=s.difficulty,
            reps=s.reps,
            lapses=s.lapses,
            due_date=s.due_date,
            is_overdue=is_overdue
        ))

    return results

@router.post("/api/revision/{schedule_id}/review")
def review_scheduled_item(
    schedule_id: str,
    req: RevisionReviewRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    schedule = (
        db.query(ReviewSchedule)
        .filter(ReviewSchedule.id == schedule_id, ReviewSchedule.user_id == current_user.id)
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="Review item not found")

    sched_data = SpacedRepetitionScheduler.calculate_next_review(
        current_stability=schedule.stability,
        current_difficulty=schedule.difficulty,
        reps=schedule.reps,
        lapses=schedule.lapses,
        rating=req.performance_rating
    )

    schedule.stability = sched_data["stability"]
    schedule.difficulty = sched_data["difficulty"]
    schedule.reps = sched_data["reps"]
    schedule.lapses = sched_data["lapses"]
    schedule.last_reviewed = sched_data["last_reviewed"]
    schedule.due_date = sched_data["due_date"]
    db.commit()

    return {
        "status": "success",
        "new_stability": schedule.stability,
        "new_difficulty": schedule.difficulty,
        "reps": schedule.reps,
        "due_date": schedule.due_date,
        "interval_days": sched_data["interval_days"]
    }

@router.get("/api/dashboard/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    
    # 1. Total counts
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).all()
    subject_ids = [s.id for s in subjects]
    
    topics = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .filter(Unit.subject_id.in_(subject_ids))
        .all()
    ) if subject_ids else []

    total_topics = len(topics)
    mastered_topics = sum(1 for t in topics if t.status == "mastered")
    in_progress_topics = sum(1 for t in topics if t.status == "in_progress")

    # 2. Spaced Repetition Due Count
    schedules = db.query(ReviewSchedule).filter(ReviewSchedule.user_id == current_user.id).all()
    due_count = 0
    overdue_items = []
    for s in schedules:
        due = s.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        if due <= now:
            due_count += 1
            overdue_items.append({
                "id": s.id,
                "item_id": s.item_id,
                "title": s.title,
                "topic_id": s.topic_id,
                "topic_title": s.topic_title,
                "due_date": s.due_date,
                "lapses": s.lapses
            })

    # 3. Recently Studied Topics (derived from recent attempts)
    recent_attempts = (
        db.query(Attempt)
        .filter(Attempt.user_id == current_user.id, Attempt.topic_id.isnot(None))
        .order_by(desc(Attempt.created_at))
        .limit(15)
        .all()
    )
    
    seen_topic_ids = set()
    recently_studied = []
    for a in recent_attempts:
        if a.topic_id not in seen_topic_ids:
            seen_topic_ids.add(a.topic_id)
            t = db.query(Topic).filter(Topic.id == a.topic_id).first()
            if t:
                u = t.unit
                s = u.subject if u else None
                recently_studied.append({
                    "topic_id": t.id,
                    "title": t.title,
                    "subject_name": s.name if s else "Subject",
                    "status": t.status,
                    "last_attempt_at": a.created_at
                })
        if len(recently_studied) >= 5:
            break

    # 4. Revision Priority: Topics with high lapses or overdue reviews
    revision_needed = overdue_items[:5]

    return {
        "total_subjects": len(subjects),
        "total_topics": total_topics,
        "mastered_topics": mastered_topics,
        "in_progress_topics": in_progress_topics,
        "due_revision_count": due_count,
        "recently_studied": recently_studied,
        "revision_needed": revision_needed
    }
