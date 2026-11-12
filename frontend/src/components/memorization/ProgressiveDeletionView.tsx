import React, { useState } from 'react';
import { Eye, EyeOff, Check, RotateCcw, ArrowRight, BrainCircuit, Sparkles } from 'lucide-react';
import { ProgressiveDeletionPayload } from '../../types';
import { recordExerciseAttempt } from '../../api/client';

interface Props {
  exerciseId: string;
  payload: ProgressiveDeletionPayload;
  onCompleted?: () => void;
}

export const ProgressiveDeletionView: React.FC<Props> = ({ exerciseId, payload, onCompleted }) => {
  const [level, setLevel] = useState<number>(1);
  const [userSubmission, setUserSubmission] = useState<string>('');
  const [revealedBlanks, setRevealedBlanks] = useState<Record<number, boolean>>({});
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const toggleBlank = (idx: number) => {
    setRevealedBlanks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleMarkProgress = async (rating: 'completely_remembered' | 'minor_omissions' | 'major_omissions' | 'unable') => {
    setIsSubmitting(true);
    try {
      await recordExerciseAttempt(exerciseId, {
        submission_text: userSubmission,
        performance_rating: rating,
        level_completed: level,
        score: rating === 'completely_remembered' ? 1.0 : rating === 'minor_omissions' ? 0.75 : 0.3
      });
      setFeedbackMessage(
        rating === 'completely_remembered'
          ? 'Marked as remembered! Scheduled for longer review interval.'
          : 'Saved. Item scheduled for earlier review.'
      );
      if (onCompleted) onCompleted();
    } catch (err) {
      console.error('Error saving attempt:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-stone-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-[#18181b] space-y-6 text-stone-900 dark:text-zinc-100">
      {/* Header & Level Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-stone-100 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300">
              Mode A: Progressive Deletion
            </span>
            {payload.source_term && (
              <span className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
                {payload.source_term}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            Progress through 4 cognitive tiers from comprehensive study to blank recall.
          </p>
        </div>

        {/* 4-Tier Stepper */}
        <div className="flex items-center space-x-1">
          {[1, 2, 3, 4].map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setLevel(lvl);
                setShowOriginal(false);
                setFeedbackMessage(null);
              }}
              className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                level === lvl
                  ? 'bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-sm'
                  : 'bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-700'
              }`}
            >
              Tier {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Cognitive Tier Workspace */}
      <div className="space-y-4 min-h-[160px]">
        {/* Tier 1: Full Original Study */}
        {level === 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
              <span className="font-medium text-stone-700 dark:text-zinc-200">Tier 1: Initial Study & Anchor</span>
              <span>Read carefully and absorb core technical terms</span>
            </div>
            <div className="p-5 rounded-lg bg-stone-50/80 dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800 text-stone-800 dark:text-zinc-200 leading-relaxed font-serif text-base select-text">
              {payload.level1_text}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setLevel(2)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors"
              >
                <span>Advance to Tier 2 (Cloze Masking)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tier 2: Cloze Deletion */}
        {level === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
              <span className="font-medium text-stone-700 dark:text-zinc-200">Tier 2: Cloze Sentence Deletion</span>
              <span>Click blanks to reveal hints or verify recall</span>
            </div>
            <div className="p-5 rounded-lg bg-stone-50/80 dark:bg-zinc-900/60 border border-stone-200 dark:border-zinc-800 leading-relaxed text-stone-800 dark:text-zinc-200 text-base font-serif">
              {payload.level2_cloze_tokens && payload.level2_cloze_tokens.length > 0 ? (
                payload.level2_cloze_tokens.map((token, i) => {
                  if (!token.is_cloze) {
                    return <span key={i}>{token.text} </span>;
                  }
                  const isRevealed = !!revealedBlanks[i];
                  return (
                    <button
                      key={i}
                      onClick={() => toggleBlank(i)}
                      className={`inline-flex items-center px-2 py-0.5 mx-1 rounded text-sm transition-all border font-sans ${
                        isRevealed
                          ? 'bg-amber-100/80 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-medium'
                          : 'bg-stone-200/90 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 border-stone-300 dark:border-zinc-700 hover:bg-stone-300 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {isRevealed ? token.text : `[ Blank ${token.cloze_index} ]`}
                    </button>
                  );
                })
              ) : (
                <div className="whitespace-pre-wrap">{payload.level2_masked_text}</div>
              )}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setRevealedBlanks({})}
                className="text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200 flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Blanks</span>
              </button>
              <button
                onClick={() => setLevel(3)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors"
              >
                <span>Advance to Tier 3 (Keywords)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tier 3: Keyword Scaffolding */}
        {level === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
              <span className="font-medium text-stone-700 dark:text-zinc-200">Tier 3: Keyword Scaffolding</span>
              <span>Reconstruct the full definition using only these technical anchor words</span>
            </div>
            <div className="flex flex-wrap gap-2 p-3 bg-stone-100 dark:bg-zinc-900 rounded-lg border border-stone-200 dark:border-zinc-800">
              {payload.level3_keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-zinc-800 border border-stone-300 dark:border-zinc-700 text-stone-800 dark:text-zinc-200 shadow-2xs"
                >
                  {kw}
                </span>
              ))}
            </div>
            <textarea
              value={userSubmission}
              onChange={(e) => setUserSubmission(e.target.value)}
              placeholder="Synthesize the complete academic definition incorporating the anchor keywords above..."
              rows={4}
              className="w-full p-3 text-sm rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none font-serif leading-relaxed"
            />
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 flex items-center space-x-1"
              >
                {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showOriginal ? 'Hide Reference' : 'Compare with Reference'}</span>
              </button>
              <button
                onClick={() => setLevel(4)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors"
              >
                <span>Advance to Tier 4 (Blank Recall)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tier 4: Blank Reproduction */}
        {level === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
              <span className="font-medium text-stone-700 dark:text-zinc-200">Tier 4: Complete Independent Recall</span>
              <span>Reproduce the complete definition without hints</span>
            </div>
            <div className="p-3 bg-stone-100 dark:bg-zinc-900 rounded-lg border border-stone-200 dark:border-zinc-800 text-xs font-semibold text-stone-700 dark:text-zinc-300">
              {payload.level4_prompt}
            </div>
            <textarea
              value={userSubmission}
              onChange={(e) => setUserSubmission(e.target.value)}
              placeholder="Write the complete definition from memory..."
              rows={5}
              className="w-full p-3 text-sm rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none font-serif leading-relaxed"
            />
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowOriginal(!showOriginal)}
                className="text-xs text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 flex items-center space-x-1"
              >
                {showOriginal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showOriginal ? 'Hide Reference' : 'Reveal Model Answer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Reference Answer Comparison Reveal */}
        {showOriginal && (
          <div className="p-4 bg-stone-100/70 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-lg space-y-2 mt-3 animate-fade-in">
            <span className="text-[11px] font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-wider">
              Reference Academic Formulation:
            </span>
            <p className="text-sm font-serif leading-relaxed text-stone-900 dark:text-zinc-100">
              {payload.original_text}
            </p>
          </div>
        )}

        {feedbackMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
            {feedbackMessage}
          </div>
        )}
      </div>

      {/* Academic Self-Rating & Spaced Repetition Triggers */}
      <div className="pt-4 border-t border-stone-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="text-xs text-stone-500 dark:text-zinc-400">
          How reliably did you recall this formulation?
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            disabled={isSubmitting}
            onClick={() => handleMarkProgress('unable')}
            className="px-2.5 py-1 text-xs rounded border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
          >
            Lapse (Unable)
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleMarkProgress('major_omissions')}
            className="px-2.5 py-1 text-xs rounded border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
          >
            Major Omissions
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleMarkProgress('minor_omissions')}
            className="px-2.5 py-1 text-xs rounded border border-stone-200 dark:border-zinc-700 text-stone-700 dark:text-zinc-300 hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Minor Flaws
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleMarkProgress('completely_remembered')}
            className="px-3 py-1 text-xs rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center space-x-1"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mastered (Full Recall)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
