import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import (
    User, Subject, Unit, Topic, TopicQA, LearningMaterial, utc_now
)
from backend.app.schemas.all_schemas import (
    TopicQAAskRequest,
    TopicQAOut,
)
from backend.app.services.ai_provider import get_ai_provider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/topics/{topic_id}/qa", tags=["topic-qa"])


@router.get("", response_model=List[TopicQAOut])
def get_topic_qas(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all saved Q&A interactions for this syllabus topic."""
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == topic_id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    qas = (
        db.query(TopicQA)
        .filter(TopicQA.topic_id == topic_id, TopicQA.user_id == current_user.id)
        .order_by(TopicQA.created_at.asc())
        .all()
    )
    return qas


@router.post("", response_model=TopicQAOut, status_code=status.HTTP_201_CREATED)
async def ask_topic_question(
    topic_id: str,
    req: TopicQAAskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ask a question about this topic to the LLM tutor and save the response."""
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

    # Retrieve official study notes for academic context
    # (strictly excluding private personal notes to honor user privacy)
    material = (
        db.query(LearningMaterial)
        .filter(LearningMaterial.topic_id == topic_id)
        .order_by(LearningMaterial.version.desc())
        .first()
    )
    source_text = material.markdown_text if material else ""

    # Retrieve recent conversation history for this topic
    recent_qas = (
        db.query(TopicQA)
        .filter(TopicQA.topic_id == topic_id, TopicQA.user_id == current_user.id)
        .order_by(TopicQA.created_at.desc())
        .limit(5)
        .all()
    )
    history = [
        {"question": q.question, "answer": q.answer}
        for q in reversed(recent_qas)
    ]

    ai_provider = get_ai_provider()
    answer_text = await ai_provider.answer_topic_question(
        topic_title=topic.title,
        unit_context=unit.title,
        subject_context=subject.name,
        question=req.question.strip(),
        source_text=source_text,
        conversation_history=history,
    )

    qa_record = TopicQA(
        topic_id=topic_id,
        user_id=current_user.id,
        question=req.question.strip(),
        answer=answer_text,
        created_at=utc_now(),
    )
    db.add(qa_record)

    # Move topic to in_progress if not started
    if topic.status == "not_started":
        topic.status = "in_progress"

    db.commit()
    db.refresh(qa_record)
    return qa_record


@router.delete("/{qa_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_topic_qa(
    topic_id: str,
    qa_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific saved Q&A item."""
    qa_record = (
        db.query(TopicQA)
        .filter(TopicQA.id == qa_id, TopicQA.topic_id == topic_id, TopicQA.user_id == current_user.id)
        .first()
    )
    if not qa_record:
        raise HTTPException(status_code=404, detail="Q&A item not found")

    db.delete(qa_record)
    db.commit()
    return None

