import React, { useState } from 'react';
import { Edit3, Check, Save, RotateCcw, AlertCircle, FileText, BookOpen } from 'lucide-react';
import { LearningMaterial } from '../../types';
import { updateMaterial } from '../../api/client';
import { MarkdownView } from '../common/MarkdownView';
import { PersonalNotesView } from './PersonalNotesView';

interface Props {
  topicId: string;
  topicTitle: string;
  materials: LearningMaterial[];
  onMaterialUpdated: () => void;
}

export const StudyNotesView: React.FC<Props> = ({ topicId, topicTitle, materials, onMaterialUpdated }) => {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!materials || materials.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="p-8 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl text-stone-500 dark:text-zinc-400 text-xs bg-white dark:bg-[#18181b]">
          No AI study notes generated for this topic yet. Click "Generate Resources" above to synthesize detailed academic notes.
        </div>
        <PersonalNotesView topicId={topicId} topicTitle={topicTitle} />
      </div>
    );
  }

  const currentMat = materials[activeIdx] || materials[0];

  const handleStartEdit = () => {
    setEditText(currentMat.markdown_text);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      await updateMaterial(currentMat.id, {
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
      {/* Materials Type Switcher */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 gap-2 overflow-x-auto pb-0.5">
        {materials.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => {
              setActiveIdx(idx);
              setIsEditing(false);
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeIdx === idx
                ? 'border-stone-900 dark:border-stone-100 text-stone-900 dark:text-stone-100 font-semibold'
                : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="capitalize">{m.content_type.replace('_', ' ')}</span>
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono">v{m.version}</span>
          </button>
        ))}
      </div>

      {/* Material Reading & Editing Card */}
      <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-6 sm:p-8 bg-white dark:bg-stone-900 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 dark:border-stone-800 gap-2">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{currentMat.title}</h2>
            <div className="flex items-center space-x-2 text-xs text-stone-400 dark:text-stone-500 mt-0.5 font-mono">
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
                  className="px-3 py-1.5 rounded text-xs border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded text-xs border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Notes</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        {isEditing ? (
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={20}
            className="w-full p-4 text-xs font-mono border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-950 text-stone-900 dark:text-stone-100 rounded-lg focus:border-stone-900 dark:focus:border-stone-100 outline-none leading-relaxed"
          />
        ) : (
          <MarkdownView content={currentMat.markdown_text} />
        )}
      </div>

      {/* Private Student Notes Component */}
      <PersonalNotesView topicId={topicId} topicTitle={topicTitle} />
    </div>
  );
};
