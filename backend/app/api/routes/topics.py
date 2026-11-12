import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import (
    User, Subject, Unit, Topic, LearningMaterial, GenerationJob, Exercise, Question, utc_now
)
from backend.app.schemas.all_schemas import (
    TopicOut,
    TopicUpdate,
    MaterialGenerateRequest,
    MaterialOut,
    MaterialUpdate,
    ExerciseOut,
    QuestionOut,
    GenerationJobOut,
)
from backend.app.services.ai_provider import get_ai_provider

router = APIRouter(prefix="/topics", tags=["topics"])

@router.get("/{id}")
def get_topic_detail(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    unit = topic.unit
    subject = unit.subject

    return {
        "id": topic.id,
        "title": topic.title,
        "description": topic.description,
        "order_index": topic.order_index,
        "status": topic.status,
        "created_at": topic.created_at,
        "unit": {
            "id": unit.id,
            "unit_number": unit.unit_number,
            "title": unit.title,
        },
        "subject": {
            "id": subject.id,
            "name": subject.name,
            "code": subject.code,
        }
    }

@router.put("/{id}", response_model=TopicOut)
def update_topic(
    id: str,
    topic_in: TopicUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    if topic_in.title is not None:
        topic.title = topic_in.title
    if topic_in.description is not None:
        topic.description = topic_in.description
    if topic_in.order_index is not None:
        topic.order_index = topic_in.order_index
    if topic_in.status is not None:
        topic.status = topic_in.status

    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/{id}")
def delete_topic(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted successfully"}

# ---------------- Selective Content Generation ----------------
@router.post("/{id}/generate")
async def generate_topic_resource(
    id: str,
    req: MaterialGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    topic = (
        db.query(Topic)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .first()
    )
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    unit = topic.unit
    subject = unit.subject

    # Create generation job tracker
    job = GenerationJob(
        topic_id=topic.id,
        resource_type=req.resource_type,
        status="processing"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    ai = get_ai_provider()

    try:
        if req.resource_type in [
            "comprehensive_notes", "quick_revision", "definitions",
            "classifications", "comparisons", "examples"
        ]:
            # Collect full unit topic roadmap for curriculum context
            unit_topics = [t.title for t in unit.topics]

            # Generate study material with full unit curriculum awareness
            result = await ai.generate_study_notes(
                topic_title=topic.title,
                unit_context=unit.title,
                subject_context=subject.name,
                resource_type=req.resource_type,
                custom_focus=req.custom_focus,
                unit_topics=unit_topics,
                unit_description=unit.description,
            )
            # Find existing material or create new
            mat = (
                db.query(LearningMaterial)
                .filter(LearningMaterial.topic_id == topic.id, LearningMaterial.content_type == req.resource_type)
                .first()
            )
            if mat:
                mat.title = result["title"]
                mat.markdown_text = result["markdown_text"]
                mat.content_json = result.get("content_json", {})
                mat.version += 1
                mat.is_outdated = False
                mat.updated_at = utc_now()
            else:
                mat = LearningMaterial(
                    topic_id=topic.id,
                    content_type=req.resource_type,
                    title=result["title"],
                    markdown_text=result["markdown_text"],
                    content_json=result.get("content_json", {}),
                    version=1,
                    is_outdated=False
                )
                db.add(mat)

            # Update topic status if not started
            if topic.status == "not_started":
                topic.status = "in_progress"

        elif req.resource_type == "memorization_exercises":
            # Collect context notes
            existing_notes = (
                db.query(LearningMaterial)
                .filter(LearningMaterial.topic_id == topic.id)
                .order_by(LearningMaterial.created_at.desc())
                .first()
            )
            unit_topics_str = ", ".join([t.title for t in unit.topics])
            fallback_context = f"Subject: {subject.name}\nUnit: {unit.title} (Topics: {unit_topics_str})\nTopic: {topic.title}"
            source_text = existing_notes.markdown_text if existing_notes else fallback_context
            mem_data = await ai.generate_memorization_items(topic.title, source_text)

            # Clear older exercises of these modes to keep fresh high-yield exercises
            db.query(Exercise).filter(
                Exercise.topic_id == topic.id,
                Exercise.exercise_mode.in_([
                    "progressive_deletion", "paragraph_reconstruction",
                    "keyword_scaffolding", "definition_recall", "list_recall"
                ])
            ).delete(synchronize_session=False)

            # Mode A: Progressive Deletion
            if "progressive_deletion" in mem_data:
                db.add(Exercise(
                    topic_id=topic.id,
                    exercise_mode="progressive_deletion",
                    title=f"Progressive Deletion: {topic.title}",
                    payload=mem_data["progressive_deletion"]
                ))

            # Mode B: Paragraph Reconstruction
            if "paragraph_reconstruction" in mem_data:
                db.add(Exercise(
                    topic_id=topic.id,
                    exercise_mode="paragraph_reconstruction",
                    title=mem_data["paragraph_reconstruction"].get("title", f"Paragraph Reconstruction: {topic.title}"),
                    payload=mem_data["paragraph_reconstruction"]
                ))

            # Mode C: Keyword Scaffolding
            if "keyword_scaffolding" in mem_data:
                db.add(Exercise(
                    topic_id=topic.id,
                    exercise_mode="keyword_scaffolding",
                    title=f"Keyword Scaffolding: {mem_data['keyword_scaffolding'].get('concept_title', topic.title)}",
                    payload=mem_data["keyword_scaffolding"]
                ))

            # Mode D: Definition Recall
            if "definition_recall" in mem_data:
                db.add(Exercise(
                    topic_id=topic.id,
                    exercise_mode="definition_recall",
                    title=f"Definition Recall: {mem_data['definition_recall'].get('term', topic.title)}",
                    payload=mem_data["definition_recall"]
                ))

            # Mode E: List & Sequence Recall
            if "list_sequence" in mem_data:
                db.add(Exercise(
                    topic_id=topic.id,
                    exercise_mode="list_recall",
                    title=mem_data["list_sequence"].get("list_title", f"Sequence Recall: {topic.title}"),
                    payload=mem_data["list_sequence"]
                ))

        elif req.resource_type == "conceptual_exercises":
            # Generate conceptual matching / sequencing / relationship exercises
            source_notes = (
                db.query(LearningMaterial)
                .filter(LearningMaterial.topic_id == topic.id)
                .first()
            )
            context = source_notes.markdown_text if source_notes else topic.title
            
            # Create conceptual relationships exercise
            conceptual_payload = {
                "concept": topic.title,
                "exercise_type": "relationship_analysis",
                "prompt": f"Analyze the functional relationship between {topic.title} and the primary invariants in {unit.title}.",
                "expected_aspects": [
                    "Input transformation boundary",
                    "Core algorithm and trade-offs",
                    "State verification and output synthesis"
                ],
                "sample_solution": (
                    f"{topic.title} acts as the primary computational bridge in {unit.title}, "
                    f"ensuring that prerequisite inputs are validated before applying core domain state updates."
                )
            }
            db.add(Exercise(
                topic_id=topic.id,
                exercise_mode="conceptual",
                title=f"Conceptual Relations: {topic.title}",
                payload=conceptual_payload
            ))

        elif req.resource_type == "written_questions":
            source_notes = (
                db.query(LearningMaterial)
                .filter(LearningMaterial.topic_id == topic.id)
                .first()
            )
            unit_topics_str = ", ".join([t.title for t in unit.topics])
            source_text = source_notes.markdown_text if source_notes else f"Subject: {subject.name}\nUnit: {unit.title} (Curriculum topics: {unit_topics_str})\nTopic: {topic.title}"
            questions_data = await ai.generate_exam_questions(topic.title, source_text)

            # Clear older questions for this topic
            db.query(Question).filter(Question.topic_id == topic.id).delete(synchronize_session=False)

            for q in questions_data:
                db.add(Question(
                    topic_id=topic.id,
                    mark_category=q.get("mark_category", 5),
                    statement=q.get("statement", ""),
                    reference_answer=q.get("reference_answer", ""),
                    essential_keywords=q.get("essential_keywords", []),
                    key_points=q.get("key_points", []),
                    structure_guide=q.get("structure_guide", [])
                ))

        job.status = "completed"
        job.completed_at = utc_now()
        db.commit()
        return {"status": "success", "resource_type": req.resource_type, "message": "Content generated successfully"}

    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.get("/{id}/materials", response_model=List[MaterialOut])
def get_topic_materials(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    materials = (
        db.query(LearningMaterial)
        .join(Topic, LearningMaterial.topic_id == Topic.id)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .order_by(LearningMaterial.created_at.asc())
        .all()
    )
    return materials

@router.put("/materials/{material_id}", response_model=MaterialOut)
def update_material(
    material_id: str,
    mat_in: MaterialUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    mat = (
        db.query(LearningMaterial)
        .join(Topic, LearningMaterial.topic_id == Topic.id)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(LearningMaterial.id == material_id, Subject.user_id == current_user.id)
        .first()
    )
    if not mat:
        raise HTTPException(status_code=404, detail="Material not found")

    if mat_in.title is not None:
        mat.title = mat_in.title
    if mat_in.markdown_text is not None:
        mat.markdown_text = mat_in.markdown_text
    if mat_in.content_json is not None:
        mat.content_json = mat_in.content_json

    mat.version += 1
    # Mark exercises as potentially outdated if source material changed
    exercises = db.query(Exercise).filter(Exercise.topic_id == mat.topic_id).all()
    # Note: flag is tracked on material level
    mat.is_outdated = False
    mat.updated_at = utc_now()

    db.commit()
    db.refresh(mat)
    return mat

@router.get("/{id}/exercises", response_model=List[ExerciseOut])
def get_topic_exercises(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exercises = (
        db.query(Exercise)
        .join(Topic, Exercise.topic_id == Topic.id)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .order_by(Exercise.created_at.asc())
        .all()
    )
    return exercises

@router.get("/{id}/questions", response_model=List[QuestionOut])
def get_topic_questions(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    questions = (
        db.query(Question)
        .join(Topic, Question.topic_id == Topic.id)
        .join(Unit, Topic.unit_id == Unit.id)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Topic.id == id, Subject.user_id == current_user.id)
        .order_by(Question.mark_category.asc())
        .all()
    )
    return questions

@router.get("/jobs/{job_id}", response_model=GenerationJobOut)
def get_generation_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
