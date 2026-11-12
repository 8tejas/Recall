import React, { useState } from 'react';
import { Eye, EyeOff, Check, Sparkles } from 'lucide-react';
import { DefinitionRecallPayload } from '../../types';
import { evaluateExerciseSubmission } from '../../api/client';

interface Props {
  exerciseId: string;
  payload: DefinitionRecallPayload;
  onCompleted?: () => void;
}

export const DefinitionRecallView: React.FC<Props> = ({ exerciseId, payload, onCompleted }) => {
  const [submission, setSubmission] = useState<string>('');
  const [showModel, setShowModel] = useState<boolean>(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

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
      console.error('Error evaluating definition:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="border border-stone-200 rounded-lg p-6 bg-white space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-stone-100 text-stone-700">
              Mode D: Definition Recall
            </span>
            <span className="text-xs font-semibold text-stone-800">{payload.term}</span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Reproduce the formal academic definition. Evaluated on conceptual category (genus) and essential attributes.
          </p>
        </div>
      </div>

      {payload.category_genus && (
        <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs text-stone-700 flex items-center justify-between">
          <span><strong>Category / Genus:</strong> {payload.category_genus}</span>
          {payload.essential_attributes && payload.essential_attributes.length > 0 && (
            <span className="text-[11px] text-stone-500">
              Required attributes: {payload.essential_attributes.length}
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        <label className="text-xs font-semibold text-stone-700 block">
          State the formal definition of <em>{payload.term}</em>:
        </label>
        <textarea
          value={submission}
          onChange={(e) => setSubmission(e.target.value)}
          placeholder={`State the formal academic definition of ${payload.term}...`}
          rows={4}
          className="w-full p-3 text-sm rounded-lg border border-stone-300 focus:border-stone-800 focus:ring-1 focus:ring-stone-800 outline-none font-serif leading-relaxed"
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowModel(!showModel)}
            className="text-xs text-stone-600 hover:text-stone-900 flex items-center space-x-1"
          >
            {showModel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showModel ? 'Hide Reference Definition' : 'Show Reference Definition'}</span>
          </button>

          <button
            disabled={isEvaluating || !submission.trim()}
            onClick={handleEvaluate}
            className="px-4 py-2 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {isEvaluating ? 'Evaluating...' : 'Check Definition'}
          </button>
        </div>
      </div>

      {showModel && (
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-1">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Canonical Academic Definition:
          </span>
          <p className="text-sm font-serif leading-relaxed text-stone-800">
            {payload.reference_definition}
          </p>
        </div>
      )}

      {evalResult && (
        <div className="p-4 rounded-lg border border-stone-200 bg-stone-50 text-xs space-y-2">
          <div className="flex justify-between items-center font-mono">
            <span className="font-semibold text-stone-700">Semantic Accuracy:</span>
            <span className="font-bold text-stone-900 text-sm">{Math.round(evalResult.score * 100)}%</span>
          </div>
          <p className="text-stone-700 font-medium">{evalResult.assessment}</p>
        </div>
      )}
    </div>
  );
};
