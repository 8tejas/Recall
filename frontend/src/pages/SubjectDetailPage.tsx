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
    <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Subject Header */}
      <div className="border border-stone-200 rounded-xl p-6 bg-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-3">
          <div className="space-y-1 flex-1">
            {isEditingTitle ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="text-lg font-bold text-stone-900 border-b border-stone-800 outline-none"
                />
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="Code"
                  className="text-xs font-mono text-stone-500 border-b border-stone-300 outline-none w-20"
                />
                <button
                  onClick={handleSaveTitle}
                  className="px-2.5 py-1 rounded bg-stone-900 text-white text-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="text-xs text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <h1 className="text-xl font-bold tracking-tight text-stone-900 font-serif">
                  {subject.name}
                </h1>
                {subject.code && (
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono text-xs font-semibold">
                    {subject.code}
                  </span>
                )}
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <p className="text-xs text-stone-500">
              {subject.description || 'Structured academic curriculum decomposition.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDeleteSubject}
              className="p-1.5 rounded text-stone-400 hover:text-rose-600 hover:bg-stone-50 transition-colors"
              title="Delete Subject"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-mono">
            <span>Overall Syllabus Mastery</span>
            <span className="font-semibold text-stone-900">{progressPct}% ({masteredCount} / {allTopics.length} Topics Mastered)</span>
          </div>
          <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full bg-stone-900 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Units & Topics Hierarchy */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-700 uppercase tracking-wider font-mono">
            Syllabus Units & Topics
          </h2>
          <button
            onClick={() => setShowAddUnit(true)}
            className="text-xs text-stone-800 hover:text-stone-900 font-medium flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Unit</span>
          </button>
        </div>

        {showAddUnit && (
          <div className="p-4 border border-stone-200 rounded-xl bg-stone-50 flex items-center space-x-2">
            <input
              type="text"
              value={newUnitTitle}
              onChange={(e) => setNewUnitTitle(e.target.value)}
              placeholder="e.g. Unit 4: Memory Management"
              className="flex-1 px-3 py-1.5 text-xs border border-stone-300 rounded-lg outline-none bg-white focus:border-stone-800"
            />
            <button
              onClick={handleAddUnitSubmit}
              className="px-3 py-1.5 rounded bg-stone-900 text-white text-xs font-medium"
            >
              Add Unit
            </button>
            <button
              onClick={() => setShowAddUnit(false)}
              className="px-2 py-1.5 text-xs text-stone-500 hover:text-stone-800"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Units List */}
        {!subject.units || subject.units.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-stone-200 rounded-xl text-stone-500 text-xs">
            No units in this subject yet. Click "Add New Unit" above.
          </div>
        ) : (
          <div className="space-y-4">
            {subject.units.map((unit) => (
              <div
                key={unit.id}
                className="border border-stone-200 rounded-xl bg-white overflow-hidden shadow-2xs"
              >
                {/* Unit Header */}
                <div className="p-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-stone-500">
                      UNIT {unit.unit_number}
                    </span>
                    <h3 className="text-xs font-semibold text-stone-900">
                      {unit.title}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setNewTopicUnitId(unit.id)}
                      className="text-[11px] text-stone-600 hover:text-stone-900 font-medium flex items-center space-x-1 px-2 py-1 rounded hover:bg-stone-200/50"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Topic</span>
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Delete Unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Add Topic Input */}
                {newTopicUnitId === unit.id && (
                  <div className="p-3 bg-stone-100/50 border-b border-stone-200/60 flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="Topic Title (e.g. Virtual Memory & Page Replacement)"
                      className="flex-1 px-3 py-1.5 text-xs border border-stone-300 rounded-lg outline-none bg-white focus:border-stone-800"
                    />
                    <button
                      onClick={() => handleAddTopicSubmit(unit.id)}
                      className="px-3 py-1.5 rounded bg-stone-900 text-white text-xs font-medium"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setNewTopicUnitId(null);
                        setNewTopicTitle('');
                      }}
                      className="px-2 py-1.5 text-xs text-stone-500"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Topics List */}
                <div className="divide-y divide-stone-100">
                  {!unit.topics || unit.topics.length === 0 ? (
                    <div className="p-4 text-xs text-stone-400 italic">
                      No topics added to this unit yet.
                    </div>
                  ) : (
                    unit.topics.map((topic) => (
                      <div
                        key={topic.id}
                        onClick={() => navigate(`/topics/${topic.id}`)}
                        className="p-3.5 hover:bg-stone-50/70 transition-colors flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3 min-w-0 pr-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            topic.status === 'mastered'
                              ? 'bg-emerald-600'
                              : topic.status === 'in_progress'
                              ? 'bg-amber-600'
                              : 'bg-stone-300'
                          }`} />
                          <span className="text-xs font-medium text-stone-900 group-hover:text-stone-900 truncate">
                            {topic.title}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600 font-mono uppercase">
                            {topic.status.replace('_', ' ')}
                          </span>
                          <button
                            onClick={(e) => handleDeleteTopic(topic.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                            title="Delete Topic"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:translate-x-0.5 transition-all" />
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
