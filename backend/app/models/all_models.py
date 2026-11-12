import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def gen_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    subjects = relationship("Subject", back_populates="user", cascade="all, delete-orphan")
    attempts = relationship("Attempt", back_populates="user", cascade="all, delete-orphan")
    review_schedules = relationship("ReviewSchedule", back_populates="user", cascade="all, delete-orphan")
    assessment_results = relationship("AssessmentResult", back_populates="user", cascade="all, delete-orphan")
    mcq_assessments = relationship("MCQAssessmentResult", back_populates="user", cascade="all, delete-orphan")


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(64), nullable=True)
    description = Column(Text, nullable=True)
    raw_syllabus = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="subjects")
    units = relationship("Unit", back_populates="subject", cascade="all, delete-orphan", order_by="Unit.order_index")


class Unit(Base):
    __tablename__ = "units"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    subject_id = Column(String(36), ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_number = Column(Integer, default=1)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0)

    subject = relationship("Subject", back_populates="units")
    topics = relationship("Topic", back_populates="unit", cascade="all, delete-orphan", order_by="Topic.order_index")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    unit_id = Column(String(36), ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    personal_notes = Column(Text, nullable=True, default="")  # Strictly private user notes, never sent to AI
    order_index = Column(Integer, default=0)
    status = Column(String(32), default="not_started")  # not_started, in_progress, mastered
    created_at = Column(DateTime, default=utc_now)

    unit = relationship("Unit", back_populates="topics")
    learning_materials = relationship("LearningMaterial", back_populates="topic", cascade="all, delete-orphan")
    generation_jobs = relationship("GenerationJob", back_populates="topic", cascade="all, delete-orphan")
    exercises = relationship("Exercise", back_populates="topic", cascade="all, delete-orphan")
    questions = relationship("Question", back_populates="topic", cascade="all, delete-orphan")
    mcq_questions = relationship("MCQQuestion", back_populates="topic", cascade="all, delete-orphan")
    mcq_assessments = relationship("MCQAssessmentResult", back_populates="topic", cascade="all, delete-orphan")


class LearningMaterial(Base):
    __tablename__ = "learning_materials"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    content_type = Column(String(64), nullable=False)
    # Types: comprehensive_notes, quick_revision, definitions, classifications, comparisons, examples
    title = Column(String(255), nullable=False)
    content_json = Column(JSON, nullable=True)
    markdown_text = Column(Text, nullable=False)
    version = Column(Integer, default=1)
    is_outdated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    topic = relationship("Topic", back_populates="learning_materials")


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_type = Column(String(64), nullable=False)
    status = Column(String(32), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    topic = relationship("Topic", back_populates="generation_jobs")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_mode = Column(String(64), nullable=False)
    # progressive_deletion, paragraph_reconstruction, keyword_scaffolding, definition_recall, list_recall, conceptual
    title = Column(String(255), nullable=False)
    payload = Column(JSON, nullable=False)
    # payload contains mode-specific data: original_text, clozes, levels, keywords, items, hints, etc.
    created_at = Column(DateTime, default=utc_now)

    topic = relationship("Topic", back_populates="exercises")
    attempts = relationship("Attempt", back_populates="exercise", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    mark_category = Column(Integer, nullable=False)  # 2, 5, 10
    statement = Column(Text, nullable=False)
    reference_answer = Column(Text, nullable=False)
    essential_keywords = Column(JSON, default=list)
    key_points = Column(JSON, default=list)
    structure_guide = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)

    topic = relationship("Topic", back_populates="questions")
    attempts = relationship("Attempt", back_populates="question", cascade="all, delete-orphan")


class Attempt(Base):
    __tablename__ = "attempts"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    exercise_id = Column(String(36), ForeignKey("exercises.id", ondelete="CASCADE"), nullable=True, index=True)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=True, index=True)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=True, index=True)
    submission_text = Column(Text, nullable=True)
    evaluation_mode = Column(String(32), default="ai")  # ai, self, deterministic
    score = Column(Float, default=0.0)
    max_score = Column(Float, default=1.0)
    performance_rating = Column(String(32), nullable=True)  # completely_remembered, minor_omissions, major_omissions, unable
    feedback_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="attempts")
    exercise = relationship("Exercise", back_populates="attempts")
    question = relationship("Question", back_populates="attempts")


class ReviewSchedule(Base):
    __tablename__ = "review_schedules"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    item_type = Column(String(32), nullable=False)  # exercise, question, topic
    item_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    topic_id = Column(String(36), nullable=True, index=True)
    topic_title = Column(String(255), nullable=True)
    subject_title = Column(String(255), nullable=True)
    stability = Column(Float, default=1.0)
    difficulty = Column(Float, default=5.0)
    reps = Column(Integer, default=0)
    lapses = Column(Integer, default=0)
    last_reviewed = Column(DateTime, nullable=True)
    due_date = Column(DateTime, default=utc_now, index=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="review_schedules")


class AssessmentResult(Base):
    __tablename__ = "assessment_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score_percentage = Column(Float, default=0.0)
    total_questions = Column(Integer, default=0)
    attempted_questions = Column(Integer, default=0)
    breakdown_json = Column(JSON, default=dict)
    weak_areas = Column(JSON, default=list)
    recommended_revision = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="assessment_results")


class MCQQuestion(Base):
    __tablename__ = "mcq_questions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of {"id": "A", "text": "..."}
    correct_option_id = Column(String(8), nullable=False)  # "A", "B", "C", "D"
    explanation = Column(Text, nullable=False)
    difficulty = Column(String(32), default="medium")
    created_at = Column(DateTime, default=utc_now)

    topic = relationship("Topic", back_populates="mcq_questions")


class MCQAssessmentResult(Base):
    __tablename__ = "mcq_assessment_results"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    topic_id = Column(String(36), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    score_percentage = Column(Float, default=0.0)
    total_questions = Column(Integer, default=0)
    correct_count = Column(Integer, default=0)
    answers_json = Column(JSON, default=dict)  # {"question_id": "A", ...}
    detailed_feedback = Column(JSON, default=list)  # list of feedback dicts
    created_at = Column(DateTime, default=utc_now)

    topic = relationship("Topic", back_populates="mcq_assessments")
    user = relationship("User", back_populates="mcq_assessments")
