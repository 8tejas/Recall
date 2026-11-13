export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
}

export interface Topic {
  id: string;
  unit_id: string;
  title: string;
  description?: string;
  personal_notes?: string;
  order_index: number;
  status: 'not_started' | 'in_progress' | 'mastered';
  created_at: string;
}

export interface Unit {
  id: string;
  subject_id: string;
  unit_number: number;
  title: string;
  description?: string;
  order_index: number;
  topics: Topic[];
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  raw_syllabus?: string;
  created_at: string;
  updated_at: string;
  total_topics?: number;
  mastered_topics?: number;
  in_progress_topics?: number;
  units?: Unit[];
}

export interface LearningMaterial {
  id: string;
  topic_id: string;
  content_type: 'comprehensive_notes' | 'quick_revision' | 'definitions' | 'classifications' | 'comparisons' | 'examples';
  title: string;
  markdown_text: string;
  content_json?: Record<string, any>;
  version: number;
  is_outdated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClozeToken {
  index: number;
  text: string;
  is_cloze: boolean;
  cloze_index?: number;
  hint?: string;
}

export interface ProgressiveDeletionPayload {
  original_text: string;
  source_term?: string;
  level1_text: string;
  level2_masked_text: string;
  level2_cloze_tokens: ClozeToken[];
  level3_keywords: string[];
  level4_prompt: string;
}

export interface ParagraphReconPayload {
  title: string;
  reference_text: string;
  context?: string;
  essential_keywords: string[];
}

export interface KeywordScaffoldingPayload {
  concept_title: string;
  reference_explanation: string;
  scaffolding_keywords: string[];
  hint_levels: string[];
}

export interface DefinitionRecallPayload {
  term: string;
  reference_definition: string;
  category_genus?: string;
  essential_attributes: string[];
}

export interface ListSequencePayload {
  list_title: string;
  is_ordered: boolean;
  items: string[];
  descriptions?: string[];
}

export interface Exercise {
  id: string;
  topic_id: string;
  exercise_mode: 'progressive_deletion' | 'paragraph_reconstruction' | 'keyword_scaffolding' | 'definition_recall' | 'list_recall' | 'conceptual';
  title: string;
  payload: any;
  created_at: string;
}

export interface Question {
  id: string;
  topic_id: string;
  mark_category: 2 | 5 | 10;
  statement: string;
  reference_answer: string;
  essential_keywords: string[];
  key_points: string[];
  structure_guide: string[];
  created_at: string;
}

export interface Attempt {
  id: string;
  exercise_id?: string;
  question_id?: string;
  topic_id?: string;
  submission_text?: string;
  evaluation_mode: string;
  score: number;
  max_score: number;
  performance_rating?: string;
  feedback_json?: Record<string, any>;
  created_at: string;
}

export interface RevisionItem {
  schedule_id: string;
  item_type: 'exercise' | 'question' | 'topic';
  item_id: string;
  title: string;
  topic_id?: string;
  topic_title?: string;
  subject_title?: string;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  due_date: string;
  is_overdue: boolean;
}

export interface DashboardStats {
  total_subjects: number;
  total_topics: number;
  mastered_topics: number;
  in_progress_topics: number;
  due_revision_count: number;
  recently_studied: Array<{
    topic_id: string;
    title: string;
    subject_name: string;
    status: string;
    last_attempt_at: string;
  }>;
  revision_needed: Array<{
    id: string;
    item_id: string;
    title: string;
    topic_id: string;
    topic_title: string;
    due_date: string;
    lapses: number;
  }>;
}

export interface ParsedTopicItem {
  title: string;
  description?: string;
}

export interface ParsedUnitItem {
  unit_number: number;
  title: string;
  description?: string;
  topics: ParsedTopicItem[];
}

export interface ParsedSyllabus {
  subject_name: string;
  code?: string;
  description?: string;
  units: ParsedUnitItem[];
}

export interface MCQOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface MCQQuestion {
  id: string;
  topic_id: string;
  question_text: string;
  options: MCQOption[];
  correct_option_id?: string;
  explanation?: string;
  difficulty: string;
  created_at: string;
}

export interface MCQQuestionFeedback {
  question_id: string;
  question_text: string;
  options: MCQOption[];
  selected_option_id: string;
  correct_option_id: string;
  is_correct: boolean;
  explanation: string;
}

export interface MCQAssessmentResult {
  id: string;
  topic_id: string;
  score_percentage: number;
  total_questions: number;
  correct_count: number;
  detailed_feedback: MCQQuestionFeedback[];
  created_at: string;
}

export interface TopicQA {
  id: string;
  topic_id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export interface FlowDiagramNodeData {
  label: string;
}

export interface FlowDiagramNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: FlowDiagramNodeData;
}

export interface FlowDiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface FlowDiagram {
  id: string;
  topic_id: string;
  user_id: string;
  name: string;
  prompt?: string;
  nodes_json: string;
  edges_json: string;
  created_at: string;
  updated_at: string;
}
