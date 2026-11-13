"""
Flow Diagram routes — AI-scaffolded architecture/flow memorization diagrams.
GET  /api/topics/{topic_id}/flow-diagrams        — list saved diagrams
POST /api/topics/{topic_id}/flow-diagrams/generate — AI-generate and save
PUT  /api/topics/{topic_id}/flow-diagrams/{diagram_id} — save edits
DELETE /api/topics/{topic_id}/flow-diagrams/{diagram_id} — delete
"""
import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.all_models import FlowDiagram, Topic, LearningMaterial, User
from backend.app.schemas.all_schemas import (
    FlowDiagramGenerateRequest,
    FlowDiagramSaveRequest,
    FlowDiagramOut,
)
from backend.app.services.ai_provider import get_ai_provider

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_topic_or_404(topic_id: str, user: User, db: Session) -> Topic:
    topic = db.query(Topic).join(Topic.unit).join(Topic.unit.property.mapper.class_.subject).filter(
        Topic.id == topic_id
    ).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.get("/topics/{topic_id}/flow-diagrams", response_model=list[FlowDiagramOut])
async def list_flow_diagrams(
    topic_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diagrams = (
        db.query(FlowDiagram)
        .filter(FlowDiagram.topic_id == topic_id, FlowDiagram.user_id == current_user.id)
        .order_by(FlowDiagram.created_at.asc())
        .all()
    )
    return diagrams


@router.post("/topics/{topic_id}/flow-diagrams/generate", response_model=FlowDiagramOut)
async def generate_flow_diagram(
    topic_id: str,
    body: FlowDiagramGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fetch topic info for context
    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Build subject/unit context
    subject_context = ""
    unit_context = ""
    try:
        unit_context = topic.unit.title if topic.unit else ""
        subject_context = topic.unit.subject.name if topic.unit and topic.unit.subject else ""
    except Exception:
        pass

    # Optional: use learning material as supplementary context
    source_text = None
    mat = (
        db.query(LearningMaterial)
        .filter(LearningMaterial.topic_id == topic_id)
        .order_by(LearningMaterial.created_at.desc())
        .first()
    )
    if mat:
        source_text = mat.markdown_text[:2000]

    ai = get_ai_provider()
    try:
        result = await ai.generate_flow_diagram(
            prompt=body.prompt,
            topic_title=topic.title,
            subject_context=subject_context,
        )
    except Exception as e:
        logger.error(f"Flow diagram generation failed: {e}")
        raise HTTPException(status_code=500, detail="AI generation failed. Please try again.")

    diagram = FlowDiagram(
        topic_id=topic_id,
        user_id=current_user.id,
        name=body.name,
        prompt=body.prompt,
        nodes_json=json.dumps(result.get("nodes", [])),
        edges_json=json.dumps(result.get("edges", [])),
    )
    db.add(diagram)
    db.commit()
    db.refresh(diagram)
    return diagram


@router.put("/topics/{topic_id}/flow-diagrams/{diagram_id}", response_model=FlowDiagramOut)
async def save_flow_diagram(
    topic_id: str,
    diagram_id: str,
    body: FlowDiagramSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diagram = db.query(FlowDiagram).filter(
        FlowDiagram.id == diagram_id,
        FlowDiagram.topic_id == topic_id,
        FlowDiagram.user_id == current_user.id,
    ).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")

    if body.name is not None:
        diagram.name = body.name
    diagram.nodes_json = body.nodes_json
    diagram.edges_json = body.edges_json
    db.commit()
    db.refresh(diagram)
    return diagram


@router.delete("/topics/{topic_id}/flow-diagrams/{diagram_id}", status_code=204)
async def delete_flow_diagram(
    topic_id: str,
    diagram_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    diagram = db.query(FlowDiagram).filter(
        FlowDiagram.id == diagram_id,
        FlowDiagram.topic_id == topic_id,
        FlowDiagram.user_id == current_user.id,
    ).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    db.delete(diagram)
    db.commit()
