import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { fetchDueRevisions, reviewScheduledItem } from '../api/client';
import { RevisionItem } from '../types';

export const RevisionPage: React.FC = () => {
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeItem, setActiveItem] = useState<RevisionItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const loadDueItems = async () => {
    try {
      const data = await fetchDueRevisions();
      setItems(data);
    } catch (err) {
      console.error('Error fetching due revisions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDueItems();
  }, []);

  const handleReviewRating = async (scheduleId: string, rating: string) => {
    setIsSubmitting(true);
    try {
      await reviewScheduledItem(scheduleId, rating);
      setActiveItem(null);
      await loadDueItems();
    } catch (err) {
      console.error('Error recording review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-stone-400 font-mono">
        Loading spaced revision schedule...
      </div>
    );
  }

  const overdueList = items.filter(i => i.is_overdue);
  const upcomingList = items.filter(i => !i.is_overdue);

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
              Spaced Revision Queue
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              FSRS memory scheduling engine. Items with lapses or decay are prioritized to consolidate long-term retention.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-stone-100 text-stone-700 font-mono text-xs font-semibold">
            {overdueList.length} Due Now
          </span>
        </div>
      </div>

      {/* Overdue Review Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-900 font-mono flex items-center space-x-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Items Ready for Active Retrieval ({overdueList.length})</span>
        </h2>

        {overdueList.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/50 text-stone-500 text-xs space-y-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="font-medium text-stone-700">No overdue items in memory queue!</p>
            <p className="text-[11px] text-stone-400">All studied definitions and written questions have been recalled on schedule.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-200 border border-stone-200 rounded-xl bg-white overflow-hidden shadow-2xs">
            {overdueList.map((item) => (
              <div
                key={item.schedule_id}
                className="p-4 sm:p-5 hover:bg-stone-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center space-x-2 text-[10px] text-stone-400 font-mono">
                    <span className="uppercase">{item.item_type}</span>
                    <span>•</span>
                    <span>{item.subject_title || 'Subject'}</span>
                    <span>/</span>
                    <span>{item.topic_title || 'Topic'}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-900">
                    {item.title}
                  </h3>
                  <div className="flex items-center space-x-3 text-[11px] text-stone-500 font-mono pt-1">
                    <span>Stability: {item.stability}</span>
                    <span>•</span>
                    <span>Diff: {item.difficulty}/10</span>
                    <span>•</span>
                    <span>Reps: {item.reps}</span>
                    {item.lapses > 0 && (
                      <span className="text-amber-700 font-semibold">• {item.lapses} Lapses</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      if (item.topic_id) {
                        navigate(`/topics/${item.topic_id}/${item.item_type === 'question' ? 'practice' : 'memorize'}`);
                      }
                    }}
                    className="px-3 py-1.5 rounded border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-medium transition-colors"
                  >
                    Open Workspace
                  </button>
                  <button
                    onClick={() => setActiveItem(item)}
                    className="px-3 py-1.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
                  >
                    Quick Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Scheduled Queue */}
      {upcomingList.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span>Future Scheduled Reviews ({upcomingList.length})</span>
          </h2>

          <div className="border border-stone-200 rounded-xl bg-white divide-y divide-stone-100 text-xs">
            {upcomingList.slice(0, 8).map((item) => (
              <div key={item.schedule_id} className="p-3.5 flex items-center justify-between text-stone-600">
                <div className="truncate mr-3">
                  <span className="font-medium text-stone-900 block truncate">{item.title}</span>
                  <span className="text-[10px] text-stone-400 font-mono">{item.topic_title}</span>
                </div>
                <span className="text-[11px] font-mono text-stone-500 shrink-0">
                  Due {new Date(item.due_date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Review Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-lg p-6 space-y-5 animate-scale-up">
            <div className="pb-3 border-b border-stone-100">
              <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                Spaced Review Evaluation
              </span>
              <h3 className="text-base font-bold text-stone-900 mt-0.5">{activeItem.title}</h3>
              <p className="text-xs text-stone-500 mt-1">
                From Topic: {activeItem.topic_title}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-2">
              <p className="font-serif leading-relaxed">
                Retrieve the complete definition, mechanism, or answer formulation from memory before rating yourself.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-800 block">Rate Recall Quality:</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleReviewRating(activeItem.schedule_id, 'completely_remembered')}
                  className="p-2.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 font-medium hover:bg-emerald-100 text-left transition-colors"
                >
                  <strong className="block text-emerald-900">3 • Remembered</strong>
                  <span className="text-[10px] text-emerald-800">Effortless recall. Extends interval.</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleReviewRating(activeItem.schedule_id, 'minor_omissions')}
                  className="p-2.5 rounded-lg border border-stone-300 bg-stone-50 text-stone-900 font-medium hover:bg-stone-100 text-left transition-colors"
                >
                  <strong className="block text-stone-800">2 • Minor Flaws</strong>
                  <span className="text-[10px] text-stone-600">Core remembered with slight delay.</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleReviewRating(activeItem.schedule_id, 'major_omissions')}
                  className="p-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 font-medium hover:bg-amber-100 text-left transition-colors"
                >
                  <strong className="block text-amber-900">1 • Hard (Lapse)</strong>
                  <span className="text-[10px] text-amber-800">Significant gaps. Short review interval.</span>
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleReviewRating(activeItem.schedule_id, 'unable')}
                  className="p-2.5 rounded-lg border border-rose-300 bg-rose-50 text-rose-950 font-medium hover:bg-rose-100 text-left transition-colors"
                >
                  <strong className="block text-rose-900">0 • Blackout</strong>
                  <span className="text-[10px] text-rose-800">Total memory lapse. Resets stability.</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveItem(null)}
                className="px-3 py-1.5 rounded text-xs text-stone-500 hover:text-stone-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
