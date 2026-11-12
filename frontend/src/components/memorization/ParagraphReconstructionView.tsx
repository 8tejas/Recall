import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';
import { ParagraphReconPayload } from '../../types';
import { evaluateExerciseSubmission } from '../../api/client';

interface Props {
  exerciseId: string;
  payload: ParagraphReconPayload;
  onCompleted?: () => void;
}

export const ParagraphReconstructionView: React.FC<Props> = ({ exerciseId, payload, onCompleted }) => {
  const [submission, setSubmission] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);

  const handleEvaluate = async () => {
    if (!submission.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await evaluateExerciseSubmission(exerciseId, {
        submission_text: submission,
      });
      setEvalResult(res);
      if (onCompleted) onCompleted();
    } catch (err) {
      console.error('Error evaluating reconstruction:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-[#18181b] space-y-6 text-stone-900 dark:text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
              Mode B: Paragraph Reconstruction
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">{payload.title}</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            Reconstruct the theoretical explanation completely from memory. The engine verifies keyword coverage and technical assertions.
          </p>
        </div>
      </div>

      {/* Writing Area */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300 block">
          Your Written Reconstruction:
        </label>
        <textarea
          value={submission}
          onChange={(e) => setSubmission(e.target.value)}
          placeholder="Type the theoretical paragraph from memory. Include all governing mechanisms, relationships, and technical vocabulary..."
          rows={6}
          className="w-full p-3 text-sm rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none font-serif leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 flex items-center space-x-1"
          >
            {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showOriginal ? 'Hide Reference' : 'Peek Reference'}</span>
          </button>

          <button
            disabled={isEvaluating || !submission.trim()}
            onClick={handleEvaluate}
            className="px-4 py-2 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 transition-colors flex items-center space-x-1.5"
          >
            {isEvaluating ? (
              <span>Evaluating Semantics...</span>
            ) : (
              <>
                <span>Evaluate Reconstruction</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reference Paragraph Peek */}
      {showOriginal && (
        <div className="p-4 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
            Original Academic Paragraph:
          </span>
          <p className="text-sm font-serif leading-relaxed text-stone-800 dark:text-zinc-200">
            {payload.reference_text}
          </p>
        </div>
      )}

      {/* Evaluation Feedback Panel */}
      {evalResult && (
        <div className="p-5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/60 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-zinc-800">
            <div>
              <span className="text-xs text-stone-500 dark:text-zinc-400 uppercase font-mono">Academic Fidelity Score</span>
              <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100 font-mono">
                {Math.round(evalResult.score * 100)}%
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-stone-500 dark:text-zinc-400">Keyword Coverage</span>
              <div className="text-sm font-semibold text-stone-800 dark:text-zinc-200">
                {Math.round(evalResult.keyword_coverage * 100)}% of anchor terms
              </div>
            </div>
          </div>

          <p className="text-xs text-stone-700 dark:text-zinc-300 font-medium">
            {evalResult.assessment}
          </p>

          {/* Matched Keywords */}
          {evalResult.matched_keywords && evalResult.matched_keywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Successfully Recalled Key Terms:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evalResult.matched_keywords.map((kw: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          {evalResult.missing_keywords && evalResult.missing_keywords.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Missing Technical Concepts:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {evalResult.missing_keywords.map((kw: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
