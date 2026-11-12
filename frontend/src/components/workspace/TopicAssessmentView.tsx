import React, { useState, useEffect } from 'react';
import { Award, CheckCircle, AlertTriangle, ArrowRight, RotateCcw, BrainCircuit, Sparkles } from 'lucide-react';
import { generateAssessment, submitAssessment, fetchLatestAssessment } from '../../api/client';

interface Props {
  topicId: string;
  topicTitle: string;
}

export const TopicAssessmentView: React.FC<Props> = ({ topicId, topicTitle }) => {
  const [assessmentData, setAssessmentData] = useState<any | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [assessmentResult, setAssessmentResult] = useState<any | null>(null);

  // Load latest result if exists
  useEffect(() => {
    fetchLatestAssessment(topicId)
      .then(res => setAssessmentResult(res))
      .catch(() => {});
  }, [topicId]);

  const handleStartNewAssessment = async () => {
    setIsGenerating(true);
    setAssessmentResult(null);
    try {
      const data = await generateAssessment(topicId, {
        definitions: 20,
        short_answer: 30,
        long_answer: 30,
        conceptual: 20,
      });
      setAssessmentData(data);
      setUserAnswers({});
    } catch (err) {
      console.error('Error starting assessment:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!assessmentData) return;
    setIsSubmitting(true);
    try {
      const answersPayload = assessmentData.assessment_items.map((item: any) => ({
        item_id: item.item_id,
        item_type: item.type,
        user_answer: userAnswers[item.item_id] || '',
      }));

      const res = await submitAssessment(topicId, answersPayload);
      setAssessmentResult(res);
      setAssessmentData(null);
    } catch (err) {
      console.error('Error submitting assessment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Assessment Header */}
      <div className="border border-stone-200 rounded-lg p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-wider rounded bg-stone-900 text-white">
                Topic Diagnostic Assessment
              </span>
              <span className="text-xs font-semibold text-stone-800">{topicTitle}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Comprehensive exam evaluating complete curriculum retention across definitions, short notes, essay mechanisms, and conceptual transfer.
            </p>
          </div>

          <button
            disabled={isGenerating}
            onClick={handleStartNewAssessment}
            className="px-4 py-2 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing Exam...' : 'Take New Assessment'}</span>
          </button>
        </div>

        {/* Distribution Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] text-stone-400 font-mono block">20% WEIGHT</span>
            <span className="font-semibold text-stone-800">Formal Definitions</span>
          </div>
          <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] text-stone-400 font-mono block">30% WEIGHT</span>
            <span className="font-semibold text-stone-800">Short Answers</span>
          </div>
          <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] text-stone-400 font-mono block">30% WEIGHT</span>
            <span className="font-semibold text-stone-800">Long Essay Question</span>
          </div>
          <div className="p-2.5 rounded bg-stone-50 border border-stone-200 text-center">
            <span className="text-[10px] text-stone-400 font-mono block">20% WEIGHT</span>
            <span className="font-semibold text-stone-800">Conceptual Analysis</span>
          </div>
        </div>
      </div>

      {/* Active Assessment Questions Form */}
      {assessmentData && (
        <div className="space-y-6 animate-fade-in">
          {assessmentData.assessment_items.map((item: any, idx: number) => (
            <div key={item.item_id} className="border border-stone-200 rounded-lg p-6 bg-white space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-mono font-semibold text-stone-700">
                  Question {idx + 1} • <span className="capitalize">{item.type.replace('_', ' ')}</span> ({item.weight_percentage}%)
                </span>
              </div>
              <p className="text-sm font-medium font-serif text-stone-900">{item.question}</p>
              <textarea
                value={userAnswers[item.item_id] || ''}
                onChange={(e) => setUserAnswers({ ...userAnswers, [item.item_id]: e.target.value })}
                placeholder="Write your complete response..."
                rows={item.type === 'long_answer' ? 8 : item.type === 'short_answer' ? 5 : 3}
                className="w-full p-3 text-sm rounded-lg border border-stone-300 focus:border-stone-800 focus:ring-1 focus:ring-stone-800 outline-none font-serif leading-relaxed"
              />
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Grading & Diagnosing...' : 'Submit Assessment for Diagnostic Review'}
            </button>
          </div>
        </div>
      )}

      {/* Assessment Diagnostic Results Summary */}
      {assessmentResult && (
        <div className="border border-stone-200 rounded-lg p-6 sm:p-8 bg-white shadow-2xs space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-3">
            <div>
              <span className="text-xs text-stone-400 font-mono uppercase tracking-wider">
                Diagnostic Outcome
              </span>
              <h3 className="text-xl font-bold text-stone-900">Topic Performance Report</h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Completed on {new Date(assessmentResult.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-[10px] text-stone-400 uppercase font-mono">Mastery Score</span>
                <div className={`text-3xl font-bold font-mono ${
                  assessmentResult.score_percentage >= 80 ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {assessmentResult.score_percentage}%
                </div>
              </div>
            </div>
          </div>

          {/* Weak Areas & Critical Gaps */}
          {assessmentResult.weak_areas && assessmentResult.weak_areas.length > 0 && (
            <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200 space-y-2">
              <span className="text-xs font-semibold text-amber-900 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Identified Academic Deficits & Missing Concepts:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-amber-950 font-medium">
                {assessmentResult.weak_areas.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Targeted Spaced Revision Recommendations */}
          {assessmentResult.recommended_revision && assessmentResult.recommended_revision.length > 0 && (
            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
              <span className="text-xs font-semibold text-stone-900 flex items-center space-x-1.5">
                <BrainCircuit className="w-4 h-4 text-stone-700" />
                <span>Prescribed Revision Actions:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-stone-700">
                {assessmentResult.recommended_revision.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
