// frontend/src/app/components/AIMessage.tsx
import { FC, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';


interface CodeProps {
  node?: any,
  inline?: any,
  className?: any,
  children?: any,
}
// --- Helper Icons for UI (No changes here) ---
const ClipboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
);
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
);
const CoffeeBeanIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-amber-900/80"><path d="M12.4,5.2C10.8,4.5,9.4,4,8,4C5,4,2.5,5.6,2.5,9c0,2.1,1.1,4.1,3.2,5.2C6.9,15.2,8.1,16,10,16c3,0,5.5-1.6,5.5-5 C15.5,9.2,14.2,7.2,12.4,5.2z M12,12c-0.2,0.8-0.5,1.5-1,2.1C10.5,14.6,9.8,15,9,15c-0.8,0-1.5-0.4-2.1-0.9 c-0.5-0.5-0.9-1.2-1-2.1c0.2-0.8,0.5-1.5,1-2.1C7.5,9.4,8.2,9,9,9c0.8,0,1.5,0.4,2.1,0.9C11.6,10.5,11.9,11.2,12,12z"></path></svg>
);

interface AIMessageProps {
  text: string;
}

export const AIMessage: FC<AIMessageProps> = ({ text }) => {
  return (
    <div className="prose prose-sm max-w-none prose-p:m-0 prose-ol:my-2 prose-ul:my-2 prose-li:my-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // --- List Styling (Unchanged) ---
          ol: ({ node, ...props }) => <ol className="list-none p-0" {...props} />,
          li: ({ node, ...props }) => (
            <li className="flex items-start gap-2.5 p-0 my-2">
              <span className="mt-1 flex-shrink-0">
                  <CoffeeBeanIcon/>
              </span>
              <span className="flex-1">{props.children}</span>
            </li>
          ),

          // --- NEW: Table Styling ---
          table: ({ node, ...props }) => <table className="my-4 w-full border-collapse text-left" {...props} />,
          thead: ({ node, ...props }) => <thead className="border-b border-stone-300" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-stone-200" {...props} />,
          tr: ({ node, ...props }) => <tr className="even:bg-stone-100/50" {...props} />,
          th: ({ node, ...props }) => <th className="p-3 font-semibold text-stone-800" {...props} />,
          td: ({ node, ...props }) => <td className="p-3 align-top" {...props} />,

          // --- Code Block Styling (Unchanged) ---
          code: ({ className, children, ...props }: CodeProps) => {
            const match = /language-(\w+)/.exec(className || '');
            const [copied, setCopied] = useState(false);

            const handleCopy = () => {
              if (children) {
                navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }
            };

            return match ? (
              <div className="relative my-4 rounded-lg bg-stone-800 font-sans text-sm">
                <div className="flex items-center justify-between px-4 py-1.5 border-b border-stone-700">
                  <span className="text-xs text-stone-400">{match[1]}</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white transition-colors"
                  >
                    {copied ? <CheckIcon /> : <ClipboardIcon />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <SyntaxHighlighter
                  style={materialLight as any}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  customStyle={{
                    padding: '1rem',
                    backgroundColor: 'transparent',
                    margin: '0',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="text-amber-900 bg-amber-100/50 px-1 py-0.5 rounded-sm font-semibold" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};
