import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ChatMessageMarkdown.module.css';

interface ChatMessageMarkdownProps {
  content: string;
  compact?: boolean;
}

interface CodeBlockProps {
  code: string;
  language: string;
  fileLabel?: string;
}

const detectFileLabel = (text: string): string | undefined => {
  const patterns = [
    /(?:^|\n)\s*file\s*:\s*([^\n]+)/i,
    /(?:^|\n)\s*filename\s*:\s*([^\n]+)/i,
    /(?:^|\n)\s*path\s*:\s*([^\n]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
};

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, fileLabel }) => {
  const [expanded, setExpanded] = useState(false);
  const lineCount = useMemo(() => code.split('\n').length, [code]);
  const collapsible = lineCount > 24;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // noop
    }
  };

  return (
    <div className={styles.codeShell}>
      <div className={styles.codeHeader}>
        <div className={styles.codeMeta}>
          {fileLabel && <span className={styles.fileLabel}>{fileLabel}</span>}
          <span className={styles.langLabel}>{language || 'text'}</span>
        </div>
        <div className={styles.codeActions}>
          {collapsible && (
            <button type="button" className={styles.actionBtn} onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
          <button type="button" className={styles.actionBtn} onClick={handleCopy}>
            Copy
          </button>
        </div>
      </div>

      <div className={`${styles.codeViewport} ${expanded ? styles.codeViewportExpanded : ''}`}>
        <pre className={styles.pre}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export const ChatMessageMarkdown: React.FC<ChatMessageMarkdownProps> = ({ content, compact = false }) => {
  const fileLabel = useMemo(() => detectFileLabel(content), [content]);

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const raw = String(children ?? '');
            const code = raw.replace(/\n$/, '');
            const lang = /language-([\w-]+)/.exec(className || '')?.[1] || '';

            if (inline) {
              return (
                <code className={styles.inlineCode} {...props}>
                  {children}
                </code>
              );
            }

            return <CodeBlock code={code} language={lang} fileLabel={fileLabel} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
