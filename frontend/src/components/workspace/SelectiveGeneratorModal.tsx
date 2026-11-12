import React, { useState } from 'react';
import { X, Sparkles, Check, BookOpen, Brain, HelpCircle, FileText } from 'lucide-react';
import { generateTopicResource } from '../../api/client';

interface Props {
  topicId: string;
  topicTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (resourceType: string) => void;
}

interface GenerationOption {
  id: string;
  category: 'Notes & Theory' | 'Memorization & Retention' | 'Examinations';
  title: string;
  description: string;
  icon: any;
}

const GENERATION_OPTIONS: GenerationOption[] = [
  {
    id: 'comprehensive_notes',
    category: 'Notes & Theory',
    title: 'Detailed Study Notes',
    description: 'Formal academic theory, governing axioms, canonical architecture, and citations.',
    icon: BookOpen,
  },
  {
    id: 'quick_revision',
    category: 'Notes & Theory',
    title: 'Quick Revision Notes',
    description: 'High-yield exam summary, bullet points, core equations, and quick review.',
    icon: FileText,
  },
  {
    id: 'definitions',
    category: 'Notes & Theory',
    title: 'Definitions & Key Concepts',
    description: 'Exact university definitions, genus, essential attributes, and operational formulas.',
    icon: BookOpen,
  },
  {
    id: 'classifications',
    category: 'Notes & Theory',
    title: 'Characteristics & Classifications',
    description: 'Taxonomies, structural classes, and comparative complexity tables.',
    icon: FileText,
  },
  {
    id: 'comparisons',
    category: 'Notes & Theory',
    title: 'Comparisons & Differences',
    description: 'Rigorous comparison tables contrasting paradigms and classical vs modern methods.',
    icon: FileText,
  },
  {
    id: 'examples',
    category: 'Notes & Theory',
    title: 'Examples & Applications',
    description: 'Concrete industrial use cases, engineering implementations, and case studies.',
    icon: BookOpen,
  },
  {
    id: 'memorization_exercises',
    category: 'Memorization & Retention',
    title: 'Memorization Engine Exercises',
    description: 'Progressive sentence cloze deletion, paragraph reconstruction, and sequence recall.',
    icon: Brain,
  },
  {
    id: 'conceptual_exercises',
    category: 'Memorization & Retention',
    title: 'Conceptual & Relationship Exercises',
    description: 'Structural component matching, step ordering, and relationship analyses.',
    icon: Brain,
  },
  {
    id: 'written_questions',
    category: 'Examinations',
    title: 'Written Exam Questions (2m, 5m, 10m)',
    description: 'University exam questions grouped by marks with model answers and evaluation rubrics.',
    icon: HelpCircle,
  },
];

export const SelectiveGeneratorModal: React.FC<Props> = ({
  topicId,
  topicTitle,
  isOpen,
  onClose,
  onGenerated,
}) => {
  const [selectedResource, setSelectedResource] = useState<string>('comprehensive_notes');
  const [customFocus, setCustomFocus] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      await generateTopicResource(topicId, selectedResource, customFocus);
      onGenerated(selectedResource);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-stone-200 w-full max-w-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-stone-700" />
            <h3 className="font-semibold text-stone-900 text-sm">Select Material to Generate</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-stone-500">
            Topic: <strong className="text-stone-800">{topicTitle}</strong>. Select the specific resource you wish to synthesize:
          </p>

          <div className="space-y-2">
            {GENERATION_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedResource === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedResource(opt.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start space-x-3 ${
                    isSelected
                      ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900/10'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                  }`}
                >
                  <div className={`p-2 rounded mt-0.5 ${isSelected ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-600'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900">{opt.title}</span>
                      <span className="text-[10px] text-stone-400 font-mono uppercase">{opt.category}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">{opt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-medium text-stone-700">Optional Specific Focus or Syllabus Note:</label>
            <input
              type="text"
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              placeholder="e.g. Focus specifically on asymptotic bounds and architectural diagram..."
              className="w-full px-3 py-2 text-xs border border-stone-200 rounded-lg outline-none focus:border-stone-800"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs text-stone-600 hover:bg-stone-200/60 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={isGenerating}
            onClick={handleGenerate}
            className="px-4 py-1.5 rounded bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isGenerating ? 'Synthesizing...' : 'Generate Resource'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
