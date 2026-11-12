import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Sparkles, UserCheck, Eye, EyeOff, BookOpen } from 'lucide-react';
import { Question } from '../../types';
import { submitWrittenAnswerAI, submitWrittenAnswerSelf } from '../../api/client';

interface Props {
  questions: Question[];
  onAttemptCompleted?: () => void;
}

export const WrittenPracticeView: React.FC<Props> = ({ questions, onAttemptCompleted }) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [studentText, setStudentText] = useState<string>('');
  const [evalMode, setEvalMode] = useState<'ai' | 'self'>('ai');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any | null>(null);
  const [selfResult, setSelfResult] = useState<any | null>(null);
  const [showReference, setShowReference] = useState<boolean>(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-stone-200 rounded-lg text-stone-500 text-xs">
        No written practice questions generated yet. Use the "Generate Resources" menu to create 2-mark, 5-mark, and 10-mark examination questions.
      </div>
    );
  }

  const currentQ = questions[selectedIdx];

  const handleAiSubmit = async () => {
    if (!studentText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await submitWrittenAnswerAI(currentQ.id, studentText);
      setAiResult(res);
      setSelfResult(null);
      if (onAttemptCompleted) onAttemptCompleted();
    } catch (err) {
      console.error('Error submitting for AI evaluation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelfEval = async (rating: string) => {
    if (!studentText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await submitWrittenAnswerSelf(currentQ.id, {
        submission_text: studentText,
        performance_rating: rating,
      });
      setSelfResult(res);
      setAiResult(null);
      if (onAttemptCompleted) onAttemptCompleted();
    } catch (err) {
      console.error('Error submitting self evaluation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Selector Tabs (2m, 5m, 10m) */}
      <div className="flex border-b border-stone-200 dark:border-zinc-800 gap-2">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => {
              setSelectedIdx(idx);
              setStudentText('');
              setAiResult(null);
              setSelfResult(null);
              setShowReference(false);
            }}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center space-x-2 ${
              selectedIdx === idx
                ? 'border-stone-900 dark:border-zinc-100 text-stone-900 dark:text-zinc-100 font-semibold'
                : 'border-transparent text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
            }`}
          >
            <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-[10px] font-mono font-bold text-stone-800 dark:text-zinc-200">
              {q.mark_category} Marks
            </span>
            <span className="truncate max-w-[140px]">Q{idx + 1}</span>
          </button>
        ))}
      </div>

      {/* Active Question Card */}
      <div className="border border-stone-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-[#18181b] space-y-5 text-stone-900 dark:text-zinc-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 dark:border-zinc-800 gap-2">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
              {currentQ.mark_category} MARKS EXAM QUESTION
            </span>
          </div>
          {/* Mode Switcher */}
          <div className="flex items-center space-x-1 bg-stone-100 dark:bg-zinc-800 p-0.5 rounded text-xs">
            <button
              onClick={() => setEvalMode('ai')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                evalMode === 'ai' ? 'bg-white dark:bg-zinc-900 shadow-2xs text-stone-900 dark:text-zinc-100' : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
              }`}
            >
              Mode A: AI Evaluation
            </button>
            <button
              onClick={() => setEvalMode('self')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                evalMode === 'self' ? 'bg-white dark:bg-zinc-900 shadow-2xs text-stone-900 dark:text-zinc-100' : 'text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200'
              }`}
            >
              Mode B: Self Evaluation
            </button>
          </div>
        </div>

        {/* Question Statement */}
        <div className="text-base font-medium text-stone-900 dark:text-zinc-100 font-serif leading-relaxed">
          {currentQ.statement}
        </div>

        {/* Essential Keywords & Structural Guidance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-stone-50 dark:bg-zinc-900/60 p-3.5 rounded-lg border border-stone-200 dark:border-zinc-800">
          <div>
            <span className="font-semibold text-stone-700 dark:text-zinc-300 block mb-1">Essential University Terminology:</span>
            <div className="flex flex-wrap gap-1">
              {currentQ.essential_keywords.map((kw, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-white dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 rounded text-[10px] text-stone-700 dark:text-zinc-300 font-mono">
                  {kw}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="font-semibold text-stone-700 dark:text-zinc-300 block mb-1">Recommended Answer Flow:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-stone-600 dark:text-zinc-400">
              {currentQ.structure_guide.map((sg, i) => (
                <li key={i}>{sg}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Student Writing Area */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300 block">
            Your Examination Answer:
          </label>
          <textarea
            value={studentText}
            onChange={(e) => setStudentText(e.target.value)}
            placeholder={`Draft your complete university exam answer for ${currentQ.mark_category} marks...`}
            rows={currentQ.mark_category === 10 ? 10 : currentQ.mark_category === 5 ? 7 : 4}
            className="w-full p-3.5 text-sm rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none font-serif leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowReference(!showReference)}
              className="text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 flex items-center space-x-1"
            >
              {showReference ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showReference ? 'Hide Model Answer' : 'Peek Model Answer'}</span>
            </button>

            {evalMode === 'ai' ? (
              <button
                disabled={isSubmitting || !studentText.trim()}
                onClick={handleAiSubmit}
                className="px-4 py-2 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Evaluating Answer...' : 'Submit for AI Grading'}</span>
              </button>
            ) : (
              <span className="text-xs text-stone-500 dark:text-zinc-400 italic">Compare with model answer below and grade yourself</span>
            )}
          </div>
        </div>

        {/* Model Answer (always visible if requested or in self-eval) */}
        {(showReference || evalMode === 'self') && (
          <div className="p-4 bg-stone-100/70 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-2">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
              Model Reference Answer ({currentQ.mark_category} Marks):
            </span>
            <div className="text-sm font-serif leading-relaxed text-stone-800 dark:text-zinc-200 whitespace-pre-wrap">
              {currentQ.reference_answer}
            </div>

            {/* Expected Marking Points */}
            <div className="pt-2 border-t border-stone-200/80 dark:border-zinc-800">
              <span className="text-[11px] font-semibold text-stone-600 dark:text-zinc-300 block mb-1">Examiner Expected Points:</span>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-stone-700 dark:text-zinc-300">
                {currentQ.key_points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Self-Evaluation Rating Buttons */}
        {evalMode === 'self' && (
          <div className="p-4 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-3">
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200 block">
              Grade your answer performance:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleSelfEval('completely_remembered')}
                disabled={isSubmitting || !studentText.trim()}
                className="p-2 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-xs font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                Completely Remembered
              </button>
              <button
                onClick={() => handleSelfEval('minor_omissions')}
                disabled={isSubmitting || !studentText.trim()}
                className="p-2 rounded border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 text-xs font-medium hover:bg-stone-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
              >
                Minor Omissions
              </button>
              <button
                onClick={() => handleSelfEval('major_omissions')}
                disabled={isSubmitting || !studentText.trim()}
                className="p-2 rounded border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                Major Omissions
              </button>
              <button
                onClick={() => handleSelfEval('unable')}
                disabled={isSubmitting || !studentText.trim()}
                className="p-2 rounded border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 text-xs font-medium hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                Unable to Answer
              </button>
            </div>
          </div>
        )}

        {/* Self Result Feedback */}
        {selfResult && (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="font-semibold">Self-Evaluation Saved!</div>
            <div>Awarded {selfResult.score} / {selfResult.max_score} marks. Added to spaced repetition schedule.</div>
          </div>
        )}

        {/* AI Evaluation Output Panel */}
        {aiResult && (
          <div className="p-5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-zinc-800">
              <div>
                <span className="text-xs text-stone-500 dark:text-zinc-400 uppercase font-mono">Assessed Mark</span>
                <div className="text-3xl font-bold text-stone-900 dark:text-zinc-100 font-mono">
                  {aiResult.estimated_marks} <span className="text-sm font-normal text-stone-500 dark:text-zinc-400">/ {aiResult.maximum_marks}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-stone-500 dark:text-zinc-400">Evaluation Method</span>
                <div className="text-xs font-semibold text-stone-800 dark:text-zinc-200">
                  Semantic University Examiner
                </div>
              </div>
            </div>

            {/* Correct Points */}
            {aiResult.correct_points && aiResult.correct_points.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Valid Points Credited:</span>
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-emerald-900 dark:text-emerald-300">
                  {aiResult.correct_points.map((cp: string, idx: number) => (
                    <li key={idx}>{cp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Points */}
            {aiResult.missing_points && aiResult.missing_points.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Omitted or Underdeveloped Points:</span>
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-amber-900 dark:text-amber-300">
                  {aiResult.missing_points.map((mp: string, idx: number) => (
                    <li key={idx}>{mp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Terminology & Structure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white dark:bg-zinc-800 p-3 rounded border border-stone-200 dark:border-zinc-700">
              <div>
                <span className="font-semibold text-stone-700 dark:text-zinc-200 block">Terminology:</span>
                <p className="text-stone-600 dark:text-zinc-300">{aiResult.terminology_assessment}</p>
              </div>
              <div>
                <span className="font-semibold text-stone-700 dark:text-zinc-200 block">Structure & Flow:</span>
                <p className="text-stone-600 dark:text-zinc-300">{aiResult.structure_assessment}</p>
              </div>
            </div>

            {/* Improvement Suggestions */}
            {aiResult.improvement_suggestions && aiResult.improvement_suggestions.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-stone-700 dark:text-zinc-200">Examiner Advice for Next Attempt:</span>
                <ul className="list-disc list-inside space-y-0.5 text-xs text-stone-600 dark:text-zinc-300">
                  {aiResult.improvement_suggestions.map((sug: string, idx: number) => (
                    <li key={idx}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
