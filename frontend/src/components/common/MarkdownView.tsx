import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Props {
  content: string;
  className?: string;
}

/**
 * Normalizes LaTeX math expressions:
 * 1. Converts \[ ... \] to display math block $$\n...\n$$
 * 2. Converts \( ... \) to inline math $...$
 * 3. Ensures single-line $$ ... $$ is expanded with newlines for remark-math display block parsing
 */
function normalizeMath(text: string): string {
  if (!text) return '';
  // Convert \[ ... \] to display block $$ ... $$
  let cleaned = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);
  // Convert \( ... \) to inline math $ ... $
  cleaned = cleaned.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);
  // Convert single-line $$ ... $$ to properly newline-padded display block $$ ... $$
  cleaned = cleaned.replace(/\$\$\s*([^\n$]+?)\s*\$\$/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);
  return cleaned;
}

export const MarkdownView: React.FC<Props> = ({ content, className = '' }) => {
  const normalizedContent = useMemo(() => normalizeMath(content), [content]);

  return (
    <div className={`markdown-content text-sm leading-relaxed [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-xl sm:text-2xl font-bold font-sans text-stone-900 dark:text-stone-100 my-4 border-b border-stone-200 dark:border-stone-800 pb-2"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-lg sm:text-xl font-bold font-sans text-stone-900 dark:text-stone-100 mt-6 mb-3 border-b border-stone-100 dark:border-stone-800 pb-1"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-base font-semibold font-sans text-stone-800 dark:text-stone-200 mt-4 mb-2"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p className="my-2.5 leading-relaxed text-stone-800 dark:text-stone-200" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-stone-950 dark:text-amber-100" {...props} />
          ),
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc list-inside space-y-1.5 my-2.5 text-stone-800 dark:text-stone-200"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal list-inside space-y-1.5 my-2.5 text-stone-800 dark:text-stone-200"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-amber-500 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 rounded-r my-3.5 text-stone-800 dark:text-stone-200 text-xs sm:text-sm font-sans"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = !!match || String(children).includes('\n');
            if (isBlock) {
              return (
                <div className="my-3 overflow-x-auto rounded-lg bg-stone-900 text-stone-100 p-3.5 text-xs font-mono border border-stone-800">
                  <code>{children}</code>
                </div>
              );
            }
            return (
              <code
                className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-300 border border-stone-200/60 dark:border-stone-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-stone-200 dark:border-stone-800 shadow-2xs">
              <table
                className="min-w-full divide-y divide-stone-200 dark:divide-stone-800 text-xs text-left"
                {...props}
              />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="bg-stone-100/80 dark:bg-stone-800/80 text-stone-900 dark:text-stone-100 font-semibold"
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-3.5 py-2.5 font-semibold text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-stone-700"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-3.5 py-2.5 border-t border-stone-100 dark:border-stone-800 text-stone-700 dark:text-stone-300"
              {...props}
            />
          ),
        }}
      >
        {normalizedContent}
      </ReactMarkdown>
    </div>
  );
};
