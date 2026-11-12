import React, { useState } from 'react';
import { Lightbulb, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { KeywordScaffoldingPayload } from '../../types';
import { evaluateExerciseSubmission } from '../../api/client';

interface Props {
  exerciseId: string;
  payload: KeywordScaffoldingPayload;
  onCompleted?: () => void;
}

export const KeywordScaffoldingView: React.FC<Props> = ({ exerciseId, payload, onCompleted }) => {
  const [hintIndex, setHintIndex] = useState<number>(0);
  const [submission, setSubmission] = useState<string>('');
  const [showReference, setShowReference] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const handleNextHint = () => {
    if (payload.hint_levels && hintIndex < payload.hint_levels.length) {
      setHintIndex(prev => prev + 1);
    }
  };

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
      console.error('Error evaluating scaffolding:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-[#18181b] space-y-6 text-stone-900 dark:text-zinc-100">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
              Mode C: Keyword Scaffolding
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">{payload.concept_title}</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            Build a comprehensive explanation using these technical anchor concepts. Reveal structural hints progressively if needed.
          </p>
        </div>
      </div>

      {/* Scaffold Key Concepts */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300 block">Anchor Technical Terms:</label>
        <div className="flex flex-wrap gap-2 p-3 bg-stone-50 dark:bg-zinc-900 rounded-lg border border-stone-200 dark:border-zinc-800">
          {payload.scaffolding_keywords.map((kw, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-white dark:bg-zinc-800 text-stone-800 dark:text-zinc-200 border border-stone-300 dark:border-zinc-700 shadow-2xs"
            >
              {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Progressive Hints Accordion */}
      {payload.hint_levels && payload.hint_levels.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={handleNextHint}
              disabled={hintIndex >= payload.hint_levels.length}
              className="text-xs text-amber-800 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 font-medium flex items-center space-x-1.5 disabled:opacity-40"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>
                {hintIndex < payload.hint_levels.length
                  ? `Reveal Structural Hint ${hintIndex + 1} of ${payload.hint_levels.length}`
                  : 'All Hints Revealed'}
              </span>
            </button>
          </div>

          {hintIndex > 0 && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg space-y-1.5 text-xs text-amber-950 dark:text-amber-200 font-serif">
              {payload.hint_levels.slice(0, hintIndex).map((hint, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="font-sans font-bold text-amber-700 dark:text-amber-400 text-[10px]">H{idx + 1}:</span>
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student Drafting Space */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300 block">Synthesized Academic Explanation:</label>
        <textarea
          value={submission}
          onChange={(e) => setSubmission(e.target.value)}
          placeholder="Synthesize a cohesive, university-standard explanation integrating the anchor terms above..."
          rows={5}
          className="w-full p-3 text-sm rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none font-serif leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowReference(!showReference)}
            className="text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 flex items-center space-x-1"
          >
            {showReference ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showReference ? 'Hide Model Explanation' : 'Peek Model Explanation'}</span>
          </button>

          <button
            disabled={isEvaluating || !submission.trim()}
            onClick={handleEvaluate}
            className="px-4 py-2 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 transition-colors flex items-center space-x-1.5"
          >
            {isEvaluating ? <span>Checking...</span> : <span>Evaluate Explanation</span>}
          </button>
        </div>
      </div>

      {showReference && (
        <div className="p-4 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
            Canonical Formulation:
          </span>
          <p className="text-sm font-serif leading-relaxed text-stone-800 dark:text-zinc-200">
            {payload.reference_explanation}
          </p>
        </div>
      )}

      {evalResult && (
        <div className="p-4 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900 text-xs space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="font-semibold text-stone-700 dark:text-zinc-300">Fidelity Score:</span>
            <span className="font-bold text-stone-900 dark:text-zinc-100 text-sm">{Math.round(evalResult.score * 100)}%</span>
          </div>
          <p className="text-stone-700 dark:text-zinc-300 font-medium">{evalResult.assessment}</p>
        </div>
      )}
    </div>
  );
};
