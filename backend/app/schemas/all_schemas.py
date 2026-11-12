from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# ----------------- Auth Schemas -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = "Student"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# ----------------- Syllabus & Hierarchy Schemas -----------------
class ParsedTopicItem(BaseModel):
    title: str
    description: Optional[str] = ""

class ParsedUnitItem(BaseModel):
    unit_number: int
    title: str
    description: Optional[str] = ""
    topics: List[ParsedTopicItem] = []

class ParsedSyllabus(BaseModel):
    subject_name: str
    code: Optional[str] = ""
    description: Optional[str] = ""
    units: List[ParsedUnitItem] = []

class SyllabusParseRequest(BaseModel):
    raw_syllabus: str

class SyllabusSaveRequest(BaseModel):
    subject_name: str
    code: Optional[str] = ""
    description: Optional[str] = ""
    units: List[ParsedUnitItem]

# ----------------- Subject & Topic CRUD Schemas -----------------
class TopicCreate(BaseModel):
    unit_id: str
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 0

class TopicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    status: Optional[str] = None
    personal_notes: Optional[str] = None

class TopicOut(BaseModel):
    id: str
    unit_id: str
    title: str
    description: Optional[str] = None
    personal_notes: Optional[str] = ""
    order_index: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class UnitCreate(BaseModel):
    subject_id: str
    unit_number: int
    title: str
    description: Optional[str] = None
    order_index: Optional[int] = 0

class UnitUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    unit_number: Optional[int] = None
    order_index: Optional[int] = None

class UnitOut(BaseModel):
    id: str
    subject_id: str
    unit_number: int
    title: str
    description: Optional[str] = None
    order_index: int
    topics: List[TopicOut] = []

    class Config:
        from_attributes = True

class SubjectCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    raw_syllabus: Optional[str] = None

class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None

class SubjectOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    raw_syllabus: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_topics: int = 0
    mastered_topics: int = 0
    in_progress_topics: int = 0

    class Config:
        from_attributes = True

