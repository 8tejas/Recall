from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import (
    User, Topic, LearningMaterial, AssessmentResult, utc_now
)
from backend.app.schemas.all_schemas import (
    TopicAssessmentRequest,
    AssessmentSubmitRequest,
    AssessmentResultOut,
)
from backend.app.services.ai_provider import get_ai_provider

router = APIRouter(prefix="/topics", tags=["assessments"])

@router.post("/{id}/assessment/generate")
async def generate_assessment(
    id: str,
    req: TopicAssessmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = db.query(Topic).filter(Topic.id == id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    notes = db.query(LearningMaterial).filter(LearningMaterial.topic_id == topic.id).first()
    source_text = notes.markdown_text if notes else topic.title

    ai = get_ai_provider()
    assessment_data = await ai.generate_topic_assessment(
        topic_title=topic.title,
        source_text=source_text,
        distribution=req.distribution or {"definitions": 20, "short_answer": 30, "long_answer": 30, "conceptual": 20}
    )
    return assessment_data


@router.post("/{id}/assessment/submit", response_model=AssessmentResultOut)
async def submit_assessment(
    id: str,
    req: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = db.query(Topic).filter(Topic.id == id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    total_submitted = len(req.answers)
    if total_submitted == 0:
        raise HTTPException(status_code=400, detail="No answers submitted")

    ai = get_ai_provider()
    total_score = 0.0
    breakdown = {}
    weak_areas = []
    recommended_revision = []

    for item in req.answers:
        user_ans = item.user_answer.strip()
        if not user_ans:
            weak_areas.append(f"{item.item_type.capitalize()}: Answer was left blank")
            breakdown[item.item_id] = {
                "score": 0.0,
                "feedback": "No answer submitted."
            }
            continue

        # Evaluate answer
        eval_res = await ai.evaluate_written_answer(
            question_data={
                "mark_category": 5 if item.item_type in ["short_answer", "long_answer"] else 2,
                "statement": f"Assessment prompt ({item.item_type}) for {topic.title}",
                "reference_answer": f"Standard academic formulation for {topic.title}",
                "essential_keywords": [topic.title, "definition", "mechanism"],
                "key_points": ["State formal theory", "Explain operational mechanism"]
            },
            student_answer=user_ans
        )

        marks = eval_res.get("estimated_marks", 3.0)
        max_marks = eval_res.get("maximum_marks", 5.0)
        percentage = (marks / max_marks) * 100

        total_score += percentage
        breakdown[item.item_id] = {
            "type": item.item_type,
            "awarded_marks": marks,
            "max_marks": max_marks,
            "percentage": round(percentage, 1),
            "feedback": eval_res.get("improvement_suggestions", [])
        }

        if percentage < 60:
            weak_areas.append(f"{item.item_type.capitalize()}: {', '.join(eval_res.get('missing_points', ['Incomplete technical depth']))}")

    overall_percentage = round(total_score / total_submitted, 1)

    if overall_percentage < 70:
        recommended_revision.append(f"Practice progressive cloze deletion for {topic.title}")
        recommended_revision.append("Review 5-mark structured explanation notes")
    if weak_areas:
        recommended_revision.append("Attempt self-evaluation mode on written exam questions")

    # Update topic status if achieved mastery
    if overall_percentage >= 80:
        topic.status = "mastered"
    elif topic.status == "not_started":
        topic.status = "in_progress"

    result = AssessmentResult(
        topic_id=topic.id,
        user_id=current_user.id,
        score_percentage=overall_percentage,
        total_questions=total_submitted,
        attempted_questions=total_submitted,
        breakdown_json=breakdown,
        weak_areas=weak_areas,
        recommended_revision=recommended_revision
    )
    db.add(result)
    db.commit()
    db.refresh(result)

    return AssessmentResultOut(
        id=result.id,
        topic_id=result.topic_id,
        score_percentage=result.score_percentage,
        total_questions=result.total_questions,
        attempted_questions=result.attempted_questions,
        breakdown=result.breakdown_json or {},
        weak_areas=result.weak_areas or [],
        recommended_revision=result.recommended_revision or [],
        created_at=result.created_at
    )


@router.get("/{id}/assessment/latest", response_model=AssessmentResultOut)
def get_latest_assessment(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = (
        db.query(AssessmentResult)
        .filter(AssessmentResult.topic_id == id, AssessmentResult.user_id == current_user.id)
        .order_by(AssessmentResult.created_at.desc())
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="No assessment found for this topic")

    return AssessmentResultOut(
        id=result.id,
        topic_id=result.topic_id,
        score_percentage=result.score_percentage,
        total_questions=result.total_questions,
        attempted_questions=result.attempted_questions,
        breakdown=result.breakdown_json or {},
        weak_areas=result.weak_areas or [],
        recommended_revision=result.recommended_revision or [],
        created_at=result.created_at
    )
