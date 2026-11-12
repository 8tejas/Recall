import React, { useState, useEffect } from 'react';
import { Lock, Edit3, Plus, Save, Check, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import { fetchPersonalNotes, updatePersonalNotes, appendPersonalNote } from '../../api/client';
import { MarkdownView } from '../common/MarkdownView';

interface Props {
  topicId: string;
  topicTitle: string;
}

export const PersonalNotesView: React.FC<Props> = ({ topicId, topicTitle }) => {
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>('');
  const [isAppending, setIsAppending] = useState<boolean>(false);
  const [appendValue, setAppendValue] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const loadNotes = async () => {
    try {
      const data = await fetchPersonalNotes(topicId);
      setNotes(data.personal_notes || '');
      setEditValue(data.personal_notes || '');
    } catch (err) {
      console.error('Error fetching personal notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [topicId]);

  const handleSaveFull = async () => {
    setSaving(true);
    try {
      await updatePersonalNotes(topicId, editValue);
      setNotes(editValue);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save personal notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAppendNote = async () => {
    if (!appendValue.trim()) return;
    setSaving(true);
    try {
      const timestamp = new Date().toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const formattedNote = `### Note (${timestamp})\n${appendValue.trim()}`;
      const res = await appendPersonalNote(topicId, formattedNote);
      setNotes(res.personal_notes);
      setEditValue(res.personal_notes);
      setAppendValue('');
      setIsAppending(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to append personal note:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-stone-400 dark:text-zinc-500 font-mono">
        Loading private notes...
      </div>
    );
  }

  return (
    <div className="border border-stone-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-[#18181b] overflow-hidden shadow-2xs space-y-4">
      {/* Header with Privacy Guarantee */}
      <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center space-x-1">
              <Lock className="w-3 h-3" />
              <span>Private Student Notes</span>
            </span>
            <span className="text-xs text-stone-500 dark:text-zinc-400 font-mono">
              Topic: {topicTitle}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 dark:text-zinc-400 flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Stored in your local database. Strictly private — never transmitted to Groq AI or used in prompt contexts.</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          {saveSuccess && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
              <Check className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}

          {!isEditing && !isAppending && (
            <>
              <button
                onClick={() => {
                  setIsAppending(true);
                  setIsEditing(false);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-stone-700 dark:text-zinc-200 text-xs font-medium hover:bg-stone-50 dark:hover:bg-zinc-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Append Note</span>
              </button>
              <button
                onClick={() => {
                  setEditValue(notes);
                  setIsEditing(true);
                  setIsAppending(false);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white transition-colors flex items-center space-x-1 shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Full Notes</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Append Mode Form */}
        {isAppending && (
          <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center space-x-1.5">
                <Plus className="w-3.5 h-3.5" />
                <span>Append a new personal observation or exam tip:</span>
              </span>
            </div>
            <textarea
              value={appendValue}
              onChange={(e) => setAppendValue(e.target.value)}
              placeholder="e.g. Professor emphasized that in the 2024 paper, they asked about the second boundary condition. Remember to write the matrix form..."
              rows={4}
              className="w-full p-3 text-xs font-sans rounded-lg border border-amber-300 dark:border-amber-800/80 bg-white dark:bg-zinc-900 text-stone-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setIsAppending(false);
                  setAppendValue('');
                }}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                disabled={saving || !appendValue.trim()}
                onClick={handleAppendNote}
                className="px-3.5 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Appending...' : 'Append to Notes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Full Editor Mode */}
        {isEditing ? (
          <div className="space-y-3 animate-fade-in">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Write your private notes using Markdown formatting (*italic*, **bold**, lists, headers)..."
              rows={12}
              className="w-full p-4 text-xs font-mono rounded-lg border border-stone-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 focus:border-stone-800 dark:focus:border-zinc-300 outline-none leading-relaxed"
            />
            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-xs text-stone-500 dark:text-zinc-400 hover:text-stone-800 dark:hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSaveFull}
                className="px-4 py-1.5 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-white disabled:opacity-50 transition-colors flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Private Notes'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div>
            {notes.trim() ? (
              <div className="prose dark:prose-invert max-w-none text-stone-800 dark:text-zinc-200">
                <MarkdownView content={notes} />
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed border-stone-200 dark:border-zinc-800 rounded-lg text-stone-400 dark:text-zinc-500 text-xs space-y-2">
                <FileText className="w-6 h-6 mx-auto text-stone-300 dark:text-zinc-600" />
                <p>No personal notes recorded for this topic yet.</p>
                <p className="text-[11px] text-stone-400 dark:text-zinc-500">
                  Click "Append Note" or "Edit Full Notes" to record private lecture insights, exam caveats, or custom explanations.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

