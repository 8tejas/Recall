import React, { useState } from 'react';
import { Edit3, Check, Save, RotateCcw, AlertCircle, FileText, BookOpen } from 'lucide-react';
import { LearningMaterial } from '../../types';
import { updateMaterial } from '../../api/client';

interface Props {
  materials: LearningMaterial[];
  onMaterialUpdated: () => void;
}

export const StudyNotesView: React.FC<Props> = ({ materials, onMaterialUpdated }) => {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  if (!materials || materials.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-stone-200 rounded-lg text-stone-500 text-xs">
        No study materials generated for this topic yet. Click "Generate Resources" above to synthesize detailed academic notes.
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
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto pb-0.5">
        {materials.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => {
              setActiveIdx(idx);
              setIsEditing(false);
            }}
            className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-all flex items-center space-x-2 ${
              activeIdx === idx
                ? 'border-stone-900 text-stone-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="capitalize">{m.content_type.replace('_', ' ')}</span>
            <span className="text-[10px] text-stone-400 font-mono">v{m.version}</span>
          </button>
        ))}
      </div>

      {/* Material Reading & Editing Card */}
      <div className="border border-stone-200 rounded-lg p-6 sm:p-8 bg-white shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-100 gap-2">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">{currentMat.title}</h2>
            <div className="flex items-center space-x-2 text-xs text-stone-400 mt-0.5">
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
                  className="px-3 py-1.5 rounded text-xs border border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  disabled={isSaving}
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded text-xs border border-stone-200 text-stone-700 hover:bg-stone-50 flex items-center space-x-1"
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
            className="w-full p-4 text-xs font-mono border border-stone-300 rounded-lg focus:border-stone-900 outline-none leading-relaxed"
          />
        ) : (
          <div className="prose prose-stone max-w-none text-stone-800 text-sm leading-relaxed space-y-4 font-serif">
            {currentMat.markdown_text.split('\n\n').map((paragraph, i) => {
              if (paragraph.startsWith('# ')) {
                return <h1 key={i} className="text-xl font-bold font-sans text-stone-900 border-b pb-2 pt-2">{paragraph.replace('# ', '')}</h1>;
              }
              if (paragraph.startsWith('## ')) {
                return <h2 key={i} className="text-base font-bold font-sans text-stone-900 pt-3">{paragraph.replace('## ', '')}</h2>;
              }
              if (paragraph.startsWith('### ')) {
                return <h3 key={i} className="text-sm font-semibold font-sans text-stone-800 pt-2">{paragraph.replace('### ', '')}</h3>;
              }
              if (paragraph.startsWith('> ')) {
                return (
                  <blockquote key={i} className="p-3 border-l-3 border-stone-800 bg-stone-50 font-serif text-stone-800 my-2 italic">
                    {paragraph.replace('> ', '')}
                  </blockquote>
                );
              }
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                const items = paragraph.split('\n').filter(Boolean);
                return (
                  <ul key={i} className="list-disc list-inside space-y-1 font-serif text-stone-800">
                    {items.map((it, idx) => (
                      <li key={idx}>{it.replace(/^[-*]\s*/, '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={i} className="leading-relaxed whitespace-pre-wrap">
                  {paragraph}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
