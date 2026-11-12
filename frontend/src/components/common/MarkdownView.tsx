import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

export const MarkdownView: React.FC<Props> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content font-serif text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 {...props} />,
          h2: ({ node, ...props }) => <h2 {...props} />,
          h3: ({ node, ...props }) => <h3 {...props} />,
          strong: ({ node, ...props }) => <strong className="font-bold text-stone-950 dark:text-amber-100" {...props} />,
          em: ({ node, ...props }) => <em className="italic" {...props} />,
          ul: ({ node, ...props }) => <ul {...props} />,
          ol: ({ node, ...props }) => <ol {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-3 border-stone-800 dark:border-amber-400 bg-stone-100/80 dark:bg-stone-900/90 p-3 rounded-r my-3 italic" {...props} />
          ),
          code: ({ node, className, children, ...props }) => (
            <code className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded text-stone-900 dark:text-stone-100" {...props}>
              {children}
            </code>
          ),
          table: ({ node, ...props }) => <table {...props} />,
          th: ({ node, ...props }) => <th {...props} />,
          td: ({ node, ...props }) => <td {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
