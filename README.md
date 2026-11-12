# Recall — Syllabus-Driven Academic Learning & Memorization Platform

Recall is an academic-first web application designed for high-stakes university curriculum mastery. Unlike gamified flashcard or quiz apps, Recall is engineered specifically to help students decompose university syllabi into subjects, units, and topics, selectively generate rigorous academic materials, systematically memorize complete definitions and theoretical explanations, and reproduce structured answers in university examinations.

> **Key Tenet**: Strictly no superficial gamification (no XP, coins, streaks, leaderboards, or excessive badges). Minimalist, high-focus productivity design inspired by Notion and Linear.

---

## 🏛 Product Hierarchy

```
Subject
  └── Units
       └── Topics
            ├── A. Study Material (Comprehensive Notes, Quick Revision, Definitions, Classifications, Comparisons, Examples)
            ├── B. Cognitive Memorization Engine (5 Academic Recall Modes)
            ├── C. Conceptual Exercises (Relationship analyses, step ordering, structural mappings)
            ├── D. Written-Answer Practice (2-mark, 5-mark, and 10-mark exam questions with AI & Self-evaluation)
            └── E. Topic Assessment (Diagnostic exam with configurable distribution and gap analysis)
```

---

## 🧠 Cognitive Memorization Engine (Flagship Feature)

Recall does **not** rely on multiple-choice quizzes or basic two-sided flashcards. Instead, it provides 5 cognitive recall modes:

1. **Mode A: Progressive Sentence Deletion**:
   - Takes a complete definition or theorem and progressively hides content through 4 cognitive tiers:
     - **Tier 1**: Initial study & anchor reading.
     - **Tier 2**: Deterministic cloze deletion (25-35% high-value content words masked as interactive blanks `______`).
     - **Tier 3**: Keyword scaffolding (technical anchor terms displayed; student reconstructs the full sentence).
     - **Tier 4**: Complete independent reproduction from prompt without hints.
   - Evaluated deterministically in Python without relying on slow or non-deterministic API calls for basic masking.

2. **Mode B: Paragraph Reconstruction**:
   - Prompt shown, reference paragraph hidden.
   - Student reconstructs the full theoretical paragraph from memory.
   - The engine performs semantic keyword coverage and n-gram diffing to highlight missing technical concepts, verified terms, and extraneous assertions.

3. **Mode C: Keyword Scaffolding**:
   - Displays 5-8 essential domain terms.
   - Allows progressive hints to be revealed (structural clues $\rightarrow$ full form).
   - Student writes out a complete, cohesive academic explanation.

4. **Mode D: Definition Recall**:
   - Presents a formal academic term.
   - Evaluates genus (category) and specific difference (essential attributes) semantically rather than requiring strict character-for-character equality.

5. **Mode E: List & Sequence Recall**:
   - Practice remembering architecture layers (e.g. OSI model), algorithm stages, or classifications.
   - Evaluates sequence positioning distance (Levenshtein order distance) and completeness.

---

## ✍️ Written-Answer Practice & University Examination Grading

- University questions categorized by standard mark weightage:
  - **2-Mark Questions**: Concise definitions or state-a-principle questions (2-3 sentences expected).
  - **5-Mark Questions**: Structured explanations with 4-5 key points, working mechanism, and diagrams (150-250 words).
  - **10-Mark Questions**: Comprehensive essay questions requiring deep architecture breakdown, comparison tables, and critical analysis (400-600 words).
- **Dual Evaluation System**:
  - **Mode A: AI Evaluation**: Evaluates factual correctness, expected marking points, missing concepts, technical vocabulary, and structure, awarding an estimated mark out of 2, 5, or 10.
  - **Mode B: Self Evaluation**: Displays model answer alongside examiner expected points, allowing the student to grade their performance (*Completely Remembered*, *Minor Omissions*, *Major Omissions*, *Unable to Answer*).

---

## 🔁 Spaced Repetition (FSRS Engine)

- Powered by an FSRS / SM-2 inspired algorithm tracking item stability, difficulty, repetitions, and lapses.
- Items recalled with difficulty or lapses return within 4 to 24 hours.
- Mastered items scale out into expanding review intervals.
- A centralized **Spaced Revision Queue** (`/revision`) aggregates all overdue items across all enrolled subjects.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router v7, Lucide React.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, python-jose, passlib (bcrypt).
- **Database**: PostgreSQL (with Supabase compatibility via `DATABASE_URL`, and SQLite fallback for local development).
- **AI Provider**: Groq API (`groq` async SDK) supporting `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, or `llama-3.3-70b-versatile` with response format JSON mode and an extensible `AIProviderInterface` with an offline deterministic academic fallback provider.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend

# Create .env from template
cp ../.env.example ../.env

# (Optional) If using PostgreSQL / Supabase, set DATABASE_URL in .env:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/recall_db

# Run database migrations
alembic upgrade head

# Run backend server (starts on http://localhost:8000)
python run.py
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies (already installed in workspace)
npm install

# Start Vite dev server with proxy to backend (http://localhost:5173)
npm run dev
```

### 4. Running Integration Tests
```bash
python backend/tests_e2e.py
```

---

## 🔑 Environment Variables (`.env`)

```ini
ENVIRONMENT=development
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# Database (PostgreSQL / Supabase / SQLite)
DATABASE_URL=sqlite:///./recall.db

# Groq AI Provider
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
GROQ_LIGHT_MODEL=openai/gpt-oss-20b
```

---

## 📁 Repository Structure

```
recall/
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/routes/         # REST API routers (auth, subjects, topics, exercises, revision, assessments)
│   │   ├── core/               # config, database session, JWT security
│   │   ├── models/             # SQLAlchemy 2.0 declarative models
│   │   ├── schemas/            # Pydantic v2 schemas
│   │   ├── services/           # ai_provider, memorization_engine, fsrs_scheduler
│   │   ├── prompts/            # Academic prompt templates
│   │   └── main.py             # FastAPI app with CORS & lifecycle
│   ├── requirements.txt
│   ├── run.py
│   └── tests_e2e.py            # End-to-end integration test suite
├── frontend/
│   ├── src/
│   │   ├── api/                # Typed Axios client
│   │   ├── components/         # Reusable UI & Memorization mode components
│   │   │   ├── layout/         # AppLayout sidebar & navigation
│   │   │   ├── memorization/   # Modes A through E views
│   │   │   ├── practice/       # Written practice (2m, 5m, 10m)
│   │   │   └── workspace/      # Notes & Assessment components
│   │   ├── pages/              # Dashboard, NewSubject, SubjectDetail, TopicWorkspace, Revision, Settings
│   │   ├── store/              # Zustand auth & topic stores
│   │   └── types/              # Domain interfaces
│   ├── vite.config.ts
│   └── package.json
├── docs/
│   ├── PRD.md                  # Complete Product Requirements Document
│   └── ARCHITECTURE.md         # System Architecture & Database Schema
├── README.md
└── .gitignore
```

