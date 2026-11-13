import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Bot,
  User as UserIcon,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { TopicQA } from '../../types';
import { fetchTopicQAs, askTopicQuestion, deleteTopicQA } from '../../api/client';

interface Props {
  topicId: string;
  topicTitle: string;
}

export const TopicQAView: React.FC<Props> = ({ topicId, topicTitle }) => {
  const [qas, setQas] = useState<TopicQA[]>([]);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadQAs = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchTopicQAs(topicId);
      setQas(data);
    } catch (err: any) {
      console.error('Failed to load topic Q&As:', err);
      setErrorMessage('Failed to load previous Q&A history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQAs();
    setQuestionInput('');
  }, [topicId]);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = questionInput.trim();
    if (!query || isAsking) return;

    setIsAsking(true);
    setErrorMessage(null);
    try {
      const newQA = await askTopicQuestion(topicId, query);
      setQas(prev => [...prev, newQA]);
      setQuestionInput('');
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Failed to ask question:', err);
      setErrorMessage(err.response?.data?.detail || 'Failed to get answer. Please check your network or try again.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleDelete = async (qaId: string) => {
    try {
      await deleteTopicQA(topicId, qaId);
      setQas(prev => prev.filter(item => item.id !== qaId));
    } catch (err) {
      console.error('Failed to delete Q&A:', err);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    `What are the foundational axioms and governing principles of ${topicTitle}?`,
    `Explain the internal mechanism and step-by-step resolution flow of this topic.`,
    `What are the primary operational trade-offs and architectural limitations?`,
    `How is this topic typically evaluated in university 10-mark examination questions?`
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in text-stone-900 dark:text-zinc-100">
      {/* Top Banner & Context */}
      <div className="p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-stone-100/70 dark:bg-[#18181b] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-stone-500 dark:text-zinc-400">
              Interactive Academic Tutor
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 dark:bg-zinc-800 text-stone-700 dark:text-zinc-300 font-mono">
              Auto-Saved
            </span>
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-zinc-100 font-serif mt-1">
            Topic Q&A: {topicTitle}
          </h2>
          <p className="text-xs text-stone-500 dark:text-zinc-400 mt-0.5">
            Ask detailed conceptual, mathematical, or exam-focused questions. Answers are preserved permanently for your revision.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 text-[11px] text-stone-500 dark:text-zinc-400 font-mono self-start sm:self-auto shrink-0 bg-white/70 dark:bg-zinc-900/60 px-2.5 py-1.5 rounded-lg border border-stone-200/80 dark:border-zinc-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Strictly Private</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Question Input Form */}
      <div className="p-4 sm:p-5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-[#151517] shadow-sm space-y-3">
        <form onSubmit={handleAsk} className="space-y-3">
          <div className="relative">
            <textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleAsk();
                }
              }}
              placeholder={`Ask any question about ${topicTitle} (e.g., "Why is this mechanism necessary?", "Provide a mathematical formulation...", "Compare this with...")`}
              rows={3}
              className="w-full text-xs sm:text-sm p-3.5 rounded-lg border border-stone-200 dark:border-zinc-700 bg-stone-50/50 dark:bg-[#18181b] text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-stone-400 dark:focus:ring-zinc-500 resize-y"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-mono hidden sm:inline">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-[10px]">Enter</kbd> to submit
            </span>

            <button
              type="submit"
              disabled={isAsking || !questionInput.trim()}
              className="px-4 py-2 rounded-lg bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-stone-800 dark:hover:bg-white transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs self-end sm:self-auto"
            >
              {isAsking ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-stone-300 dark:border-zinc-600 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                  <span>Generating Academic Answer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 dark:text-amber-600" />
                  <span>Ask Question</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        {qas.length === 0 && (
          <div className="pt-2 border-t border-stone-100 dark:border-zinc-800">
            <span className="text-[10px] font-mono text-stone-400 dark:text-zinc-500 uppercase tracking-wider block mb-2 font-semibold">
              Suggested Academic Inquiries:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuestionInput(prompt)}
                  className="text-left text-[11px] px-2.5 py-1 rounded-md border border-stone-200/90 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/60 text-stone-700 dark:text-zinc-300 hover:border-stone-400 dark:hover:border-zinc-600 transition-colors"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Saved Q&A Thread */}
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-1 border-b border-stone-200/80 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
            <h3 className="text-xs font-bold font-mono tracking-wider uppercase text-stone-600 dark:text-zinc-400">
              Q&A History ({qas.length})
            </h3>
          </div>
          {qas.length > 0 && (
            <span className="text-[11px] text-stone-400 dark:text-zinc-500 font-mono">
              Saved automatically
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400 font-mono">
            Loading previous Q&A interactions...
          </div>
        ) : qas.length === 0 ? (
          <div className="p-10 border border-dashed border-stone-200 dark:border-zinc-800 rounded-xl text-center space-y-2 bg-stone-50/50 dark:bg-zinc-900/20">
            <Bot className="w-8 h-8 text-stone-300 dark:text-zinc-600 mx-auto" />
            <h4 className="text-xs font-semibold text-stone-700 dark:text-zinc-300">
              No Questions Asked Yet
            </h4>
            <p className="text-[11px] text-stone-500 dark:text-zinc-400 max-w-sm mx-auto">
              Have doubts about governing axioms, formula derivations, or examination grading criteria? Ask above to receive and save professor-level answers.
            </p>
          </div>
        ) : (
          qas.map((item, index) => (
            <div
              key={item.id}
              className="p-5 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-[#151517] shadow-xs space-y-4 transition-all"
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-100 dark:border-zinc-800/80">
                <div className="flex items-start space-x-2.5">
                  <div className="w-6 h-6 rounded-md bg-stone-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    Q{index + 1}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-stone-900 dark:text-zinc-100 leading-snug">
                      {item.question}
                    </h4>
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono flex items-center space-x-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.created_at).toLocaleDateString()} at {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => handleCopy(item.answer, item.id)}
                    title="Copy Answer"
                    className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-zinc-200 hover:bg-stone-100 dark:hover:bg-zinc-800 rounded transition-colors"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    title="Delete Question & Answer"
                    className="p-1.5 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Answer Content */}
              <div className="flex items-start space-x-2.5 pt-1">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5 font-mono text-[10px] font-bold">
                  AI
                </div>
                <div className="flex-1 overflow-x-auto text-xs sm:text-sm text-stone-800 dark:text-zinc-200 leading-relaxed space-y-2 prose dark:prose-invert max-w-none prose-sm font-sans">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.answer}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>
    </div>
  );
};