class SubjectDetailOut(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    raw_syllabus: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    units: List[UnitOut] = []

    class Config:
        from_attributes = True

# ----------------- Learning Material Schemas -----------------
class MaterialGenerateRequest(BaseModel):
    resource_type: str = Field(
        ...,
        description="comprehensive_notes, quick_revision, definitions, classifications, comparisons, examples, memorization_exercises, conceptual_exercises, written_questions, topic_assessment"
    )
    custom_focus: Optional[str] = None

class MaterialUpdate(BaseModel):
    title: Optional[str] = None
    markdown_text: Optional[str] = None
    content_json: Optional[Dict[str, Any]] = None

class MaterialOut(BaseModel):
    id: str
    topic_id: str
    content_type: str
    title: str
    markdown_text: str
    content_json: Optional[Dict[str, Any]] = None
    version: int
    is_outdated: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GenerationJobOut(BaseModel):
    id: str
    topic_id: str
    resource_type: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Memorization Exercise Schemas -----------------
class ClozeToken(BaseModel):
    index: int
    text: str
    is_cloze: bool
    cloze_index: Optional[int] = None
    hint: Optional[str] = None

class ProgressiveDeletionPayload(BaseModel):
    original_text: str
    source_term: Optional[str] = None
    level1_text: str
    level2_cloze_tokens: List[ClozeToken] = []
    level2_masked_text: str
    level3_keywords: List[str] = []
    level4_prompt: str

class ParagraphReconstructionPayload(BaseModel):
    title: str
    reference_text: str
    context: Optional[str] = None
    essential_keywords: List[str] = []

class KeywordScaffoldingPayload(BaseModel):
    concept_title: str
    reference_explanation: str
    scaffolding_keywords: List[str]
    hint_levels: List[str] = []

class DefinitionRecallPayload(BaseModel):
    term: str
    reference_definition: str
    category_genus: Optional[str] = None
    essential_attributes: List[str] = []

class ListSequencePayload(BaseModel):
    list_title: str
    is_ordered: bool = True
    items: List[str]
    descriptions: Optional[List[str]] = None

class ExerciseOut(BaseModel):
    id: str
    topic_id: str
    exercise_mode: str
    title: str
    payload: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class ExerciseAttemptRequest(BaseModel):
    submission_text: Optional[str] = None
    performance_rating: Optional[str] = None  # completely_remembered, minor_omissions, major_omissions, unable
    score: Optional[float] = None
    level_completed: Optional[int] = None

class ExerciseAttemptOut(BaseModel):
    id: str
    exercise_id: str
    evaluation_mode: str
    score: float
    max_score: float
    performance_rating: Optional[str] = None
    feedback_json: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Written-Answer Practice Schemas -----------------
class QuestionOut(BaseModel):
    id: str
    topic_id: str
    mark_category: int
    statement: str
    reference_answer: str
    essential_keywords: List[str] = []
    key_points: List[str] = []
    structure_guide: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True

class WrittenSubmissionRequest(BaseModel):
    submission_text: str

class SelfEvaluationRequest(BaseModel):
    submission_text: str
    performance_rating: str  # completely_remembered, minor_omissions, major_omissions, unable

class AnswerEvaluationOut(BaseModel):
    attempt_id: str
    question_id: str
    estimated_marks: float
    maximum_marks: float
    correct_points: List[str] = []
    missing_points: List[str] = []
    incorrect_information: List[str] = []
    terminology_assessment: str
    structure_assessment: str
    improvement_suggestions: List[str] = []

# ----------------- Spaced Repetition / Revision Schemas -----------------
class RevisionItemOut(BaseModel):
    schedule_id: str
    item_type: str
    item_id: str
    title: str
    topic_id: Optional[str] = None
    topic_title: Optional[str] = None
    subject_title: Optional[str] = None
    stability: float
    difficulty: float
    reps: int
    lapses: int
    due_date: datetime
    is_overdue: bool

class RevisionReviewRequest(BaseModel):
    performance_rating: str  # completely_remembered, minor_omissions, major_omissions, unable (or grade 0..3)

# ----------------- Assessment Schemas -----------------
class TopicAssessmentRequest(BaseModel):
    distribution: Optional[Dict[str, int]] = {
        "definitions": 20,
        "short_answer": 30,
        "long_answer": 30,
        "conceptual": 20
    }

class AssessmentSubmissionItem(BaseModel):
    item_id: str
    item_type: str  # definition, short, long, conceptual
    user_answer: str

class AssessmentSubmitRequest(BaseModel):
    answers: List[AssessmentSubmissionItem]

class AssessmentResultOut(BaseModel):
    id: str
    topic_id: str
    score_percentage: float
    total_questions: int
    attempted_questions: int
    breakdown: Dict[str, Any]
    weak_areas: List[str]
    recommended_revision: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Personal Notes Schemas -----------------
class PersonalNotesUpdate(BaseModel):
    personal_notes: str

class PersonalNotesAppend(BaseModel):
    note_to_append: str

class PersonalNotesOut(BaseModel):
    topic_id: str
    personal_notes: str

# ----------------- MCQ Schemas -----------------
class MCQOption(BaseModel):
    id: str  # "A", "B", "C", "D"
    text: str

class MCQItem(BaseModel):
    question: str
    options: List[MCQOption]
    correct_option_id: str  # "A", "B", "C", "D"
    explanation: str
    difficulty: Optional[str] = "medium"

class MCQQuestionOut(BaseModel):
    id: str
    topic_id: str
    question_text: str
    options: List[MCQOption]
    correct_option_id: Optional[str] = None
    explanation: Optional[str] = None
    difficulty: str
    created_at: datetime

    class Config:
        from_attributes = True

class MCQGenerateRequest(BaseModel):
    num_questions: Optional[int] = 5

class MCQSubmissionItem(BaseModel):
    question_id: str
    selected_option_id: str

class MCQSubmitRequest(BaseModel):
    answers: List[MCQSubmissionItem]

class MCQQuestionFeedback(BaseModel):
    question_id: str
    question_text: str
    options: List[MCQOption]
    selected_option_id: str
    correct_option_id: str
    is_correct: bool
    explanation: str

class MCQAssessmentResultOut(BaseModel):
    id: str
    topic_id: str
    score_percentage: float
    total_questions: int
    correct_count: int
    detailed_feedback: List[MCQQuestionFeedback]
    created_at: datetime

    class Config:
        from_attributes = True
