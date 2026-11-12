import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  ChevronDown,
  Layers,
  BookOpen,
  Edit2
} from 'lucide-react';
import { parseSyllabusAI, createSubject, applySyllabusToSubject } from '../api/client';
import { ParsedSyllabus, ParsedUnitItem, ParsedTopicItem } from '../types';

export const NewSubjectPage: React.FC = () => {
  const [rawSyllabus, setRawSyllabus] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [subjectCode, setSubjectCode] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleParse = async () => {
    if (!rawSyllabus.trim()) {
      setError('Please paste or type the academic syllabus text.');
      return;
    }
    setIsParsing(true);
    setError(null);
    try {
      const result = await parseSyllabusAI(rawSyllabus);
      setParsedData(result);
      if (result.subject_name) setSubjectName(result.subject_name);
      if (result.code) setSubjectCode(result.code);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to parse syllabus. Please verify text formatting.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleAddUnit = () => {
    if (!parsedData) return;
    const nextNum = parsedData.units.length + 1;
    const newUnit: ParsedUnitItem = {
      unit_number: nextNum,
      title: `Unit ${nextNum}: New Unit`,
      description: '',
      topics: [{ title: 'New Topic', description: '' }],
    };
    setParsedData({
      ...parsedData,
      units: [...parsedData.units, newUnit],
    });
  };

  const handleRemoveUnit = (unitIdx: number) => {
    if (!parsedData) return;
    const updated = parsedData.units.filter((_, idx) => idx !== unitIdx);
    setParsedData({ ...parsedData, units: updated });
  };

  const handleAddTopic = (unitIdx: number) => {
    if (!parsedData) return;
    const updatedUnits = [...parsedData.units];
    updatedUnits[unitIdx].topics.push({
      title: 'New Topic',
      description: '',
    });
    setParsedData({ ...parsedData, units: updatedUnits });
  };

  const handleRemoveTopic = (unitIdx: number, topicIdx: number) => {
    if (!parsedData) return;
    const updatedUnits = [...parsedData.units];
    updatedUnits[unitIdx].topics = updatedUnits[unitIdx].topics.filter((_, idx) => idx !== topicIdx);
    setParsedData({ ...parsedData, units: updatedUnits });
  };

  const handleSaveAndCreate = async () => {
    if (!subjectName.trim()) {
      setError('Subject name is required.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      // 1. Create base subject
      const created = await createSubject({
        name: subjectName,
        code: subjectCode,
        raw_syllabus: rawSyllabus,
      });

      // 2. Apply reviewed hierarchy if parsed
      if (parsedData && parsedData.units.length > 0) {
        await applySyllabusToSubject(created.id, {
          subject_name: subjectName,
          code: subjectCode,
          description: parsedData.description,
          units: parsedData.units,
        });
      }

      navigate(`/subjects/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Error saving subject hierarchy.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="pb-4 border-b border-stone-200">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
          Add Course Syllabus
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Paste your university course syllabus. Recall extracts units and topics with zero hallucination for your review.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
          {error}
        </div>
      )}

      {/* Input Phase */}
      {!parsedData && (
        <div className="border border-stone-200 rounded-xl p-6 bg-white space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-800 block">
              Paste University Syllabus (Plain Text):
            </label>
            <p className="text-[11px] text-stone-500">
              Include unit titles, headings, and topic lists. The AI parser groups topics faithfully without inventing synthetic material.
            </p>
            <textarea
              value={rawSyllabus}
              onChange={(e) => setRawSyllabus(e.target.value)}
              placeholder={`Example:\nData Structures & Algorithms (CS201)\n\nUnit 1: Linear Data Structures\nArrays, Linked Lists, Stacks, Queues, Circular Queues\n\nUnit 2: Trees and Graphs\nBinary Search Trees, AVL Trees, B-Trees, Graph Representations, BFS, DFS\n\nUnit 3: Sorting and Searching\nQuickSort, MergeSort, HeapSort, Binary Search`}
              rows={12}
              className="w-full p-4 text-xs font-mono border border-stone-300 rounded-lg focus:border-stone-800 outline-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                // Quick manual mode
                setParsedData({
                  subject_name: subjectName || 'New Academic Subject',
                  code: subjectCode || '',
                  description: '',
                  units: [
                    {
                      unit_number: 1,
                      title: 'Unit 1: Core Fundamentals',
                      description: '',
                      topics: [{ title: 'Introductory Concept', description: '' }],
                    },
                  ],
                });
              }}
              className="text-xs text-stone-500 hover:text-stone-800 underline"
            >
              Skip AI Parsing & Create Manually
            </button>

            <button
              disabled={isParsing || !rawSyllabus.trim()}
              onClick={handleParse}
              className="px-5 py-2.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isParsing ? 'Parsing Structure...' : 'Parse Syllabus with AI'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Review & Edit Phase */}
      {parsedData && (
        <div className="space-y-6">
          <div className="border border-stone-200 rounded-xl p-6 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
                Review & Edit Syllabus Hierarchy
              </span>
              <button
                onClick={() => setParsedData(null)}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                Re-paste Syllabus
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-stone-700 block">Subject Title</label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. Operating Systems"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-semibold text-stone-900 outline-none focus:border-stone-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 block">Course Code</label>
                <input
                  type="text"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="e.g. CS-301"
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono text-stone-900 outline-none focus:border-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Units and Topics List */}
          <div className="space-y-4">
            {parsedData.units.map((unit, uIdx) => (
              <div
                key={uIdx}
                className="border border-stone-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center space-x-2 flex-1 mr-3">
                    <span className="text-xs font-mono font-bold text-stone-400">
                      U{unit.unit_number || uIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={unit.title}
                      onChange={(e) => {
                        const updated = [...parsedData.units];
                        updated[uIdx].title = e.target.value;
                        setParsedData({ ...parsedData, units: updated });
                      }}
                      className="w-full text-xs font-semibold text-stone-900 border-b border-transparent hover:border-stone-300 focus:border-stone-800 outline-none py-0.5"
                    />
                  </div>

                  <button
                    onClick={() => handleRemoveUnit(uIdx)}
                    title="Remove Unit"
                    className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Topics in this Unit */}
                <div className="space-y-1.5 pl-4 border-l-2 border-stone-100">
                  {unit.topics.map((topic, tIdx) => (
                    <div key={tIdx} className="flex items-center justify-between py-1 group">
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <span className="text-[10px] text-stone-400 font-mono">•</span>
                        <input
                          type="text"
                          value={topic.title}
                          onChange={(e) => {
                            const updated = [...parsedData.units];
                            updated[uIdx].topics[tIdx].title = e.target.value;
                            setParsedData({ ...parsedData, units: updated });
                          }}
                          className="w-full text-xs text-stone-800 border-b border-transparent hover:border-stone-200 focus:border-stone-800 outline-none py-0.5"
                        />
                      </div>
                      <button
                        onClick={() => handleRemoveTopic(uIdx, tIdx)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-rose-600 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => handleAddTopic(uIdx)}
                    className="text-[11px] text-stone-500 hover:text-stone-900 flex items-center space-x-1 pt-1 font-medium"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Topic to Unit</span>
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={handleAddUnit}
              className="w-full py-2.5 border border-dashed border-stone-300 rounded-xl text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors font-medium flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Unit</span>
            </button>
          </div>

          <div className="flex justify-end pt-4 border-t border-stone-200">
            <button
              disabled={isSaving}
              onClick={handleSaveAndCreate}
              className="px-6 py-2.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Curriculum...' : 'Save Course Syllabus & Create Workspace'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
