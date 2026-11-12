import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowUpDown } from 'lucide-react';
import { ListSequencePayload } from '../../types';
import { evaluateExerciseSubmission } from '../../api/client';

interface Props {
  exerciseId: string;
  payload: ListSequencePayload;
  onCompleted?: () => void;
}

export const ListSequenceView: React.FC<Props> = ({ exerciseId, payload, onCompleted }) => {
  const [submissionText, setSubmissionText] = useState<string>('');
  const [showModel, setShowModel] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  const handleEvaluate = async () => {
    if (!submissionText.trim()) return;
    setIsEvaluating(true);
    try {
      const studentItems = submissionText.split('\n').map(s => s.trim()).filter(Boolean);
      const res = await evaluateExerciseSubmission(exerciseId, {
        submission_text: submissionText,
        student_items: studentItems
      });
      setEvalResult(res);
      if (onCompleted) onCompleted();
    } catch (err) {
      console.error('Error evaluating sequence:', err);
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
              Mode E: {payload.is_ordered ? 'Ordered Sequence Recall' : 'Categorized List Recall'}
            </span>
            <span className="text-xs font-semibold text-stone-800 dark:text-zinc-200">{payload.list_title}</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            {payload.is_ordered
              ? 'List all items in their precise canonical sequence (one per line).'
              : 'Recall and list all components, characteristics, or classifications (one per line).'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-stone-700 dark:text-zinc-300 block">
          Enter items (one item per line):
        </label>
        <textarea
          value={submissionText}
          onChange={(e) => setSubmissionText(e.target.value)}
          placeholder={`Item 1\nItem 2\nItem 3...`}
          rows={6}
          className="w-full p-3 text-sm rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none font-mono text-xs leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowModel(!showModel)}
            className="text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 flex items-center space-x-1"
          >
            {showModel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showModel ? 'Hide Model Sequence' : 'Peek Model Sequence'}</span>
          </button>

          <button
            disabled={isEvaluating || !submissionText.trim()}
            onClick={handleEvaluate}
            className="px-4 py-2 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 transition-colors"
          >
            {isEvaluating ? 'Evaluating Sequence...' : 'Check Sequence'}
          </button>
        </div>
      </div>

      {showModel && (
        <div className="p-4 bg-stone-50 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-2">
          <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
            Canonical Items:
          </span>
          <ol className="list-decimal list-inside space-y-1 text-xs text-stone-800 dark:text-zinc-200 font-medium">
            {payload.items.map((item, idx) => (
              <li key={idx}>
                {item}
                {payload.descriptions && payload.descriptions[idx] && (
                  <span className="text-stone-500 dark:text-zinc-400 font-normal ml-2">— {payload.descriptions[idx]}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {evalResult && (
        <div className="p-5 rounded-lg border border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/60 space-y-3 text-xs">
          <div className="flex justify-between items-center font-mono pb-2 border-b border-stone-200 dark:border-zinc-800">
            <span className="font-semibold text-stone-700 dark:text-zinc-300">Sequence Precision:</span>
            <span className="font-bold text-stone-900 dark:text-zinc-100 text-sm">
              {Math.round(evalResult.score * 100)}% ({evalResult.recalled_count} / {evalResult.total_items} items)
            </span>
          </div>

          {evalResult.found_items && evalResult.found_items.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Verified Recalled Items:</span>
              <div className="space-y-1">
                {evalResult.found_items.map((fi: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] p-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded border border-emerald-100 dark:border-emerald-800">
                    <span className="font-medium text-emerald-900 dark:text-emerald-200">{fi.item}</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400">
                      {fi.is_correct_position ? 'Position correct' : `Expected #${fi.position_expected}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {evalResult.missing_items && evalResult.missing_items.length > 0 && (
            <div className="space-y-1">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Omitted Items:</span>
              <ul className="list-disc list-inside text-[11px] text-amber-900 dark:text-amber-300">
                {evalResult.missing_items.map((mi: string, idx: number) => (
                  <li key={idx}>{mi}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
