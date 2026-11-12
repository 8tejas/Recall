# Architecture & System Design — Recall

## 1. System Overview
Recall is a monolithic monorepo structured into:
- `backend/`: FastAPI Python application handling REST APIs, authentication, database persistence via SQLAlchemy 2.0 & Alembic, deterministic cloze generation algorithms, spaced repetition scheduling, and an extensible AI Provider abstraction (Groq, with future Gemini / OpenAI pluggability).
- `frontend/`: React 18+ with TypeScript, Vite, Tailwind CSS, Zustand, React Router, and Lucide React icons.
- `docs/`: Product Requirements Document and Architecture blueprints.

```
recall/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # subjects, topics, generation, exercises, questions, revision, auth
│   │   ├── core/                # config, security, database session
│   │   ├── models/              # SQLAlchemy declarative models (UUID primary keys, JSONB)
│   │   ├── schemas/             # Pydantic v2 validation models
│   │   ├── services/            # ai_provider, memorization_engine, fsrs_scheduler, syllabus_parser
│   │   └── prompts/             # Academic prompt templates
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── api/                 # Axios / fetch client with interceptors
│   │   ├── components/          # Reusable UI primitives (Sidebar, Card, Tabs, Modal, DiffViewer)
│   │   ├── features/            # Feature domains: subjects, syllabus, workspace, memorization, practice
│   │   ├── store/               # Zustand stores (authStore, topicStore, exerciseStore)
│   │   ├── types/               # TypeScript domain interfaces
│   │   └── pages/               # Route views (/dashboard, /topics/:id, etc.)
│   ├── index.html
│   ├── vite.config.ts
│   └── tailwind.config.js
├── docs/
│   ├── PRD.md
│   └── ARCHITECTURE.md
├── README.md
└── .gitignore
```

## 2. Database Schema Design (PostgreSQL / Supabase compatible)

### Entities:
1. **users**: `id` (UUID), `email`, `hashed_password`, `name`, `created_at`, `updated_at`.
2. **subjects**: `id` (UUID), `user_id` (FK $\rightarrow$ users), `name`, `code`, `description`, `raw_syllabus`, `created_at`, `updated_at`.
3. **units**: `id` (UUID), `subject_id` (FK $\rightarrow$ subjects), `unit_number` (int), `title`, `description`, `order_index`.
4. **topics**: `id` (UUID), `unit_id` (FK $\rightarrow$ units), `title`, `description`, `order_index`, `status` (not_started, in_progress, mastered), `created_at`.
5. **learning_materials**: `id` (UUID), `topic_id` (FK $\rightarrow$ topics), `content_type` (`comprehensive_notes`, `quick_revision`, `definitions`, `classifications`, `comparisons`, `examples`), `title`, `content_json` (JSONB), `markdown_text`, `version` (int), `is_outdated` (bool), `updated_at`.
6. **generation_jobs**: `id` (UUID), `topic_id` (FK $\rightarrow$ topics), `resource_type`, `status` (`pending`, `processing`, `completed`, `failed`), `error_message`, `created_at`.
7. **exercises**: `id` (UUID), `topic_id` (FK $\rightarrow$ topics), `exercise_mode` (`progressive_deletion`, `paragraph_reconstruction`, `keyword_scaffolding`, `definition_recall`, `list_recall`, `conceptual`), `title`, `payload` (JSONB with original text, clozes, keywords, ordered items), `created_at`.
8. **questions**: `id` (UUID), `topic_id` (FK $\rightarrow$ topics), `mark_category` (2, 5, 10), `statement`, `reference_answer`, `essential_keywords` (JSONB list), `key_points` (JSONB list), `structure_guide` (JSONB list).
9. **attempts**: `id` (UUID), `user_id` (FK $\rightarrow$ users), `exercise_id` (FK $\rightarrow$ exercises, optional), `question_id` (FK $\rightarrow$ questions, optional), `submission_text`, `evaluation_mode` (`ai`, `self`), `score` (float), `max_score` (float), `feedback_json` (JSONB), `created_at`.
10. **review_schedules**: `id` (UUID), `user_id` (FK $\rightarrow$ users), `item_type` (`exercise`, `topic`, `question`), `item_id` (UUID), `stability` (float), `difficulty` (float), `reps` (int), `lapses` (int), `last_reviewed`, `due_date`, `created_at`.
11. **assessment_results**: `id` (UUID), `topic_id` (FK $\rightarrow$ topics), `user_id` (FK $\rightarrow$ users), `score_percentage` (float), `breakdown_json` (JSONB), `weak_areas` (JSONB), `created_at`.

## 3. AI Service Architecture
The backend abstracts the AI provider behind a common protocol `AIProviderInterface`:
```python
class AIProvider(ABC):
    @abstractmethod
    async def parse_syllabus(self, raw_text: str) -> ParsedSyllabusSchema: ...
    @abstractmethod
    async def generate_study_notes(self, topic_title: str, unit_context: str, subject_context: str, material_type: str) -> StudyMaterialSchema: ...
    @abstractmethod
    async def generate_memorization_items(self, topic_title: str, source_text: str) -> MemorizationContentSchema: ...
    @abstractmethod
    async def generate_exam_questions(self, topic_title: str, source_text: str) -> List[ExamQuestionSchema]: ...
    @abstractmethod
    async def evaluate_written_answer(self, question: ExamQuestionSchema, student_answer: str) -> AnswerEvaluationSchema: ...
    @abstractmethod
    async def evaluate_definition(self, term: str, reference: str, student_answer: str) -> DefinitionEvaluationSchema: ...
```

- **Groq Implementation**: Uses Groq SDK (`groq` package) with model default `openai/gpt-oss-120b` (or `llama-3.3-70b-versatile` / `openai/gpt-oss-20b`), response format `{"type": "json_object"}`.
- **Resilience**: Exponential backoff, timeout handling, strict Pydantic JSON schema validation. If API key is unconfigured or rate limited, a fallback local intelligent parser/evaluator is provided to ensure developer usability without breaking the application.

## 4. Memorization Engine Mechanics
1. **Progressive Sentence Deletion**:
   - Python deterministic algorithm parses sentences, identifies POS/key terminology (noun phrases, verbs, adjectives).
   - Generates 4 discrete cognitive tiers: Level 1 (Full Study), Level 2 (20-40% masked cloze), Level 3 (Keyword scaffolding anchor nodes), Level 4 (Prompt with blank reproduction).
2. **Paragraph Reconstruction**:
   - Token & ngram set comparison + semantic keyword coverage metrics. Computes missed core terminology and highlights differences.
3. **Keyword Scaffolding**:
   - Progressive hint revealing: Level 1 (Keywords only), Level 2 (Sentence structure frames), Level 3 (Full reference preview).
4. **Definition Semantic Evaluation**:
   - Evaluates genus and differentia (core concept classification + distinct characteristics).
5. **List & Sequence Recall**:
   - Compares Levenshtein ordering distance and set completeness for academic lists (e.g., OSI model layers, ACID properties, classification types).

## 5. Spaced Repetition Engine (FSRS-inspired)
- Interval calculation based on recall outcome (0: Complete Lapse, 1: Major Difficulty, 2: Minor Flaw, 3: Perfect Recall).
- Formula: $I_{new} = I \times \text{Factor}(\text{Difficulty, Stability})$.
- Daily revision queue collects items where `due_date <= now()`.
