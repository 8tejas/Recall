import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import {
  fetchSubjectDetail,
  deleteSubject,
  updateSubject,
  createUnit,
  deleteUnit,
  createTopic,
  deleteTopic,
} from '../api/client';
import { Subject, Unit, Topic } from '../types';

export const SubjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [newTopicUnitId, setNewTopicUnitId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState<string>('');
  const [newUnitTitle, setNewUnitTitle] = useState<string>('');
  const [showAddUnit, setShowAddUnit] = useState<boolean>(false);

  const navigate = useNavigate();

  const loadData = async () => {
    if (!id) return;
    try {
      const data = await fetchSubjectDetail(id);
      setSubject(data);
      setTitleInput(data.name);
      setCodeInput(data.code || '');
    } catch (err) {
      console.error('Error loading subject:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-stone-400 font-mono">
        Loading syllabus...
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-8 text-center text-xs text-stone-500">
        Subject not found.{' '}
        <button onClick={() => navigate('/dashboard')} className="underline">
          Return to dashboard
        </button>
      </div>
    );
  }

  const allTopics: Topic[] = subject.units ? subject.units.flatMap((u) => u.topics || []) : [];
  const masteredCount = allTopics.filter((t) => t.status === 'mastered').length;
  const progressPct = allTopics.length > 0 ? Math.round((masteredCount / allTopics.length) * 100) : 0;

  const handleSaveTitle = async () => {
    if (!id || !titleInput.trim()) return;
    try {
      await updateSubject(id, { name: titleInput, code: codeInput });
      setIsEditingTitle(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubject = async () => {
    if (!id) return;
    if (confirm('Are you sure you want to delete this subject and all its syllabus topics?')) {
      await deleteSubject(id);
      navigate('/dashboard');
    }
  };

  const handleAddTopicSubmit = async (unitId: string) => {
    if (!newTopicTitle.trim()) return;
    try {
      await createTopic(unitId, { title: newTopicTitle.trim() });
      setNewTopicTitle('');
      setNewTopicUnitId(null);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddUnitSubmit = async () => {
    if (!id || !newUnitTitle.trim()) return;
    try {
      const nextNum = (subject.units?.length || 0) + 1;
      await createUnit(id, {
        unit_number: nextNum,
        title: newUnitTitle.trim(),
      });
      setNewUnitTitle('');
      setShowAddUnit(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTopic = async (tId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this topic?')) {
      await deleteTopic(tId);
      loadData();
    }
  };

  const handleDeleteUnit = async (uId: string) => {
    if (confirm('Delete this unit and its topics?')) {
      await deleteUnit(uId);
      loadData();
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in text-stone-900 dark:text-zinc-100">
      {/* Subject Header */}
      <div className="border border-stone-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 dark:border-zinc-800 gap-3">
          <div className="space-y-1 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="text-lg font-bold text-stone-900 dark:text-zinc-100 border-b border-stone-800 dark:border-zinc-300 bg-transparent outline-none"
                />
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Code"
                  className="text-xs font-mono text-stone-500 dark:text-zinc-400 border-b border-stone-300 dark:border-zinc-700 bg-transparent outline-none w-20"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2.5 py-1 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold tracking-tight text-stone-900 dark:text-zinc-100 font-serif">
                  {subject.name}
                </h1>
                {subject.code && (
                  <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 font-mono text-xs font-semibold">
                    {subject.code}
                  </span>
                )}
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 p-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-stone-500 dark:text-zinc-400">
              {subject.description || 'Structured academic curriculum decomposition.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteSubject}
              className="p-1.5 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
              title="Delete Subject"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400 font-mono">
            <span>Overall Syllabus Mastery</span>
            <span className="font-semibold text-stone-900 dark:text-zinc-100">{progressPct}% ({masteredCount} / {allTopics.length} Topics Mastered)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-stone-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-stone-900 dark:bg-zinc-100 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Units & Topics Hierarchy */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-700 dark:text-zinc-300 uppercase tracking-wider font-mono">
            Syllabus Units & Topics
          </h2>
          <button
            onClick={() => setShowAddUnit(true)}
            className="text-xs text-stone-800 dark:text-zinc-200 hover:text-stone-900 dark:hover:text-zinc-100 font-medium flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Unit</span>
          </button>
        </div>

        {showAddUnit && (
          <div className="p-4 border border-stone-200 dark:border-zinc-800 rounded-xl bg-stone-50 dark:bg-zinc-900 flex items-center space-x-2">
            <input
              type="text"
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              placeholder="e.g. Unit 4: Memory Management"
              className="flex-1 px-3 py-1.5 text-xs border border-stone-300 dark:border-zinc-700 rounded-lg outline-none bg-white dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300"
            />
            <button
              onClick={handleAddUnitSubmit}
              className="px-3 py-1.5 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium"
            >
              Add Unit
            </button>
            <button
              onClick={() => setShowAddUnit(false)}
              className="px-2 py-1.5 text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Units List */}
        {!subject.units || subject.units.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl text-stone-500 dark:text-zinc-400 text-xs">
            No units in this subject yet. Click "Add New Unit" above.
          </div>
        ) : (
          <div className="space-y-4">
            {subject.units.map((unit) => (
              <div
                key={unit.id}
                className="border border-stone-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs"
              >
                {/* Unit Header */}
                <div className="p-4 bg-stone-50/70 dark:bg-zinc-800/50 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-stone-500 dark:text-zinc-400">
                      UNIT {unit.unit_number}
                    </span>
                    <h3 className="text-xs font-semibold text-stone-900 dark:text-zinc-100">
                      {unit.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setNewTopicUnitId(unit.id)}
                      className="text-[11px] text-stone-600 dark:text-zinc-300 hover:text-stone-900 dark:hover:text-zinc-100 font-medium flex items-center space-x-1 px-2 py-1 rounded hover:bg-stone-200/50 dark:hover:bg-zinc-700/50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Topic</span>
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-1 text-stone-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                      title="Delete Unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Add Topic Input */}
                {newTopicUnitId === unit.id && (
                  <div className="p-3 bg-stone-100/50 dark:bg-zinc-800/40 border-b border-stone-200/60 dark:border-zinc-800 flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="Topic Title (e.g. Virtual Memory & Page Replacement)"
                      className="flex-1 px-3 py-1.5 text-xs border border-stone-300 dark:border-zinc-700 rounded-lg outline-none bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300"
                    />
                    <button
                      onClick={() => handleAddTopicSubmit(unit.id)}
                      className="px-3 py-1.5 rounded bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setNewTopicUnitId(null);
                        setNewTopicTitle('');
                      }}
                      className="px-2 py-1.5 text-xs text-stone-500 dark:text-zinc-400"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Topics List */}
                <div className="divide-y divide-stone-100 dark:divide-zinc-800">
                  {!unit.topics || unit.topics.length === 0 ? (
                    <div className="p-4 text-xs text-stone-400 dark:text-zinc-500 italic">
                      No topics added to this unit yet.
                    </div>
                  ) : (
                    unit.topics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => navigate(`/topics/${topic.id}`)}
                        className="p-3.5 hover:bg-stone-50/70 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            topic.status === 'mastered'
                              ? 'bg-emerald-600 dark:bg-emerald-400'
                              : topic.status === 'in_progress'
                              ? 'bg-amber-600 dark:bg-amber-400'
                              : 'bg-stone-300 dark:bg-zinc-600'
                          }`} />
                          <span className="text-xs font-medium text-stone-900 dark:text-zinc-100 group-hover:text-stone-900 dark:group-hover:text-white truncate">
                            {topic.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 text-stone-600 dark:text-zinc-400 font-mono uppercase">
                            {topic.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={(e) => handleDeleteTopic(topic.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity"
                            title="Delete Topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-stone-400 dark:text-zinc-500 group-hover:text-stone-700 dark:group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
