import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
  Award,
  ArrowRight,
  BookOpen,
  Check,
  Brain,
  Plus
} from 'lucide-react';
import { MCQQuestion, MCQAssessmentResult } from '../../types';
import {
  fetchTopicMCQs,
  generateTopicMCQs,
  submitMCQAssessment,
  fetchLatestMCQAssessment
} from '../../api/client';

interface Props {
  topicId: string;
  topicTitle: string;
  onMasteryChange?: () => void;
}

export const MCQAssessmentView: React.FC<Props> = ({ topicId, topicTitle, onMasteryChange }) => {
  const [mcqs, setMcqs] = useState<MCQQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [assessmentResult, setAssessmentResult] = useState<MCQAssessmentResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRetaking, setIsRetaking] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [questions, latestResult] = await Promise.all([
        fetchTopicMCQs(topicId),
        fetchLatestMCQAssessment(topicId)
      ]);
      setMcqs(questions);
      setAssessmentResult(latestResult);
    } catch (err) {
      console.error('Error loading MCQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setSelectedAnswers({});
    setIsRetaking(false);
  }, [topicId]);

  const handleGenerateMCQs = async () => {
    setIsGenerating(true);
    try {
      const newQuestions = await generateTopicMCQs(topicId, 5);
      setMcqs(newQuestions);
      setAssessmentResult(null);
      setSelectedAnswers({});
      setIsRetaking(true);
    } catch (err) {
      console.error('Error generating MCQs:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMoreMCQs = async () => {
    setIsGeneratingMore(true);
    try {
      const newQuestions = await generateTopicMCQs(topicId, 5);
      setMcqs(prev => {
        const existingIds = new Set(prev.map(q => q.id));
        const filteredNew = newQuestions.filter(q => !existingIds.has(q.id));
        return [...prev, ...filteredNew];
      });
      setAssessmentResult(null);
      setIsRetaking(true);
    } catch (err) {
      console.error('Error generating additional MCQs:', err);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmit = async () => {
    if (mcqs.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = mcqs.map(q => ({
        question_id: q.id,
        selected_option_id: selectedAnswers[q.id] || ''
      }));
      const result = await submitMCQAssessment(topicId, payload);
      setAssessmentResult(result);
      setIsRetaking(false);
      if (onMasteryChange) onMasteryChange();
    } catch (err) {
      console.error('Error submitting MCQ assessment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setIsRetaking(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-stone-400 dark:text-zinc-500 font-mono">
        Loading topic MCQs...
      </div>
    );
  }

  // Case 1: No MCQs generated yet
  if (mcqs.length === 0 && !isGenerating) {
    return (
      <div className="border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl p-8 sm:p-12 text-center bg-white dark:bg-[#18181b] space-y-4 max-w-3xl mx-auto">
        <HelpCircle className="w-10 h-10 text-stone-300 dark:text-zinc-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100">
            No Diagnostic MCQs Generated Yet
          </h3>
          <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-md mx-auto">
            Generate 5 university-grade Multiple Choice Questions testing conceptual invariants, canonical architecture, and operational trade-offs for <em>{topicTitle}</em>.
          </p>
        </div>
        <button
          onClick={handleGenerateMCQs}
          disabled={isGenerating}
          className="px-4 py-2.5 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center space-x-1.5 mx-auto shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
          <span>{isGenerating ? 'Synthesizing Questions...' : 'Generate 5 Topic MCQs'}</span>
        </button>
      </div>
    );
  }

  const answeredCount = Object.keys(selectedAnswers).filter(k => selectedAnswers[k]).length;
  const isAllAnswered = mcqs.length > 0 && answeredCount === mcqs.length;
  const showQuizForm = isRetaking || !assessmentResult;

  return (
    <div className="space-y-6 max-w-4xl text-stone-900 dark:text-zinc-100 animate-fade-in">
      {/* Header Bar */}
      <div className="border border-stone-200 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-[#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
              Diagnostic Assessment
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">{topicTitle}</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
            4-option multiple choice testing foundational definitions, architecture, and boundary conditions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="px-2 py-1 rounded text-[11px] font-mono bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 font-semibold border border-stone-200 dark:border-zinc-700">
            {mcqs.length} Total MCQs
          </span>

          <button
            onClick={handleGenerateMoreMCQs}
            disabled={isGeneratingMore || isGenerating}
            className="px-3 py-1.5 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center space-x-1 shadow-2xs disabled:opacity-50"
            title="Generate 5 additional questions for this topic"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
            <span>{isGeneratingMore ? 'Generating More...' : 'Generate 5 More MCQs'}</span>
          </button>

          <button
            onClick={handleGenerateMCQs}
            disabled={isGenerating || isGeneratingMore}
            className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-600 dark:text-zinc-300 text-xs font-medium transition-colors flex items-center space-x-1"
            title="Clear and regenerate fresh set"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isGenerating ? 'Regenerating...' : 'Reset & Re-roll'}</span>
          </button>
        </div>
      </div>

      {/* Outcome Diagnostic Scorecard (When review exists & not retaking) */}
      {!showQuizForm && assessmentResult && (
        <div className="border border-stone-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-[#18181b] shadow-2xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800 gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 dark:text-zinc-500">
                Diagnostic Outcome
              </span>
              <h3 className="text-xl font-bold text-stone-900 dark:text-zinc-100">MCQ Performance Report</h3>
              <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
                Completed on {new Date(assessmentResult.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-[10px] text-stone-400 dark:text-zinc-500 uppercase font-mono">Accuracy</span>
                <div className={`text-3xl font-bold font-mono ${
                  assessmentResult.score_percentage >= 80 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                }`}>
                  {assessmentResult.score_percentage}%
                </div>
                <span className="text-[11px] text-stone-500 dark:text-zinc-400">
                  {assessmentResult.correct_count} of {assessmentResult.total_questions} Correct
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={handleGenerateMoreMCQs}
                  disabled={isGeneratingMore}
                  className="px-3.5 py-2 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
                  <span>{isGeneratingMore ? 'Adding 5 Questions...' : 'Generate 5 More MCQs'}</span>
                </button>

                <button
                  onClick={handleRetake}
                  className="px-3.5 py-2 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-medium hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake Current Set</span>
                </button>
              </div>
            </div>
          </div>

          {/* Question-by-Question Diagnostic Review */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-zinc-400 font-mono">
              Detailed Question Rationales
            </h4>

            {assessmentResult.detailed_feedback?.map((fb, idx) => (
              <div
                key={fb.question_id || idx}
                className={`p-4 sm:p-5 rounded-xl border transition-all space-y-3 ${
                  fb.is_correct
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono font-semibold text-stone-500 dark:text-zinc-400">
                      Question {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-stone-900 dark:text-zinc-100 font-serif">
                      {fb.question_text}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 flex items-center space-x-1 ${
                    fb.is_correct
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                  }`}>
                    {fb.is_correct ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{fb.is_correct ? 'CORRECT' : 'INCORRECT'}</span>
                  </span>
                </div>

                {/* Options List with Visual Feedback */}
                <div className="space-y-1.5 pt-1">
                  {fb.options?.map((opt) => {
                    const isSelected = fb.selected_option_id === opt.id;
                    const isCorrectOption = fb.correct_option_id === opt.id;

                    let badgeClasses = 'border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-stone-700 dark:text-zinc-300';
                    if (isCorrectOption) {
                      badgeClasses = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-medium ring-1 ring-emerald-500';
                    } else if (isSelected && !isCorrectOption) {
                      badgeClasses = 'border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 line-through';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${badgeClasses}`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-[11px] w-5 text-center">
                            {opt.id}.
                          </span>
                          <span>{opt.text}</span>
                        </div>
                        {isCorrectOption && (
                          <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold uppercase">
                            Correct Answer
                          </span>
                        )}
                        {isSelected && !isCorrectOption && (
                          <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400 font-semibold uppercase">
                            Your Choice
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Rationale */}
                {fb.explanation && (
                  <div className="p-3 rounded-lg bg-stone-100/70 dark:bg-zinc-850 border border-stone-200 dark:border-zinc-800 text-xs text-stone-700 dark:text-zinc-300 space-y-1">
                    <strong className="block text-stone-900 dark:text-zinc-100 font-sans text-[11px]">
                      Academic Explanation:
                    </strong>
                    <p className="font-serif leading-relaxed text-[11px]">{fb.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Quiz Form */}
      {showQuizForm && (
        <div className="space-y-6">
          <div className="space-y-4">
            {mcqs.map((q, qIdx) => (
              <div
                key={q.id}
                className="border border-stone-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 bg-white dark:bg-[#18181b] shadow-2xs space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
                  <span className="text-xs font-mono font-semibold text-stone-500 dark:text-zinc-400">
                    Question {qIdx + 1} of {mcqs.length}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400">
                    {q.difficulty}
                  </span>
                </div>

                <p className="text-sm font-semibold font-serif text-stone-900 dark:text-zinc-100 leading-relaxed">
                  {q.question_text}
                </p>

                {/* Options Radio List */}
                <div className="space-y-2">
                  {q.options?.map((opt) => {
                    const isSelected = selectedAnswers[q.id] === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center space-x-3 ${
                          isSelected
                            ? 'border-stone-900 dark:border-zinc-100 bg-stone-50 dark:bg-zinc-800/90 ring-1 ring-stone-900 dark:ring-zinc-100 font-medium'
                            : 'border-stone-200 dark:border-zinc-800 hover:border-stone-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-800 dark:text-zinc-200 hover:bg-stone-50/50 dark:hover:bg-zinc-800/50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                            : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400'
                        }`}>
                          {opt.id}
                        </span>
                        <span className="text-xs leading-relaxed">{opt.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submission Bar */}
          <div className="border border-stone-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-[#18181b] flex items-center justify-between shadow-2xs">
            <div className="text-xs text-stone-500 dark:text-zinc-400 font-mono">
              Answered <strong className="text-stone-900 dark:text-zinc-100">{answeredCount}</strong> of {mcqs.length} questions
            </div>

            <button
              disabled={isSubmitting || answeredCount === 0}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white disabled:opacity-40 transition-colors flex items-center space-x-1.5 shadow-2xs"
            >
              <Award className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Grading Answers...' : 'Submit MCQ Assessment'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

