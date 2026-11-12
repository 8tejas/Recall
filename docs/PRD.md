# Product Requirements Document (PRD) — Recall

## 1. Product Summary
**Recall** is an academic-first, syllabus-driven learning and memorization web application. Unlike gamified flashcard or quiz tools, Recall is built for high-stakes university and college curriculum mastery. It enables students to input academic syllabi, decompose them into subjects, units, and topics, selectively generate university-standard study notes, and systematically practice high-fidelity memorization and exam-style written answers.

## 2. Target Audience & Core Use Cases
- **Audience**: University undergraduate and postgraduate students, professional certification candidates, and academic exam takers who must memorize complete definitions, formulas, sequences, and multi-mark theoretical answers.
- **Key Tenet**: Strictly no unnecessary gamification (no coins, streaks, XP, badges, or cartoonish leaderboards). Clean, focused, academic productivity aesthetic inspired by Notion and Linear.

## 3. Product Hierarchy
```
Subject
  └── Units
       └── Topics
            ├── Learning Materials (Comprehensive Notes, Quick Revision, Definitions, Classifications)
            ├── Memorization Exercises (5 distinct cognitive modes)
            ├── Conceptual Exercises (Matching, Sequencing, Scenario, Relations)
            ├── Written-Answer Practice (2-mark, 5-mark, 10-mark exam questions)
            └── Topic Assessment (Weighted distribution of definitions, short, long, conceptual)
```

## 4. Key Features & Specifications

### 4.1 Subject & Syllabus Management
- **Dashboard**: High-level overview of subjects, syllabus completion rate, recently studied topics, and topics requiring spaced revision.
- **Syllabus Parsing**:
  - Accept raw syllabus text (e.g. pasted from university PDF/handout).
  - AI parses text into Subject $\rightarrow$ Units $\rightarrow$ Topics hierarchy.
  - User reviews, edits, reorders, or adds units/topics prior to saving.
  - Zero hallucination: original syllabus wording preserved; no synthetic topics injected silently.
  - Manual single-topic addition without requiring a full syllabus.

### 4.2 Topic Workspace
Every topic is a focused workspace with five dedicated tabs/views:
1. **Study Material**: Comprehensive academic notes, summary notes, definitions, classifications, comparisons, examples.
2. **Memorization**: 5 active cognitive recall modes.
3. **Conceptual Exercises**: Relationships, structure matching, ordering, scenarios.
4. **Written Practice**: 2-mark, 5-mark, and 10-mark exam questions with AI & Self-evaluation.
5. **Topic Assessment**: Full-scope diagnostic exam with scoring and weakness analysis.

### 4.3 Selective Content Generation
- Modular generation: Users choose specific resources to generate (notes, definitions, exercises, questions). No forced bulk generation.
- Caching: Avoid redundant API calls; track content versioning and flag downstream exercises if source notes are modified.
- User Editing: Every piece of generated content can be edited and saved.

### 4.4 Cognitive Memorization Engine (Flagship Feature)
Five specialized exercise modes:
- **Mode A: Progressive Sentence Deletion**: 4 cognitive levels (Level 1: Full text $\rightarrow$ Level 2: Cloze word/phrase deletion $\rightarrow$ Level 3: Key concept scaffolding $\rightarrow$ Level 4: Full blank recall from prompt). Deterministic generation.
- **Mode B: Paragraph Reconstruction**: Hide source paragraph, user reconstructs from memory; automatic diff highlights missing keywords and extraneous or inaccurate assertions.
- **Mode C: Keyword Scaffolding**: Essential technical anchor words provided; student reconstructs cohesive academic explanation with progressive hints.
- **Mode D: Definition Recall**: Term presented; student writes definition from memory; evaluated semantically (not rigid string equality).
- **Mode E: List & Sequence Recall**: Exact ordered steps, architectural tiers, advantages/disadvantages, or categorizations.

### 4.5 Written-Answer Practice
- University exam questions grouped by mark weightage (2-Mark, 5-Mark, 10-Mark).
- Model answer, expected points, essential keywords, and structural breakdown provided.
- **Dual Evaluation System**:
  - **AI Evaluation**: Graded on technical coverage, factual precision, terminology, structure, and missing concepts with constructive feedback and mark award.
  - **Self Evaluation**: Side-by-side comparison with student marking (Completely Remembered, Minor Omissions, Major Omissions, Unable to Answer).

### 4.6 Spaced Repetition & Revision Dashboard
- FSRS/SM-2 inspired scheduling algorithm tracking stability and difficulty.
- Items failed return immediately or within 24 hours; mastered items scale out across expanding review intervals.
- Revision dashboard aggregates all items currently due across all subjects.

## 5. Non-Functional Requirements
- **Security**: JWT-based authentication, password hashing with bcrypt, complete tenant/user isolation, zero exposure of API keys on client.
- **Performance**: Instant UI feedback, optimistic UI updates, streaming or status polling for generation jobs.
- **Reliability**: Graceful fallback for AI rate limits, JSON parsing validation with Pydantic, schema resilience.
- **Design**: Clean, high-readability typography, muted neutral palette, distraction-free reading widths, full responsive support.
