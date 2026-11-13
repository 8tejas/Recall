import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import (
    User, Subject, Unit, Topic, MCQQuestion, MCQAssessmentResult, LearningMaterial, utc_now
)
from backend.app.schemas.all_schemas import (
    MCQQuestionOut,
    MCQGenerateRequest,
    MCQSubmitRequest,
    MCQAssessmentResultOut,
    MCQQuestionFeedback,
)
from backend.app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/topics/{topic_id}/mcqs", tags=["mcq"])


@router.get("", response_model=List[MCQQuestionOut])
def get_topic_mcqs(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all diagnostic MCQs available for this syllabus topic."""
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == topic_id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    mcqs = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.topic_id == topic_id)
        .order_by(MCQQuestion.created_at.asc())
        .all()
    )
    return mcqs


@router.post("/generate", response_model=List[MCQQuestionOut])
async def generate_topic_mcqs(
    topic_id: str,
    req: MCQGenerateRequest = MCQGenerateRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate university-grade diagnostic MCQs with 4 options and detailed explanations."""
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == topic_id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    unit = topic.unit
    subject = unit.subject

    # Retrieve any existing study notes as source context (strictly excluding private personal notes)
    material = (
        db.query(LearningMaterial)
        .filter(LearningMaterial.topic_id == topic_id)
        .order_by(LearningMaterial.version.desc())
        .first()
    )
    source_text = material.markdown_text if material else ""

    # Retrieve any existing questions so we can generate distinct new items
    existing_mcqs = db.query(MCQQuestion).filter(MCQQuestion.topic_id == topic_id).all()
    existing_question_texts = [q.question_text for q in existing_mcqs]

    ai_provider = get_ai_provider()
    raw_mcqs = await ai_provider.generate_mcqs(
        topic_title=topic.title,
        unit_context=unit.title,
        subject_context=subject.name,
        source_text=source_text,
        num_questions=req.num_questions or 5,
        existing_questions=existing_question_texts,
    )

    created_questions = []
    for item in raw_mcqs:
        mcq = MCQQuestion(
            topic_id=topic_id,
            question_text=item.get("question", ""),
            options=item.get("options", []),
            correct_option_id=item.get("correct_option_id", "A"),
            explanation=item.get("explanation", ""),
            difficulty=item.get("difficulty", "medium"),
        )
        db.add(mcq)
        created_questions.append(mcq)

    # Mark topic in_progress if not started
    if topic.status == "not_started":
        topic.status = "in_progress"

    db.commit()
    for q in created_questions:
        db.refresh(q)

    return created_questions


@router.post("/submit", response_model=MCQAssessmentResultOut)
def submit_mcq_assessment(
    topic_id: str,
    req: MCQSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grade MCQ assessment submission, store diagnostic record, and return explanations."""
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == topic_id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    submission_dict = {a.question_id: a.selected_option_id for a in req.answers}
    question_ids = list(submission_dict.keys())

    questions = (
        db.query(MCQQuestion)
        .filter(MCQQuestion.id.in_(question_ids), MCQQuestion.topic_id == topic_id)
        .all()
    )

    if not questions:
        raise HTTPException(status_code=400, detail="No matching questions found for evaluation")

    total_count = len(questions)
    correct_count = 0
    feedback_list = []

    for q in questions:
        selected = submission_dict.get(q.id, "")
        is_correct = selected.strip().upper() == q.correct_option_id.strip().upper()
        if is_correct:
            correct_count += 1

        feedback_list.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "options": q.options,
            "selected_option_id": selected,
            "correct_option_id": q.correct_option_id,
            "is_correct": is_correct,
            "explanation": q.explanation,
        })

    score_pct = round((correct_count / total_count) * 100, 1) if total_count > 0 else 0.0

    # Save assessment result
    result = MCQAssessmentResult(
        topic_id=topic_id,
        user_id=current_user.id,
        score_percentage=score_pct,
        total_questions=total_count,
        correct_count=correct_count,
        answers_json=submission_dict,
        detailed_feedback=feedback_list,
    )
    db.add(result)

    # If score is >= 80%, topic can be considered mastered if already in progress
    if score_pct >= 80.0 and topic.status != "mastered":
        topic.status = "mastered"

    db.commit()
    db.refresh(result)

    return result


@router.get("/latest-assessment", response_model=Optional[MCQAssessmentResultOut])
def get_latest_mcq_assessment(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the most recent MCQ diagnostic assessment for this topic."""
    result = (
        db.query(MCQAssessmentResult)
        .filter(MCQAssessmentResult.topic_id == topic_id, MCQAssessmentResult.user_id == current_user.id)
        .order_by(MCQAssessmentResult.created_at.desc())
        .first()
    )
    return result

