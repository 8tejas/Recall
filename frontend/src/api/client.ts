import axios from 'axios';
import {
  Subject,
  Unit,
  Topic,
  LearningMaterial,
  Exercise,
  Question,
  Attempt,
  RevisionItem,
  DashboardStats,
  ParsedSyllabus,
  MCQQuestion,
  MCQAssessmentResult,
} from '../types';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching auth token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('recall_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API helper functions
export const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await api.get('/dashboard/stats');
  return res.data;
};

export const fetchSubjects = async (): Promise<Subject[]> => {
  const res = await api.get('/subjects');
  return res.data;
};

export const fetchSubjectDetail = async (id: string): Promise<Subject> => {
  const res = await api.get(`/subjects/${id}`);
  return res.data;
};

export const createSubject = async (data: { name: string; code?: string; description?: string; raw_syllabus?: string }): Promise<Subject> => {
  const res = await api.post('/subjects', data);
  return res.data;
};

export const updateSubject = async (id: string, data: { name?: string; code?: string; description?: string }): Promise<Subject> => {
  const res = await api.put(`/subjects/${id}`, data);
  return res.data;
};

export const deleteSubject = async (id: string): Promise<void> => {
  await api.delete(`/subjects/${id}`);
};

export const parseSyllabusAI = async (raw_syllabus: string): Promise<ParsedSyllabus> => {
  const res = await api.post('/subjects/parse-syllabus', { raw_syllabus });
  return res.data;
};

export const applySyllabusToSubject = async (id: string, syllabusData: ParsedSyllabus): Promise<Subject> => {
  const res = await api.post(`/subjects/${id}/syllabus`, syllabusData);
  return res.data;
};

export const createUnit = async (subjectId: string, data: { unit_number: number; title: string; description?: string }): Promise<Unit> => {
  const res = await api.post(`/subjects/${subjectId}/units`, { ...data, subject_id: subjectId });
  return res.data;
};

export const deleteUnit = async (unitId: string): Promise<void> => {
  await api.delete(`/subjects/units/${unitId}`);
};

export const createTopic = async (unitId: string, data: { title: string; description?: string }): Promise<Topic> => {
  const res = await api.post(`/subjects/units/${unitId}/topics`, { ...data, unit_id: unitId });
  return res.data;
};

export const deleteTopic = async (topicId: string): Promise<void> => {
  await api.delete(`/topics/${topicId}`);
};

export const fetchTopicDetail = async (id: string): Promise<any> => {
  const res = await api.get(`/topics/${id}`);
  return res.data;
};

export const updateTopic = async (id: string, data: { title?: string; description?: string; status?: string }): Promise<Topic> => {
  const res = await api.put(`/topics/${id}`, data);
  return res.data;
};

export const generateTopicResource = async (topicId: string, resource_type: string, custom_focus?: string): Promise<any> => {
  const res = await api.post(`/topics/${topicId}/generate`, { resource_type, custom_focus });
  return res.data;
};

export const fetchTopicMaterials = async (topicId: string): Promise<LearningMaterial[]> => {
  const res = await api.get(`/topics/${topicId}/materials`);
  return res.data;
};

export const updateMaterial = async (materialId: string, data: { title?: string; markdown_text?: string }): Promise<LearningMaterial> => {
  const res = await api.put(`/topics/materials/${materialId}`, data);
  return res.data;
};

export const fetchTopicExercises = async (topicId: string): Promise<Exercise[]> => {
  const res = await api.get(`/topics/${topicId}/exercises`);
  return res.data;
};

export const recordExerciseAttempt = async (exerciseId: string, data: { submission_text?: string; performance_rating?: string; score?: number; level_completed?: number }): Promise<Attempt> => {
  const res = await api.post(`/exercises/${exerciseId}/attempt`, data);
  return res.data;
};

export const evaluateExerciseSubmission = async (exerciseId: string, data: { submission_text: string; student_items?: string[] }): Promise<any> => {
  const res = await api.post(`/exercises/${exerciseId}/evaluate`, data);
  return res.data;
};

export const fetchTopicQuestions = async (topicId: string): Promise<Question[]> => {
  const res = await api.get(`/topics/${topicId}/questions`);
  return res.data;
};

export const submitWrittenAnswerAI = async (questionId: string, submission_text: string): Promise<any> => {
  const res = await api.post(`/questions/${questionId}/submit`, { submission_text });
  return res.data;
};

export const submitWrittenAnswerSelf = async (questionId: string, data: { submission_text: string; performance_rating: string }): Promise<any> => {
  const res = await api.post(`/questions/${questionId}/self-eval`, data);
  return res.data;
};

export const fetchDueRevisions = async (): Promise<RevisionItem[]> => {
  const res = await api.get('/revision/due');
  return res.data;
};

export const reviewScheduledItem = async (scheduleId: string, performance_rating: string): Promise<any> => {
  const res = await api.post(`/revision/${scheduleId}/review`, { performance_rating });
  return res.data;
};

export const generateAssessment = async (topicId: string, distribution?: Record<string, number>): Promise<any> => {
  const res = await api.post(`/topics/${topicId}/assessment/generate`, { distribution });
  return res.data;
};

export const submitAssessment = async (topicId: string, answers: Array<{ item_id: string; item_type: string; user_answer: string }>): Promise<any> => {
  const res = await api.post(`/topics/${topicId}/assessment/submit`, { answers });
  return res.data;
};

export const fetchLatestAssessment = async (topicId: string): Promise<any> => {
  const res = await api.get(`/topics/${topicId}/assessment/latest`);
  return res.data;
};

// ----------------- Personal Private Notes (Strictly Offline & Private) -----------------
export const fetchPersonalNotes = async (topicId: string): Promise<{ topic_id: string; personal_notes: string }> => {
  const res = await api.get(`/topics/${topicId}/personal-notes`);
  return res.data;
};

export const updatePersonalNotes = async (topicId: string, personalNotes: string): Promise<{ topic_id: string; personal_notes: string; message: string }> => {
  const res = await api.put(`/topics/${topicId}/personal-notes`, { personal_notes: personalNotes });
  return res.data;
};

export const appendPersonalNote = async (topicId: string, noteToAppend: string): Promise<{ topic_id: string; personal_notes: string; message: string }> => {
  const res = await api.post(`/topics/${topicId}/personal-notes/append`, { note_to_append: noteToAppend });
  return res.data;
};

// ----------------- Topic MCQ Assessment -----------------
export const fetchTopicMCQs = async (topicId: string): Promise<MCQQuestion[]> => {
  const res = await api.get(`/topics/${topicId}/mcqs`);
  return res.data;
};

export const generateTopicMCQs = async (topicId: string, numQuestions: number = 5): Promise<MCQQuestion[]> => {
  const res = await api.post(`/topics/${topicId}/mcqs/generate`, { num_questions: numQuestions });
  return res.data;
};

export const submitMCQAssessment = async (
  topicId: string,
  answers: Array<{ question_id: string; selected_option_id: string }>
): Promise<MCQAssessmentResult> => {
  const res = await api.post(`/topics/${topicId}/mcqs/submit`, { answers });
  return res.data;
};

export const fetchLatestMCQAssessment = async (topicId: string): Promise<MCQAssessmentResult | null> => {
  const res = await api.get(`/topics/${topicId}/mcqs/latest-assessment`);
  return res.data;
};
