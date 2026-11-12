import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  FileText,
  Sparkles
} from 'lucide-react';
import { fetchDashboardStats, fetchSubjects } from '../api/client';
import { DashboardStats, Subject } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchSubjects()])
      .then(([statsData, subjectsData]) => {
        setStats(statsData);
        setSubjects(subjectsData);
      })
      .catch((err) => console.error('Failed to load dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-stone-400 text-xs font-mono">
        Loading academic workspace...
      </div>
    );
  }

  const completionRate =
    stats && stats.total_topics > 0
      ? Math.round((stats.mastered_topics / stats.total_topics) * 100)
      : 0;

  return (
    <div className="p-4 sm:p-10 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-fade-in text-stone-900 dark:text-zinc-100">
      {/* Page Title & Fast Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200/80 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-zinc-100 font-serif">
            Academic Overview
          </h1>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-1">
            Syllabus-driven mastery, high-fidelity memorization, and spaced revision.
          </p>
        </div>

        <button
          onClick={() => navigate('/subjects/new')}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Syllabus / Subject</span>
        </button>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/60 space-y-2">
          <div className="flex items-center justify-between text-stone-400 dark:text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Curriculum Topics</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100 font-mono">
            {stats?.total_topics || 0}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-zinc-400">
            Across {stats?.total_subjects || 0} active subjects
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/60 space-y-2">
          <div className="flex items-center justify-between text-stone-400 dark:text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Mastered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100 font-mono">
            {stats?.mastered_topics || 0}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            {completionRate}% verified syllabus mastery
          </div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200/80 dark:border-zinc-800 bg-stone-50/50 dark:bg-zinc-900/60 space-y-2">
          <div className="flex items-center justify-between text-stone-400 dark:text-zinc-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">In Progress</span>
            <Clock className="w-4 h-4 text-stone-600 dark:text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-zinc-100 font-mono">
            {stats?.in_progress_topics || 0}
          </div>
          <div className="text-[11px] text-stone-500 dark:text-zinc-400">
            Active topic workspaces
          </div>
        </div>

        <div className="p-4 rounded-xl border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Due for Revision</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-200 font-mono">
            {stats?.due_revision_count || 0}
          </div>
          <div className="text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center justify-between">
            <span>FSRS scheduled reviews</span>
            {stats && stats.due_revision_count > 0 && (
              <button
                onClick={() => navigate('/revision')}
                className="underline hover:text-amber-950 dark:hover:text-amber-100 text-[11px]"
              >
                Review Now &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subjects Overview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-800 dark:text-zinc-200 uppercase tracking-wider font-mono">
            Enrolled Subjects
          </h2>
          <span className="text-xs text-stone-400 dark:text-zinc-500 font-mono">
            {subjects.length} Total
          </span>
        </div>

        {subjects.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl bg-stone-50/30 dark:bg-zinc-900/30 space-y-3">
            <BookOpen className="w-8 h-8 text-stone-300 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-semibold text-stone-700 dark:text-zinc-300">No Academic Subjects Enrolled</h3>
            <p className="text-xs text-stone-500 dark:text-zinc-400 max-w-sm mx-auto">
              Paste your course syllabus to decompose it into units and topics, or create an individual subject manually.
            </p>
            <button
              onClick={() => navigate('/subjects/new')}
              className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors shadow-2xs"
            >
              Parse Course Syllabus
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => {
              const subTotal = sub.total_topics || 0;
              const subMastered = sub.mastered_topics || 0;
              const pct = subTotal > 0 ? Math.round((subMastered / subTotal) * 100) : 0;

              return (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/subjects/${sub.id}`)}
                  className="p-5 rounded-xl border border-stone-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-stone-400/80 dark:hover:border-zinc-600 transition-all cursor-pointer shadow-2xs flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      {sub.code ? (
                        <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 font-mono text-[10px] font-semibold">
                          {sub.code}
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono">SUBJECT</span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 group-hover:text-stone-900 dark:group-hover:text-zinc-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 line-clamp-1">
                      {sub.name}
                    </h3>
                    {sub.description && (
                      <p className="text-xs text-stone-500 dark:text-zinc-400 line-clamp-2">
                        {sub.description}
                      </p>
                    )}
                  </div>

                  {/* Progress Meter */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-zinc-800">
                    <div className="flex justify-between text-[11px] text-stone-500 dark:text-zinc-400 font-mono">
                      <span>Curriculum Mastery</span>
                      <span className="font-semibold text-stone-800 dark:text-zinc-200">{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-stone-900 dark:bg-zinc-100 rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-400 dark:text-zinc-500 pt-0.5">
                      <span>{subTotal} topics total</span>
                      <span>{subMastered} mastered</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Column Section: Recently Studied & Priority Revision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Recently Studied Topics */}
        <div className="border border-stone-200/80 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-stone-700 dark:text-zinc-300 font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500" />
              <span>Recently Studied Topics</span>
            </span>
          </div>

          {!stats?.recently_studied || stats.recently_studied.length === 0 ? (
            <p className="text-xs text-stone-400 dark:text-zinc-500 py-3">No topic activity recorded yet.</p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-zinc-800">
              {stats.recently_studied.map((item) => (
                <div
                  key={item.topic_id}
                  onClick={() => navigate(`/topics/${item.topic_id}`)}
                  className="py-2.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-zinc-800/60 px-1.5 rounded cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-xs font-medium text-stone-900 dark:text-zinc-100 truncate block">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 block truncate">
                      {item.subject_name}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 font-mono uppercase shrink-0">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revision Priority Alerts */}
        <div className="border border-stone-200/80 dark:border-zinc-800 rounded-xl p-5 bg-white dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-300 font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Spaced Revision Queue</span>
            </span>
            <button
              onClick={() => navigate('/revision')}
              className="text-[11px] text-stone-600 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 font-medium"
            >
              View Full Queue &rarr;
            </button>
          </div>

          {!stats?.revision_needed || stats.revision_needed.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400 dark:text-zinc-500 space-y-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <p>All items currently up to date.</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-zinc-800">
              {stats.revision_needed.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/topics/${item.topic_id}/memorize`)}
                  className="py-2.5 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-zinc-800/60 px-1.5 rounded cursor-pointer transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <span className="text-xs font-medium text-stone-900 dark:text-zinc-100 truncate block">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 block truncate">
                      Topic: {item.topic_title}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block">
                      Due
                    </span>
                    {item.lapses > 0 && (
                      <span className="text-[9px] text-stone-400 dark:text-zinc-500 font-mono">
                        {item.lapses} lapse{item.lapses > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
