import React, { useState } from 'react';
import {
  Edit3,
  Save,
  FileText,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  X,
  Loader2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { LearningMaterial } from '../../types';
import { updateMaterial, promptCustomMaterial, createCustomMaterial, deleteMaterial } from '../../api/client';
import { MarkdownView } from '../common/MarkdownView';
import { PersonalNotesView } from './PersonalNotesView';

interface Props {
  topicId: string;
  topicTitle: string;
  materials: LearningMaterial[];
  onMaterialUpdated: () => void;
}

export const StudyNotesView: React.FC<Props> = ({
  topicId,
  topicTitle,
  materials,
  onMaterialUpdated,
}) => {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Prompt / Create New Section State
  const [isPromptingOpen, setIsPromptingOpen] = useState<boolean>(false);
  const [promptText, setPromptText] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');

  const suggestions = [
    `Limitations and constraints of ${topicTitle}`,
    `Comparison with alternative approaches`,
    `Step-by-step execution workflow`,
    `Real-world production case study`,
    `Common examination pitfalls and errors`,
  ];

  const handlePromptSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!promptText.trim()) return;

    setIsGenerating(true);
    setGenError(null);
    try {
      const newMat = await promptCustomMaterial(topicId, {
        prompt: promptText.trim(),
        title: customTitle.trim() || undefined,
      });
      setPromptText('');
      setCustomTitle('');
      setIsPromptingOpen(false);
      onMaterialUpdated();
      // Switch to the newly created tab (it will be at index materials.length)
      setActiveIdx(materials.length);
    } catch (err: any) {
      setGenError(err?.response?.data?.detail ?? 'Failed to generate note section. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !manualText.trim()) return;

    setIsGenerating(true);
    setGenError(null);
    try {
      await createCustomMaterial(topicId, {
        title: customTitle.trim(),
        markdown_text: manualText.trim(),
        content_type: 'custom',
      });
      setCustomTitle('');
      setManualText('');
      setIsPromptingOpen(false);
      setIsManualMode(false);
      onMaterialUpdated();
      setActiveIdx(materials.length);
    } catch (err: any) {
      setGenError(err?.response?.data?.detail ?? 'Failed to create section.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTab = async (materialId: string, title: string) => {
    if (!window.confirm(`Delete the section "${title}"?`)) return;
    try {
      await deleteMaterial(materialId);
      if (activeIdx >= materials.length - 1 && activeIdx > 0) {
        setActiveIdx(activeIdx - 1);
      }
      onMaterialUpdated();
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  const currentMat = materials[activeIdx] || materials[0];

  const handleStartEdit = () => {
    if (!currentMat) return;
    setEditText(currentMat.markdown_text);
    setEditTitle(currentMat.title);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!currentMat) return;
    setIsSaving(true);
    try {
      await updateMaterial(currentMat.id, {
        title: editTitle.trim() || currentMat.title,
        markdown_text: editText,
      });
      setIsEditing(false);
      onMaterialUpdated();
    } catch (err) {
      console.error('Error saving updated material:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Dynamic Materials Tab Bar */}
      <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 gap-2 pb-0.5 overflow-x-auto select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {materials.map((m, idx) => (
            <button
              key={m.id}
              onClick={() => {
                setActiveIdx(idx);
                setIsEditing(false);
                setIsPromptingOpen(false);
              }}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeIdx === idx && !isPromptingOpen
                  ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
                  : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              {m.content_type === 'custom' ? (
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {m.title || m.content_type.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">
                v{m.version}
              </span>
            </button>
          ))}
        </div>

        {/* Add Section Button */}
        <button
          onClick={() => {
            setIsPromptingOpen((prev) => !prev);
            setGenError(null);
          }}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 shadow-2xs ${
            isPromptingOpen
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
              : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
          }`}
          title="Add a custom section or prompt the AI for specific topics like limitations, comparisons, etc."
        >
          <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Ask AI / Add Tab</span>
        </button>
      </div>

      {/* On-the-Go AI Generator / Custom Tab Creator Drawer */}
      {isPromptingOpen && (
        <div className="border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 rounded-xl p-4 sm:p-5 space-y-3.5 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-xs font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wide">
                {isManualMode ? 'Write Custom Note Tab' : 'Ask AI to Generate a New Section'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsManualMode((prev) => !prev)}
                className="text-[11px] font-medium text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 underline"
              >
                {isManualMode ? 'Switch to AI Prompt' : 'Write Manually'}
              </button>
              <button
                type="button"
                onClick={() => setIsPromptingOpen(false)}
                className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isManualMode ? (
            <form onSubmit={handlePromptSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder={`What aspect of ${topicTitle} do you want to explore? (e.g. Limitations and constraints, Comparison with MapReduce...)`}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-white dark:bg-stone-900 text-xs sm:text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:ring-2 focus:ring-amber-500/50 shadow-2xs font-medium"
                  autoFocus
                />
              </div>

              {/* Suggestions Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3 text-amber-500" /> Ideas:
                </span>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptText(s)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors shadow-2xs"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Optional Tab Title (defaults to prompt)"
                  className="px-3 py-1.5 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 outline-none max-w-xs"
                />
                <button
                  type="submit"
                  disabled={!promptText.trim() || isGenerating}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Section...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate & Save Tab</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleManualCreate} className="space-y-3">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Section Title (e.g. My Personal Exam Summary)"
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:ring-1 focus:ring-stone-400"
              />
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                rows={6}
                placeholder="Write your markdown notes here..."
                className="w-full px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-mono text-stone-900 dark:text-stone-100 placeholder-stone-400 outline-none focus:ring-1 focus:ring-stone-400 resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!customTitle.trim() || !manualText.trim() || isGenerating}
                  className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {isGenerating ? 'Saving...' : 'Create Tab'}
                </button>
              </div>
            </form>
          )}

          {genError && (
            <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 font-medium pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{genError}</span>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no materials exist */}
      {(!materials || materials.length === 0) && (
        <div className="p-8 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl text-stone-500 dark:text-zinc-400 text-xs bg-white dark:bg-stone-900/40 space-y-3">
          <p>No study sections created yet for this topic.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setIsPromptingOpen(true);
                setPromptText(`Comprehensive academic overview of ${topicTitle}`);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
              <span>Ask AI to Generate Notes</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Material Reading & Editing Card */}
      {currentMat && (
        <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-5 sm:p-8 bg-white dark:bg-stone-900 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 gap-3">
            <div className="space-y-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-lg font-semibold bg-transparent border-b border-stone-300 dark:border-stone-600 outline-none text-stone-900 dark:text-stone-100 w-full"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                    {currentMat.title}
                  </h2>
                  {currentMat.content_type === 'custom' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Custom AI Section
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center space-x-2 text-xs text-stone-400 dark:text-stone-500 font-mono">
                <span>Version {currentMat.version}</span>
                <span>•</span>
                <span>Updated {new Date(currentMat.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded text-xs border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={handleSaveEdit}
                    className="px-3 py-1.5 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white flex items-center space-x-1 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEdit}
                    className="px-3 py-1.5 rounded text-xs border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center space-x-1 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Notes</span>
                  </button>
                  <button
                    onClick={() => handleDeleteTab(currentMat.id, currentMat.title)}
                    className="p-1.5 rounded text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete this section tab"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content Body */}
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={22}
              className="w-full p-4 text-xs font-mono border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 rounded-lg focus:border-stone-900 dark:focus:border-stone-100 outline-none leading-relaxed"
            />
          ) : (
            <MarkdownView content={currentMat.markdown_text} />
          )}
        </div>
      )}

      {/* Private Student Notes Component */}
      <PersonalNotesView topicId={topicId} topicTitle={topicTitle} />
    </div>
  );
};
