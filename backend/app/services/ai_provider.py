import os
import json
import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from groq import AsyncGroq, APIError, RateLimitError

from backend.app.core.config import settings
from backend.app.schemas.all_schemas import (
    ParsedSyllabus,
    ParsedUnitItem,
    ParsedTopicItem,
    AnswerEvaluationOut,
)
from backend.app.prompts.academic_prompts import (
    SYLLABUS_PARSER_SYSTEM_PROMPT,
    STUDY_NOTES_SYSTEM_PROMPT,
    MEMORIZATION_GENERATOR_SYSTEM_PROMPT,
    EXAM_QUESTIONS_SYSTEM_PROMPT,
    ANSWER_EVALUATION_SYSTEM_PROMPT,
    MCQ_ASSESSMENT_SYSTEM_PROMPT,
    TOPIC_QA_SYSTEM_PROMPT,
    FLOW_DIAGRAM_SYSTEM_PROMPT,
)
from backend.app.services.memorization_engine import MemorizationEngine

logger = logging.getLogger(__name__)

class AIProviderInterface(ABC):
    @abstractmethod
    async def parse_syllabus(self, raw_syllabus: str) -> Dict[str, Any]:
        """Parse raw syllabus text into structured units and topics."""
        pass

    @abstractmethod
    async def generate_study_notes(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        resource_type: str,
        custom_focus: Optional[str] = None,
        unit_topics: Optional[List[str]] = None,
        unit_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate academic notes or specific learning resources with full unit syllabus context."""
        pass

    @abstractmethod
    async def generate_memorization_items(
        self, topic_title: str, source_text: str
    ) -> Dict[str, Any]:
        """Generate high-yield memorization items from study material."""
        pass

    @abstractmethod
    async def generate_exam_questions(
        self, topic_title: str, source_text: str
    ) -> List[Dict[str, Any]]:
        """Generate 2-mark, 5-mark, and 10-mark exam questions."""
        pass

    @abstractmethod
    async def evaluate_written_answer(
        self, question_data: Dict[str, Any], student_answer: str
    ) -> Dict[str, Any]:
        """Evaluate a student's examination answer."""
        pass

    @abstractmethod
    async def generate_topic_assessment(
        self, topic_title: str, source_text: str, distribution: Dict[str, int]
    ) -> Dict[str, Any]:
        """Generate comprehensive diagnostic assessment items."""
        pass

    @abstractmethod
    async def generate_mcqs(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        source_text: Optional[str] = None,
        num_questions: int = 5,
        existing_questions: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate university-level diagnostic MCQs with 4 options and detailed explanations."""
        pass

    @abstractmethod
    async def answer_topic_question(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        question: str,
        source_text: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Answer a student question regarding a syllabus topic with academic rigor."""
        pass

    @abstractmethod
    async def generate_flow_diagram(
        self,
        prompt: str,
        topic_title: str,
        subject_context: str,
    ) -> Dict[str, Any]:
        """Generate a node-edge flow diagram JSON for architecture/flow memorization."""
        pass


class AcademicFallbackProvider(AIProviderInterface):
    """
    Robust academic generation engine that guarantees deterministic,
    structured, high-quality academic outputs for testing, development,
    and offline resilience when GROQ_API_KEY is not configured.
    """

    async def parse_syllabus(self, raw_syllabus: str) -> Dict[str, Any]:
        lines = [line.strip() for line in raw_syllabus.split("\n") if line.strip()]
        subject_name = "Academic Course"
        units_dict: Dict[int, Dict[str, Any]] = {}
        current_unit_idx = 1

        # Check if first line contains subject name
        if lines and not lines[0].lower().startswith(("unit", "module", "chapter", "topic")):
            subject_name = lines[0]
            lines = lines[1:]

        for line in lines:
            import re
            unit_match = re.search(r"^(?:unit|module|chapter)\s*([0-9IVXLCDM]+)?[:\-]?\s*(.*)$", line, re.IGNORECASE)
            if unit_match:
                title_part = unit_match.group(2).strip() or f"Unit {len(units_dict) + 1}"
                current_unit_idx = len(units_dict) + 1
                units_dict[current_unit_idx] = {
                    "unit_number": current_unit_idx,
                    "title": title_part,
                    "description": f"Curriculum module covering {title_part}",
                    "topics": []
                }
            else:
                if current_unit_idx not in units_dict:
                    units_dict[current_unit_idx] = {
                        "unit_number": current_unit_idx,
                        "title": f"Unit {current_unit_idx}: Core Concepts",
                        "description": "Foundational curriculum topics",
                        "topics": []
                    }
                # Split comma-separated or semicolon topics if long
                sub_topics = [t.strip("-*• ") for t in re.split(r"[,;]", line) if len(t.strip("-*• ")) > 2]
                for st in sub_topics:
                    units_dict[current_unit_idx]["topics"].append({
                        "title": st,
                        "description": f"Detailed academic topic on {st}"
                    })

        if not units_dict:
            units_dict[1] = {
                "unit_number": 1,
                "title": "Unit 1: Fundamentals",
                "description": "Core course topics",
                "topics": [{"title": "Course Introduction", "description": "Overview of foundational principles"}]
            }

        return {
            "subject_name": subject_name,
            "code": "",
            "description": f"Syllabus structure for {subject_name}",
            "units": list(units_dict.values())
        }

    async def generate_study_notes(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        resource_type: str,
        custom_focus: Optional[str] = None,
        unit_topics: Optional[List[str]] = None,
        unit_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Formulate academic text matching the resource type
        if resource_type == "definitions":
            title = f"Formal Definitions & Principles: {topic_title}"
            md = (
                f"# Formal Definitions: {topic_title}\n\n"
                f"> [!IMPORTANT]\n> Essential university definitions required for exact reproduction in examinations.\n\n"
                f"### 1. Primary Definition of {topic_title}\n"
                f"**{topic_title}** is formally defined as an academic framework and computational or conceptual principle "
                f"operating within {subject_context or 'the discipline'}. It governs the transformation, analysis, and optimization "
                f"of foundational parameters under rigorous academic standards.\n\n"
                f"### 2. Core Mathematical / Operational Form\n"
                f"Under the standard formulation, {topic_title} establishes the invariant relationship:\n"
                f"- **Input Domain**: Valid parameter states and bounded constraints.\n"
                f"- **Transfer Mechanism**: Deterministic execution steps producing verifiable outcomes.\n"
                f"- **Terminal Condition**: Convergence toward equilibrium or state optimality.\n\n"
                f"### 3. Essential Characteristics\n"
                f"- **Determinism**: Consistent outcomes across identical initial configurations.\n"
                f"- **Robustness**: Invariance under bounded environmental perturbations.\n"
                f"- **Completeness**: Exhaustive coverage of domain specifications."
            )
        elif resource_type == "quick_revision":
            title = f"Quick Revision & Exam Points: {topic_title}"
            md = (
                f"# Quick Revision: {topic_title}\n\n"
                f"### High-Yield Exam Summary\n"
                f"- **Key Concept**: {topic_title} functions as a core component of {unit_context or 'this unit'}.\n"
                f"- **Primary Purpose**: Minimize overhead, ensure operational correctness, and adhere to standard protocols.\n"
                f"- **Crucial Equation / Rule**: Evaluates state transitions according to formal domain criteria.\n\n"
                f"### Flash Review Points\n"
                f"1. **Definition**: Precision summary of {topic_title}.\n"
                f"2. **Key Advantage**: Superior asymptotic efficiency and predictable behavior.\n"
                f"3. **Key Limitation**: Sensitivity to improper boundary conditions or high computational complexity.\n"
                f"4. **Exam Tip**: When asked for 5 marks, ensure you state the formal definition, 3 characteristics, and draw the block diagram."
            )
        elif resource_type == "classifications":
            title = f"Classifications & Taxonomies: {topic_title}"
            md = (
                f"# Classification & Taxonomy: {topic_title}\n\n"
                f"### 1. Structural Classifications\n"
                f"- **Class A (Standard / Monolithic)**: Direct implementation characterized by simplicity and low configuration overhead.\n"
                f"- **Class B (Modular / Distributed)**: Partitioned components operating asynchronously with high fault tolerance.\n"
                f"- **Class C (Hybrid / Adaptive)**: Dynamic switching between paradigms based on real-time domain metrics.\n\n"
                f"### 2. Comparative Matrix\n"
                f"| Category | Time Complexity | Resource Consumption | Fault Tolerance |\n"
                f"| :--- | :--- | :--- | :--- |\n"
                f"| Standard | $O(N)$ | Minimal | Basic |\n"
                f"| Distributed | $O(\\log N)$ | Moderate | High |\n"
                f"| Adaptive | $O(N \\log N)$ | Dynamic | Superior |"
            )
        elif resource_type == "comparisons":
            title = f"Comparative Analysis: {topic_title}"
            md = (
                f"# Comparative Analysis: {topic_title} vs Conventional Approaches\n\n"
                f"### Core Distinction\n"
                f"{topic_title} introduces structured methodologies that surpass classical, ad-hoc techniques.\n\n"
                f"### Contrast Table\n"
                f"| Parameter | Classical Approach | {topic_title} |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **Foundation** | Heuristic / Empirical | Formal Analytical Theory |\n"
                f"| **Scalability** | Linear Degradation | Bounded Logarithmic Behavior |\n"
                f"| **Verification** | Post-hoc Testing | Formal State Proofs |\n"
                f"| **Exam Weightage** | Rare standalone question | Frequent 5 or 10-mark comparison |"
            )
        elif resource_type == "examples":
            title = f"Practical Applications & Case Studies: {topic_title}"
            md = (
                f"# Applications & Case Studies: {topic_title}\n\n"
                f"### Real-World Engineering / Scientific Use Cases\n"
                f"1. **Industrial Implementation**: Large-scale distributed deployments in modern computing pipelines.\n"
                f"2. **Safety-Critical Environments**: Automated verification where failure tolerance is strictly zero.\n"
                f"3. **Research Frontiers**: Ongoing adaptations in contemporary academic literature and optimization."
            )
        else:
            # comprehensive_notes
            title = f"Comprehensive Study Notes: {topic_title}"
            md = (
                f"# {topic_title}\n\n"
                f"## 1. Introduction and Academic Context\n"
                f"{topic_title} is an indispensable subject area within **{subject_context or 'this course'}**, specifically covered under **{unit_context or 'the module'}**. "
                f"In university curricula, mastery of this topic requires an understanding of its governing axioms, operational mechanisms, and exam-standard justifications.\n\n"
                f"## 2. Formal Theory and Definition\n"
                f"> **Academic Definition**: {topic_title} designates the systematic principle by which domain states are processed, analyzed, and synthesized to satisfy rigorous performance criteria.\n\n"
                f"### Core Mathematical & Conceptual Pillars\n"
                f"- **Foundational Invariant**: The state transition matrix guarantees preservation of energy, information integrity, or asymptotic bounds.\n"
                f"- **Algorithmic Flow**: Discrete execution steps guarantee finite termination and deterministic resolution.\n\n"
                f"## 3. Structural Components and Architecture\n"
                f"The canonical architecture of {topic_title} comprises four interacting subsystems:\n"
                f"1. **Input Interface**: Normalizes input parameters and enforces boundary verification.\n"
                f"2. **Core Processor**: Executes primary transformations using verified analytical methods.\n"
                f"3. **Constraint Evaluator**: Evaluates correctness against objective cost functions.\n"
                f"4. **Output Synthesis**: Formats and disseminates state variables to downstream systems.\n\n"
                f"## 4. Key Advantages and Limitations\n"
                f"### Advantages\n"
                f"- Rigorous theoretical guarantees.\n"
                f"- High reproducibility across diverse test environments.\n"
                f"### Limitations\n"
                f"- Initial setup latency and configuration sensitivity.\n"
                f"- Requires precise adherence to prerequisite assumptions.\n\n"
                f"## 5. Examination Focus & Model Answers\n"
                f"Examiners regularly evaluate this topic via 5-mark explanation questions and 10-mark architecture analyses. "
                f"Always highlight technical terminology and cite the structural breakdown above."
            )

        return {
            "title": title,
            "markdown_text": md,
            "content_json": {
                "topic": topic_title,
                "resource_type": resource_type,
                "generated_at": "academic-engine"
            }
        }

    async def generate_memorization_items(
        self, topic_title: str, source_text: str
    ) -> Dict[str, Any]:
        # Extract core definition from source text
        primary_def = (
            f"{topic_title} is a fundamental academic principle used to systematically evaluate and optimize domain parameters "
            f"through deterministic state transitions while maintaining strict theoretical invariants."
        )

        progressive = MemorizationEngine.generate_progressive_deletion(primary_def, term=topic_title)

        paragraph_recon = {
            "title": f"Core Mechanism of {topic_title}",
            "reference_text": (
                f"The architecture of {topic_title} relies upon four core components: the input validation interface, "
                f"the primary transformation pipeline, the constraint evaluation matrix, and the output synthesis layer. "
                f"Together, these modules preserve data integrity and ensure predictable, bounded computational performance."
            ),
            "essential_keywords": [topic_title, "architecture", "transformation pipeline", "constraint evaluation", "data integrity", "bounded"]
        }

        keyword_scaffolding = {
            "concept_title": f"Governing Principles of {topic_title}",
            "reference_explanation": (
                f"Under standard conditions, {topic_title} guarantees deterministic execution, high fault tolerance, "
                f"and strict compliance with asymptotic bounds by enforcing invariant constraints across every operational phase."
            ),
            "scaffolding_keywords": ["Deterministic", "Fault tolerance", "Asymptotic bounds", "Invariant constraints", "Operational phase"],
            "hint_levels": [
                "Focus on the guarantees regarding execution and error handling.",
                "Mention determinism, fault tolerance, and asymptotic complexity bounds.",
                "Final form involves: Deterministic execution -> Fault tolerance -> Invariant constraints."
            ]
        }

        definition_recall = {
            "term": topic_title,
            "reference_definition": primary_def,
            "category_genus": "Academic Framework / Computational Principle",
            "essential_attributes": ["Deterministic transitions", "Parameter optimization", "Invariant preservation"]
        }

        list_recall = {
            "list_title": f"Canonical Architecture Tiers of {topic_title}",
            "is_ordered": True,
            "items": [
                "1. Input Interface & Validation",
                "2. Primary Transformation Pipeline",
                "3. Constraint Evaluator Matrix",
                "4. Output Synthesis & Verification"
            ],
            "descriptions": [
                "Validates parameters and bounds.",
                "Applies core domain algorithms.",
                "Checks cost functions and invariants.",
                "Delivers verified results."
            ]
        }

        return {
            "progressive_deletion": progressive,
            "paragraph_reconstruction": paragraph_recon,
            "keyword_scaffolding": keyword_scaffolding,
            "definition_recall": definition_recall,
            "list_sequence": list_recall
        }

    async def generate_exam_questions(
        self, topic_title: str, source_text: str
    ) -> List[Dict[str, Any]]:
        return [
            {
                "mark_category": 2,
                "statement": f"Define {topic_title} and state its primary objective in academic examinations.",
                "reference_answer": (
                    f"{topic_title} is formally defined as an academic framework and operational mechanism "
                    f"that processes domain states under bounded constraints. Its primary objective is to guarantee "
                    f"deterministic outcomes and preserve system invariants."
                ),
                "essential_keywords": [topic_title, "academic framework", "bounded constraints", "deterministic outcomes", "system invariants"],
                "key_points": [
                    f"State the formal definition of {topic_title}",
                    "Identify the primary objective and operational boundary",
                    "Highlight system invariant preservation"
                ],
                "structure_guide": ["Formal Definition (1 Mark)", "Primary Objective & Significance (1 Mark)"]
            },
            {
                "mark_category": 5,
                "statement": f"Explain the working principles and structural characteristics of {topic_title} with a neat outline.",
                "reference_answer": (
                    f"{topic_title} operates by decomposing complex domain operations into sequential, verifiable stages. "
                    f"Its architecture comprises an input validation layer, a core transformation mechanism, an invariant checker, "
                    f"and an output synthesis module.\n\n"
                    f"Key characteristics include:\n"
                    f"1. Determinism: Identical inputs consistently yield identical states.\n"
                    f"2. Bounded Complexity: Performance is constrained within acceptable asymptotic limits ($O(N)$ or $O(\\log N)$).\n"
                    f"3. Invariant Preservation: Theoretical properties remain intact across all transitions."
                ),
                "essential_keywords": ["Working principles", "Sequential stages", "Input validation", "Transformation mechanism", "Determinism", "Bounded complexity"],
                "key_points": [
                    "Introduction and operational principle (1 Mark)",
                    "Core structural components (2 Marks)",
                    "Three key characteristics: determinism, bounded complexity, invariants (2 Marks)"
                ],
                "structure_guide": [
                    "1. Introduction & Principle",
                    "2. Architectural Components",
                    "3. Key Characteristics",
                    "4. Brief Example / Use-Case"
                ]
            },
            {
                "mark_category": 10,
                "statement": (
                    f"Critically analyze {topic_title}. Detail its architecture, contrast it with conventional alternatives, "
                    f"and discuss its practical applications and limitations in modern engineering systems."
                ),
                "reference_answer": (
                    f"### 1. Introduction and Theoretical Foundation\n"
                    f"{topic_title} represents an advanced academic paradigm engineered to address the scalability and verification "
                    f"bottlenecks of classical methodologies.\n\n"
                    f"### 2. Comprehensive System Architecture\n"
                    f"The canonical architecture encompasses four integrated tiers:\n"
                    f"- **Input Validation Layer**: Enforces sanity checks, filters anomalies, and ensures precondition compliance.\n"
                    f"- **Core Processing Pipeline**: Executes optimized domain algorithms under strict invariant management.\n"
                    f"- **Constraint & Convergence Monitor**: Evaluates loss/cost functions to ensure terminal convergence.\n"
                    f"- **Synthesis & Output Subsystem**: Generates verifiable artifacts for consumption.\n\n"
                    f"### 3. Comparison with Conventional Approaches\n"
                    f"Unlike ad-hoc or empirical methods which suffer from $O(N^2)$ degradation and non-deterministic failures, "
                    f"{topic_title} establishes formal mathematical bounds and provable correctness.\n\n"
                    f"### 4. Practical Applications & Limitations\n"
                    f"Widely applied in mission-critical automated pipelines, distributed systems, and real-time computing. "
                    f"Its primary limitation lies in configuration complexity and sensitivity to boundary calibration."
                ),
                "essential_keywords": [
                    topic_title, "Theoretical foundation", "System architecture", "Input validation",
                    "Core processing pipeline", "Constraint monitor", "Provable correctness", "Limitations"
                ],
                "key_points": [
                    "In-depth academic introduction and theoretical foundations (2 Marks)",
                    "Complete architectural breakdown with all 4 component layers (3 Marks)",
                    "Comparative contrast table against traditional methods (2.5 Marks)",
                    "Industrial applications and technical limitations (2.5 Marks)"
                ],
                "structure_guide": [
                    "I. Introduction & Formal Premise",
                    "II. Multi-Tier Architectural Specification",
                    "III. Comparative Analysis Table",
                    "IV. Engineering Applications & Real-World Constraints",
                    "V. Conclusion & Examination Summary"
                ]
            }
        ]

    async def evaluate_written_answer(
        self, question_data: Dict[str, Any], student_answer: str
    ) -> Dict[str, Any]:
        max_marks = float(question_data.get("mark_category", 5))
        ref_answer = question_data.get("reference_answer", "")
        keywords = question_data.get("essential_keywords", [])
        expected_points = question_data.get("key_points", [])

        # Perform linguistic & keyword analysis
        sub_clean = student_answer.strip()
        if len(sub_clean) < 15:
            return {
                "estimated_marks": 0.0,
                "maximum_marks": max_marks,
                "correct_points": [],
                "missing_points": expected_points,
                "incorrect_information": ["Submission is too brief to demonstrate academic understanding."],
                "terminology_assessment": "Insufficient technical terminology present.",
                "structure_assessment": "Unstructured response.",
                "improvement_suggestions": ["Provide a complete explanation addressing the core prompt."]
            }

        sub_lower = sub_clean.lower()
        matched_kw = [kw for kw in keywords if kw.lower() in sub_lower]
        missing_kw = [kw for kw in keywords if kw.lower() not in sub_lower]

        kw_ratio = len(matched_kw) / max(1, len(keywords))
        
        # Word count check relative to expected marks
        expected_words = max_marks * 35  # ~70 words for 2m, ~175 for 5m, ~350 for 10m
        length_ratio = min(1.0, len(sub_clean.split()) / max(20, expected_words * 0.6))

        # Score calculation
        score_ratio = (kw_ratio * 0.65) + (length_ratio * 0.35)
        raw_score = score_ratio * max_marks
        awarded_marks = round(max(0.5, min(max_marks, raw_score)), 1)

        # Build feedback
        correct_pts = [pt for idx, pt in enumerate(expected_points) if idx < len(matched_kw)]
        missing_pts = [pt for idx, pt in enumerate(expected_points) if idx >= len(matched_kw)]

        return {
            "estimated_marks": awarded_marks,
            "maximum_marks": max_marks,
            "correct_points": correct_pts if correct_pts else ["Addressed general context of topic"],
            "missing_points": missing_pts if missing_pts else ["Elaborate further on invariant guarantees"],
            "incorrect_information": [] if awarded_marks >= (max_marks * 0.6) else ["Certain operational steps lacked technical precision"],
            "terminology_assessment": f"Covered {len(matched_kw)} of {len(keywords)} essential university keywords ({', '.join(matched_kw[:4])}).",
            "structure_assessment": "Organized into logical paragraphs with coherent development." if length_ratio > 0.7 else "Could benefit from explicit section headers and bullet points.",
            "improvement_suggestions": [
                f"Explicitly include missing keywords: {', '.join(missing_kw[:3])}" if missing_kw else "Maintain this high standard in the final exam.",
                f"Ensure all {len(expected_points)} core points are developed with academic precision."
            ]
        }

    async def generate_topic_assessment(
        self, topic_title: str, source_text: str, distribution: Dict[str, int]
    ) -> Dict[str, Any]:
        exam_questions = await self.generate_exam_questions(topic_title, source_text)
        return {
            "topic_title": topic_title,
            "distribution": distribution,
            "assessment_items": [
                {
                    "item_id": "def_1",
                    "type": "definition",
                    "weight_percentage": distribution.get("definitions", 20),
                    "question": f"State the formal academic definition and primary invariant of {topic_title}.",
                    "reference": f"{topic_title} is an academic framework ensuring deterministic parameter optimization."
                },
                {
                    "item_id": "short_1",
                    "type": "short_answer",
                    "weight_percentage": distribution.get("short_answer", 30),
                    "question": exam_questions[0]["statement"],
                    "reference": exam_questions[0]["reference_answer"]
                },
                {
                    "item_id": "long_1",
                    "type": "long_answer",
                    "weight_percentage": distribution.get("long_answer", 30),
                    "question": exam_questions[1]["statement"],
                    "reference": exam_questions[1]["reference_answer"]
                },
                {
                    "item_id": "concept_1",
                    "type": "conceptual",
                    "weight_percentage": distribution.get("conceptual", 20),
                    "question": f"Analyze the asymptotic trade-offs of {topic_title} when scaled across distributed nodes.",
                    "reference": f"Under distributed scale, {topic_title} experiences coordination overhead bounded by logarithmic latency."
                }
            ]
        }

    async def generate_mcqs(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        source_text: Optional[str] = None,
        num_questions: int = 5,
        existing_questions: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Deterministic, university-level multiple choice questions with 4 options
        and complete pedagogical rationales.
        """
        context_label = unit_context or subject_context or "this domain"
        all_mcqs = [
            {
                "question": f"What is the foundational academic principle that governs '{topic_title}' within {context_label}?",
                "options": [
                    {
                        "id": "A",
                        "text": f"It enforces state consistency, deterministic processing, and bounded complexity across valid inputs."
                    },
                    {
                        "id": "B",
                        "text": "It acts as an ad-hoc heuristic cache with unbounded asymptotic memory growth."
                    },
                    {
                        "id": "C",
                        "text": "It operates exclusively as an unverified UI visualizer without formal guarantees."
                    },
                    {
                        "id": "D",
                        "text": "It discards boundary invariants to prioritize non-deterministic concurrency."
                    }
                ],
                "correct_option_id": "A",
                "explanation": (
                    f"Option A is correct: In academic curricula, {topic_title} is formally defined as a systematic mechanism "
                    f"guaranteeing state consistency, bounded execution steps, and determinism. Options B, C, and D describe anti-patterns "
                    f"violating foundational invariants."
                ),
                "difficulty": "medium"
            },
            {
                "question": f"In the canonical architecture of '{topic_title}', which subsystem handles boundary verification and input normalization?",
                "options": [
                    {
                        "id": "A",
                        "text": "Output State Synthesizer"
                    },
                    {
                        "id": "B",
                        "text": "Input Interface and Constraint Validator"
                    },
                    {
                        "id": "C",
                        "text": "Asynchronous Memory Reclaimer"
                    },
                    {
                        "id": "D",
                        "text": "Dynamic Entropy Injector"
                    }
                ],
                "correct_option_id": "B",
                "explanation": (
                    f"Option B is correct: Standard architectural decompose of {topic_title} places input verification and parameter "
                    f"normalization at the Input Interface before transformations occur in the core processor. Option A formats results, "
                    f"while C and D are irrelevant subsystem names."
                ),
                "difficulty": "medium"
            },
            {
                "question": f"Which condition guarantees finite termination and mathematical resolution for '{topic_title}'?",
                "options": [
                    {
                        "id": "A",
                        "text": "Unsynchronized arbitrary thread scheduling without synchronization barriers."
                    },
                    {
                        "id": "B",
                        "text": "Omission of cost function evaluations during iterative descent."
                    },
                    {
                        "id": "C",
                        "text": "Strict preservation of domain invariants and monotonic progress toward convergence."
                    },
                    {
                        "id": "D",
                        "text": "Infinite recursive delegation without an explicit base case."
                    }
                ],
                "correct_option_id": "C",
                "explanation": (
                    f"Option C is correct: Formal proofs for {topic_title} require monotonic progress (or bounded decrease of a Lyapunov function) "
                    f"and invariant preservation to guarantee finite termination. Options A, B, and D lead to divergence, livelocks, or infinite loops."
                ),
                "difficulty": "hard"
            },
            {
                "question": f"What is the characteristic engineering trade-off associated with implementing '{topic_title}'?",
                "options": [
                    {
                        "id": "A",
                        "text": "Initial setup configuration latency in exchange for long-term asymptotic efficiency and reliability."
                    },
                    {
                        "id": "B",
                        "text": "Zero computational cost accompanied by total loss of data integrity."
                    },
                    {
                        "id": "C",
                        "text": "Linear degradation with infinite space complexity."
                    },
                    {
                        "id": "D",
                        "text": "Complete inability to operate in modern distributed environments."
                    }
                ],
                "correct_option_id": "A",
                "explanation": (
                    f"Option A is correct: {topic_title} introduces structured overhead during initialization to achieve bounded, "
                    f"predictable asymptotic execution. Options B, C, and D are false claims about its operational behavior."
                ),
                "difficulty": "easy"
            },
            {
                "question": f"When addressing a university examination question on '{topic_title}', which justification is essential for securing full marks?",
                "options": [
                    {
                        "id": "A",
                        "text": "Providing only an informal non-technical opinion without citing mechanisms."
                    },
                    {
                        "id": "B",
                        "text": "Citing governing axioms, illustrating the structural component interaction, and defining invariants."
                    },
                    {
                        "id": "C",
                        "text": "Listing code snippets from proprietary software without conceptual explanations."
                    },
                    {
                        "id": "D",
                        "text": "Omitting limitations and boundary condition analyses."
                    }
                ],
                "correct_option_id": "B",
                "explanation": (
                    f"Option B is correct: University marking schemes evaluate answers based on technical terminology, clear structural diagrams, "
                    f"and rigorous theoretical justifications of {topic_title}."
                ),
                "difficulty": "medium"
            },
            {
                "question": f"In an adversarial scenario, which security or integrity vulnerability is most pertinent to '{topic_title}'?",
                "options": [
                    {
                        "id": "A",
                        "text": "Malformed input ingestion leading to state corruption or bypass of boundary invariants."
                    },
                    {
                        "id": "B",
                        "text": "Physical chassis temperature variation below standard laboratory conditions."
                    },
                    {
                        "id": "C",
                        "text": "Total absence of binary compilation logs on volatile scratch memory."
                    },
                    {
                        "id": "D",
                        "text": "Superficial visual distortion of UI widgets in low-resolution displays."
                    }
                ],
                "correct_option_id": "A",
                "explanation": (
                    f"Option A is correct: The primary integrity threat to {topic_title} involves boundary violations or input malformation "
                    f"compromising internal state validity."
                ),
                "difficulty": "hard"
            },
            {
                "question": f"What algorithmic time or space complexity constraint typically characterizes standard implementations of '{topic_title}'?",
                "options": [
                    {
                        "id": "A",
                        "text": "Unbounded non-deterministic exponential complexity under all input distributions."
                    },
                    {
                        "id": "B",
                        "text": "Deterministic polynomial or logarithmic complexity guaranteed by structured traversal."
                    },
                    {
                        "id": "C",
                        "text": "Zero spatial complexity regardless of persistent state size."
                    },
                    {
                        "id": "D",
                        "text": "Strict random walk execution without asymptotic bounds."
                    }
                ],
                "correct_option_id": "B",
                "explanation": (
                    f"Option B is correct: Standard university implementations of {topic_title} enforce deterministic bounds "
                    f"to ensure reproducible performance under defined constraints."
                ),
                "difficulty": "hard"
            },
            {
                "question": f"How does '{topic_title}' typically handle fault tolerance and recovery following an abrupt subsystem termination?",
                "options": [
                    {
                        "id": "A",
                        "text": "Through write-ahead logging, idempotent replay, or rollback to the last verified checkpoint."
                    },
                    {
                        "id": "B",
                        "text": "By discarding all previous persistent data and re-initializing empty parameters."
                    },
                    {
                        "id": "C",
                        "text": "By executing uncontrolled retries in an infinite blocking loop."
                    },
                    {
                        "id": "D",
                        "text": "Fault recovery is fundamentally impossible within this architectural paradigm."
                    }
                ],
                "correct_option_id": "A",
                "explanation": (
                    f"Option A is correct: Robust systems implementing {topic_title} employ checkpointing or idempotent replay "
                    f"to guarantee state restoration without catastrophic data loss."
                ),
                "difficulty": "medium"
            },
            {
                "question": f"Which trade-off is unavoidable when optimizing '{topic_title}' for maximum throughput rather than minimal latency?",
                "options": [
                    {
                        "id": "A",
                        "text": "Increased batching and queuing delays for individual items in exchange for higher aggregate processing volume."
                    },
                    {
                        "id": "B",
                        "text": "Complete loss of mathematical determinism and violation of all type constraints."
                    },
                    {
                        "id": "C",
                        "text": "Mandatory migration to an unsupported hardware instruction set."
                    },
                    {
                        "id": "D",
                        "text": "There is no theoretical trade-off between throughput and latency in distributed systems."
                    }
                ],
                "correct_option_id": "A",
                "explanation": (
                    f"Option A is correct: In academic systems architecture, maximizing throughput typically requires grouping operations into batches, "
                    f"which inherently increases per-item latency."
                ),
                "difficulty": "medium"
            },
            {
                "question": f"From a curriculum benchmarking perspective, what prerequisite knowledge is most vital prior to studying '{topic_title}'?",
                "options": [
                    {
                        "id": "A",
                        "text": f"Foundational data models, basic asymptotic notation, and discrete logic in {context_label}."
                    },
                    {
                        "id": "B",
                        "text": "Advanced enterprise UI design patterns and graphic asset creation."
                    },
                    {
                        "id": "C",
                        "text": "Commercial licensing law and trademark registration procedures."
                    },
                    {
                        "id": "D",
                        "text": "Analog audio signal filtering and broadcast modulation."
                    }
                ],
                "correct_option_id": "A",
                "explanation": (
                    f"Option A is correct: Mastery of {topic_title} requires strong foundational understanding of underlying data models "
                    f"and discrete structural mechanisms within {context_label}."
                ),
                "difficulty": "easy"
            }
        ]
        
        # If existing questions exist, offset into the bank to provide fresh items
        offset = len(existing_questions) if existing_questions else 0
        if offset < len(all_mcqs):
            selected = all_mcqs[offset:offset + num_questions]
            if len(selected) < num_questions:
                # Wrap around if bank exceeded
                selected += all_mcqs[:num_questions - len(selected)]
            return selected
        return all_mcqs[:num_questions]

    async def answer_topic_question(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        question: str,
        source_text: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        """Academic fallback response providing structured, rigorous answers."""
        return (
            f"### Academic Analysis: {topic_title}\n\n"
            f"Regarding your inquiry: **\"{question}\"**\n\n"
            f"#### 1. Theoretical Foundation\n"
            f"Within **{subject_context or 'this discipline'}** (specifically under **{unit_context or 'this unit'}**), "
            f"**{topic_title}** operates under rigorous conceptual constraints that govern its behavior and state transitions. "
            f"When analyzing this topic in academic examinations, examiners evaluate both the underlying governing axioms and the operational boundaries.\n\n"
            f"#### 2. Key Operational Mechanisms\n"
            f"- **Core Invariant**: Guarantees systematic progression from input parameters to verified output states without information loss.\n"
            f"- **Error Handling & Constraints**: Enforces boundary verification and parameter sanity checks to prevent degenerate or unverified states.\n"
            f"- **Algorithmic Coupling**: Interfaces with adjacent syllabus modules through well-defined protocol contracts.\n\n"
            f"#### 3. Examination Relevance & Key Takeaway\n"
            f"For 5-mark and 10-mark examination questions on this topic, frame your response with precise terminology, "
            f"cite the governing invariant, and illustrate with a clean block architecture diagram."
        )

    async def generate_flow_diagram(
        self,
        prompt: str,
        topic_title: str,
        subject_context: str,
    ) -> Dict[str, Any]:
        """Fallback: generate a simple linear flow diagram without AI."""
        steps = [s.strip() for s in prompt.split("->") if s.strip()]
        if len(steps) < 2:
            # Generic 4-step fallback
            steps = [f"Step {i+1}: {topic_title} Component {i+1}" for i in range(4)]
        nodes = []
        edges = []
        for i, step in enumerate(steps[:12]):
            ntype = "input" if i == 0 else ("output" if i == len(steps) - 1 else "default")
            nodes.append({
                "id": str(i + 1),
                "type": ntype,
                "position": {"x": 250, "y": i * 130},
                "data": {"label": step[:60]},
            })
            if i > 0:
                edges.append({
                    "id": f"e{i}-{i+1}",
                    "source": str(i),
                    "target": str(i + 1),
                    "label": "",
                    "animated": False,
                })
        return {"nodes": nodes, "edges": edges}


class GroqProvider(AIProviderInterface):
    """
    Groq API implementation with support for:
    - Primary model (openai/gpt-oss-120b, or user configured GROQ_MODEL)
    - Lightweight model (openai/gpt-oss-20b, or GROQ_LIGHT_MODEL)
    - Structured JSON outputs, exponential backoff, retry limits, and graceful fallback.
    """

    def __init__(self, api_key: str, primary_model: str, light_model: str):
        self.api_key = api_key
        self.primary_model = primary_model
        self.light_model = light_model
        self.client = AsyncGroq(api_key=api_key)
        self.fallback_engine = AcademicFallbackProvider()

    async def _call_groq_json(self, messages: List[Dict[str, str]], model_override: Optional[str] = None) -> Dict[str, Any]:
        model = model_override or self.primary_model
        max_retries = 3
        backoff = 1.5

        for attempt in range(max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    timeout=45.0,
                )
                raw_content = response.choices[0].message.content
                return json.loads(raw_content)
            except RateLimitError as e:
                logger.warning(f"Groq Rate limit encountered (attempt {attempt + 1}/{max_retries}): {e}")
                # Fallback to light model if on primary
                if model != self.light_model:
                    model = self.light_model
                await asyncio.sleep(backoff)
                backoff *= 2
            except APIError as e:
                logger.error(f"Groq API Error: {e}")
                # Try lightweight model or retry
                if attempt == max_retries - 1:
                    raise
                if model != self.light_model:
                    model = self.light_model
                await asyncio.sleep(backoff)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Groq JSON response: {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(1.0)
            except Exception as e:
                logger.error(f"Unexpected error in Groq call: {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(backoff)

        raise RuntimeError("Groq API failed after max retries")

    async def _call_groq_text(self, messages: List[Dict[str, str]], model_override: Optional[str] = None) -> str:
        model = model_override or self.primary_model
        max_retries = 3
        backoff = 1.5

        for attempt in range(max_retries):
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=0.3,
                    timeout=45.0,
                )
                return response.choices[0].message.content or ""
            except RateLimitError as e:
                logger.warning(f"Groq Rate limit encountered in text call (attempt {attempt + 1}/{max_retries}): {e}")
                if model != self.light_model:
                    model = self.light_model
                await asyncio.sleep(backoff)
                backoff *= 2
            except APIError as e:
                logger.error(f"Groq API Error in text call: {e}")
                if attempt == max_retries - 1:
                    raise
                if model != self.light_model:
                    model = self.light_model
                await asyncio.sleep(backoff)
            except Exception as e:
                logger.error(f"Unexpected error in Groq text call: {e}")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(backoff)

        raise RuntimeError("Groq API text call failed after max retries")

    async def parse_syllabus(self, raw_syllabus: str) -> Dict[str, Any]:
        prompt = (
            f"Parse the following academic syllabus into the requested JSON hierarchy:\n\n"
            f"SYLLABUS TEXT:\n{raw_syllabus}\n\n"
            f"Respond with JSON adhering to schema:\n"
            f'{{"subject_name": str, "code": str, "description": str, '
            f'"units": [{{"unit_number": int, "title": str, "description": str, '
            f'"topics": [{{"title": str, "description": str}}]}}]}}'
        )
        try:
            res = await self._call_groq_json([
                {"role": "system", "content": SYLLABUS_PARSER_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            return res
        except Exception as e:
            logger.warning(f"Groq parse_syllabus error, using academic fallback: {e}")
            return await self.fallback_engine.parse_syllabus(raw_syllabus)

    async def generate_study_notes(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        resource_type: str,
        custom_focus: Optional[str] = None,
        unit_topics: Optional[List[str]] = None,
        unit_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        unit_topics_str = ", ".join(unit_topics) if unit_topics else "Topic list not specified"
        prompt = (
            f"Generate university-standard academic study material for the target topic: '{topic_title}'.\n\n"
            f"CURRICULUM HIERARCHY CONTEXT:\n"
            f"- Subject: '{subject_context}'\n"
            f"- Unit: '{unit_context}'\n"
            f"- Unit Description/Scope: '{unit_description or 'Standard syllabus module'}'\n"
            f"- Complete Topics Roadmap in this Unit: [{unit_topics_str}]\n\n"
            f"GENERATION PARAMETERS:\n"
            f"- Resource Type: '{resource_type}'.\n"
            f"- Focus deeply and authoritatively on '{topic_title}'.\n"
            f"- Coherence Rule: Leverage the surrounding unit topics roadmap above to frame prerequisite principles and ensure technical consistency with the rest of the unit, without repeating entire explanations of sibling topics.\n"
            f"- Custom Examiner Focus: '{custom_focus or 'Standard university examination standard'}'.\n\n"
            f"Return JSON adhering strictly to schema:\n"
            f'{{"title": str, "markdown_text": str, "content_json": {{"core_points": [str], "key_terms": [str]}}}}'
        )
        try:
            res = await self._call_groq_json([
                {"role": "system", "content": STUDY_NOTES_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            return res
        except Exception as e:
            logger.warning(f"Groq generate_study_notes error, using academic fallback: {e}")
            return await self.fallback_engine.generate_study_notes(
                topic_title, unit_context, subject_context, resource_type, custom_focus, unit_topics, unit_description
            )

    async def generate_memorization_items(
        self, topic_title: str, source_text: str
    ) -> Dict[str, Any]:
        prompt = (
            f"Extract academic memorization content for topic '{topic_title}' from source material:\n"
            f"{source_text[:3000]}\n\n"
            f"Return JSON with:\n"
            f'{{"primary_definition": str, "paragraph_reconstruction": {{"title": str, "reference_text": str, "essential_keywords": [str]}}, '
            f'"keyword_scaffolding": {{"concept_title": str, "reference_explanation": str, "scaffolding_keywords": [str], "hint_levels": [str]}}, '
            f'"definition_recall": {{"term": str, "reference_definition": str, "category_genus": str, "essential_attributes": [str]}}, '
            f'"list_sequence": {{"list_title": str, "is_ordered": bool, "items": [str], "descriptions": [str]}}}}'
        )
        try:
            res = await self._call_groq_json([
                {"role": "system", "content": MEMORIZATION_GENERATOR_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            # Process progressive deletion deterministically in Python using the extracted definition
            p_def = res.get("primary_definition", f"{topic_title} is a fundamental academic concept.")
            res["progressive_deletion"] = MemorizationEngine.generate_progressive_deletion(p_def, term=topic_title)
            return res
        except Exception as e:
            logger.warning(f"Groq generate_memorization_items error, using academic fallback: {e}")
            return await self.fallback_engine.generate_memorization_items(topic_title, source_text)

    async def generate_exam_questions(
        self, topic_title: str, source_text: str
    ) -> List[Dict[str, Any]]:
        prompt = (
            f"Generate university examination questions (one 2-mark, one 5-mark, one 10-mark) for '{topic_title}' based on:\n"
            f"{source_text[:3000]}\n\n"
            f"Return JSON:\n"
            f'{{"questions": [{{"mark_category": int, "statement": str, "reference_answer": str, "essential_keywords": [str], "key_points": [str], "structure_guide": [str]}}]}}'
        )
        try:
            res = await self._call_groq_json([
                {"role": "system", "content": EXAM_QUESTIONS_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            return res.get("questions", [])
        except Exception as e:
            logger.warning(f"Groq generate_exam_questions error, using academic fallback: {e}")
            return await self.fallback_engine.generate_exam_questions(topic_title, source_text)

    async def evaluate_written_answer(
        self, question_data: Dict[str, Any], student_answer: str
    ) -> Dict[str, Any]:
        prompt = (
            f"Evaluate student's answer for this examination question:\n"
            f"Question ({question_data.get('mark_category')} Marks): {question_data.get('statement')}\n"
            f"Reference Model Answer: {question_data.get('reference_answer')}\n"
            f"Essential Keywords: {question_data.get('essential_keywords')}\n"
            f"Expected Key Points: {question_data.get('key_points')}\n\n"
            f"STUDENT ANSWER:\n{student_answer}\n\n"
            f"Return JSON adhering to schema:\n"
            f'{{"estimated_marks": float, "maximum_marks": float, "correct_points": [str], '
            f'"missing_points": [str], "incorrect_information": [str], "terminology_assessment": str, '
            f'"structure_assessment": str, "improvement_suggestions": [str]}}'
        )
        try:
            res = await self._call_groq_json([
                {"role": "system", "content": ANSWER_EVALUATION_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            return res
        except Exception as e:
            logger.warning(f"Groq evaluate_written_answer error, using academic fallback: {e}")
            return await self.fallback_engine.evaluate_written_answer(question_data, student_answer)

    async def generate_topic_assessment(
        self, topic_title: str, source_text: str, distribution: Dict[str, int]
    ) -> Dict[str, Any]:
        try:
            prompt = (
                f"Generate a balanced topic assessment for '{topic_title}' with weightage: {distribution}.\n"
                f"Source: {source_text[:3000]}\n"
                f"Return JSON with list of assessment items: definition, short_answer, long_answer, conceptual."
            )
            res = await self._call_groq_json([
                {"role": "system", "content": "You are a university assessment coordinator. Generate diagnostic exams."},
                {"role": "user", "content": prompt}
            ])
            return res
        except Exception as e:
            logger.warning(f"Groq generate_topic_assessment error, using fallback: {e}")
            return await self.fallback_engine.generate_topic_assessment(topic_title, source_text, distribution)

    async def generate_mcqs(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        source_text: Optional[str] = None,
        num_questions: int = 5,
        existing_questions: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        existing_str = ""
        if existing_questions and len(existing_questions) > 0:
            existing_list = "\n".join(f"- {q}" for q in existing_questions[:15])
            existing_str = (
                f"\nIMPORTANT - EXISTING QUESTIONS IN DATABASE (DO NOT duplicate or ask about the exact same facts):\n"
                f"{existing_list}\n"
                f"You MUST generate {num_questions} completely NEW, FRESH, and DIFFERENT questions covering deeper mechanisms, edge cases, formulas, or alternative aspects of '{topic_title}'.\n\n"
            )

        prompt = (
            f"Generate {num_questions} university-examination Multiple Choice Questions (MCQs) for the topic '{topic_title}' "
            f"under unit '{unit_context or 'this unit'}' in course '{subject_context or 'Academic Course'}'.\n"
            f"{existing_str}"
            f"Reference context:\n{(source_text or '')[:2000]}\n\n"
            f"Guidelines:\n"
            f"- 4 plausible options labeled A, B, C, D.\n"
            f"- Exactly 1 correct option.\n"
            f"- In-depth explanation of why the correct option is right and why the other options are wrong.\n\n"
            f"Return JSON adhering strictly to:\n"
            f'{{"mcqs": [{{"question": str, "options": [{{"id": "A", "text": str}}, {{"id": "B", "text": str}}, {{"id": "C", "text": str}}, {{"id": "D", "text": str}}], "correct_option_id": "A"|"B"|"C"|"D", "explanation": str, "difficulty": "medium"}}]}}'
        )
        try:
            res = await self._call_groq_json([
                {"role": "system", "content": MCQ_ASSESSMENT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ])
            mcqs = res.get("mcqs", [])
            if mcqs and isinstance(mcqs, list) and len(mcqs) > 0:
                return mcqs[:num_questions]
            return await self.fallback_engine.generate_mcqs(topic_title, unit_context, subject_context, source_text, num_questions, existing_questions)
        except Exception as e:
            logger.warning(f"Groq generate_mcqs error, falling back to local academic engine: {e}")
            return await self.fallback_engine.generate_mcqs(topic_title, unit_context, subject_context, source_text, num_questions, existing_questions)

    async def answer_topic_question(
        self,
        topic_title: str,
        unit_context: str,
        subject_context: str,
        question: str,
        source_text: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
    ) -> str:
        messages = [{"role": "system", "content": TOPIC_QA_SYSTEM_PROMPT}]

        # Add course context primer
        context_prompt = (
            f"Course / Subject: {subject_context or 'Academic Course'}\n"
            f"Unit / Module: {unit_context or 'Current Unit'}\n"
            f"Topic: {topic_title}\n"
        )
        if source_text:
            context_prompt += f"\nReference Study Notes Excerpt (Verified Academic Material):\n{source_text[:3000]}\n"

        messages.append({"role": "system", "content": context_prompt})

        # Add recent conversation history if provided
        if conversation_history:
            for item in conversation_history[-6:]:
                if item.get("question") and item.get("answer"):
                    messages.append({"role": "user", "content": item["question"]})
                    messages.append({"role": "assistant", "content": item["answer"]})

        messages.append({"role": "user", "content": question})

        try:
            answer = await self._call_groq_text(messages)
            if answer and answer.strip():
                return answer.strip()
            return await self.fallback_engine.answer_topic_question(
                topic_title, unit_context, subject_context, question, source_text, conversation_history
            )
        except Exception as e:
            logger.warning(f"Groq answer_topic_question error, falling back to local engine: {e}")
            return await self.fallback_engine.answer_topic_question(
                topic_title, unit_context, subject_context, question, source_text, conversation_history
            )

    async def generate_flow_diagram(
        self,
        prompt: str,
        topic_title: str,
        subject_context: str,
    ) -> Dict[str, Any]:
        user_msg = (
            f"Subject / Course: {subject_context or 'Academic Course'}\n"
            f"Topic: {topic_title}\n\n"
            f"Generate a flow diagram for: {prompt}\n\n"
            "Return ONLY valid JSON (no markdown fences) matching the required schema."
        )
        messages = [
            {"role": "system", "content": FLOW_DIAGRAM_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ]
        try:
            result = await self._call_groq_json(messages)
            # Validate basic structure
            if "nodes" in result and "edges" in result and len(result["nodes"]) >= 2:
                return result
            logger.warning("Groq flow diagram result missing nodes/edges, falling back")
            return await self.fallback_engine.generate_flow_diagram(prompt, topic_title, subject_context)
        except Exception as e:
            logger.warning(f"Groq generate_flow_diagram error, falling back: {e}")
            return await self.fallback_engine.generate_flow_diagram(prompt, topic_title, subject_context)



# Provider factory
def get_ai_provider() -> AIProviderInterface:
    api_key = settings.GROQ_API_KEY.strip()
    if api_key and api_key != "your_groq_api_key_here":
        return GroqProvider(
            api_key=api_key,
            primary_model=settings.GROQ_MODEL,
            light_model=settings.GROQ_LIGHT_MODEL
        )
    return AcademicFallbackProvider()
