from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.all_models import User, Subject, Unit, Topic
from backend.app.schemas.all_schemas import (
    SubjectCreate,
    SubjectUpdate,
    SubjectOut,
    SubjectDetailOut,
    UnitCreate,
    UnitUpdate,
    UnitOut,
    TopicCreate,
    TopicOut,
    SyllabusParseRequest,
    ParsedSyllabus,
    SyllabusSaveRequest,
)
from backend.app.services.ai_provider import get_ai_provider

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.get("", response_model=List[SubjectOut])
def list_subjects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subjects = db.query(Subject).filter(Subject.user_id == current_user.id).order_by(Subject.created_at.desc()).all()
    results = []
    for s in subjects:
        # Calculate topic progress
        topics = (
            db.query(Topic)
            .join(Unit, Topic.unit_id == Unit.id)
            .filter(Unit.subject_id == s.id)
            .all()
        )
        total = len(topics)
        mastered = sum(1 for t in topics if t.status == "mastered")
        in_progress = sum(1 for t in topics if t.status == "in_progress")
        
        subj_dict = {
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "description": s.description,
            "raw_syllabus": s.raw_syllabus,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
            "total_topics": total,
            "mastered_topics": mastered,
            "in_progress_topics": in_progress,
        }
        results.append(SubjectOut(**subj_dict))
    return results

@router.post("", response_model=SubjectDetailOut)
def create_subject(
    subj_in: SubjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = Subject(
        user_id=current_user.id,
        name=subj_in.name,
        code=subj_in.code,
        description=subj_in.description,
        raw_syllabus=subj_in.raw_syllabus
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

@router.post("/parse-syllabus", response_model=ParsedSyllabus)
async def parse_syllabus(
    req: SyllabusParseRequest,
    current_user: User = Depends(get_current_user)
):
    if not req.raw_syllabus.strip():
        raise HTTPException(status_code=400, detail="Syllabus text cannot be empty.")
    ai = get_ai_provider()
    parsed = await ai.parse_syllabus(req.raw_syllabus)
    return ParsedSyllabus(**parsed)

@router.post("/{id}/syllabus", response_model=SubjectDetailOut)
def apply_syllabus_to_subject(
    id: str,
    req: SyllabusSaveRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if req.subject_name:
        subject.name = req.subject_name
    if req.code:
        subject.code = req.code
    if req.description:
        subject.description = req.description

    # Clear existing units if re-parsing or overwriting
    existing_units = db.query(Unit).filter(Unit.subject_id == subject.id).all()
    for u in existing_units:
        db.delete(u)
    db.flush()

    for u_idx, u_data in enumerate(req.units):
        unit = Unit(
            subject_id=subject.id,
            unit_number=u_data.unit_number or (u_idx + 1),
            title=u_data.title,
            description=u_data.description,
            order_index=u_idx
        )
        db.add(unit)
        db.flush()

        for t_idx, t_data in enumerate(u_data.topics):
            topic = Topic(
                unit_id=unit.id,
                title=t_data.title,
                description=t_data.description,
                order_index=t_idx,
                status="not_started"
            )
            db.add(topic)

    db.commit()
    db.refresh(subject)
    return subject

@router.get("/{id}", response_model=SubjectDetailOut)
def get_subject(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.put("/{id}", response_model=SubjectDetailOut)
def update_subject(
    id: str,
    subj_in: SubjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    if subj_in.name is not None:
        subject.name = subj_in.name
    if subj_in.code is not None:
        subject.code = subj_in.code
    if subj_in.description is not None:
        subject.description = subj_in.description

    db.commit()
    db.refresh(subject)
    return subject

@router.delete("/{id}")
def delete_subject(
    id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}

# Manual Unit Management
@router.post("/{id}/units", response_model=UnitOut)
def create_unit(
    id: str,
    unit_in: UnitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    subject = db.query(Subject).filter(Subject.id == id, Subject.user_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    unit = Unit(
        subject_id=subject.id,
        unit_number=unit_in.unit_number,
        title=unit_in.title,
        description=unit_in.description,
        order_index=unit_in.order_index or 0
    )
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit

@router.put("/units/{unit_id}", response_model=UnitOut)
def update_unit(
    unit_id: str,
    unit_in: UnitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = (
        db.query(Unit)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Unit.id == unit_id, Subject.user_id == current_user.id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    if unit_in.title is not None:
        unit.title = unit_in.title
    if unit_in.description is not None:
        unit.description = unit_in.description
    if unit_in.unit_number is not None:
        unit.unit_number = unit_in.unit_number
    if unit_in.order_index is not None:
        unit.order_index = unit_in.order_index

    db.commit()
    db.refresh(unit)
    return unit

@router.delete("/units/{unit_id}")
def delete_unit(
    unit_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = (
        db.query(Unit)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Unit.id == unit_id, Subject.user_id == current_user.id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    db.delete(unit)
    db.commit()
    return {"message": "Unit deleted successfully"}

# Manual Single Topic Creation
@router.post("/units/{unit_id}/topics", response_model=TopicOut)
def create_single_topic(
    unit_id: str,
    topic_in: TopicCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    unit = (
        db.query(Unit)
        .join(Subject, Unit.subject_id == Subject.id)
        .filter(Unit.id == unit_id, Subject.user_id == current_user.id)
        .first()
    )
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    topic = Topic(
        unit_id=unit.id,
        title=topic_in.title,
        description=topic_in.description,
        order_index=topic_in.order_index or 0,
        status="not_started"
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return topic
