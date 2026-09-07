import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cx } from '../../lib/cx'

/**
 * The README read mode. `react-markdown` does not evaluate HTML unless `rehype-raw` is
 * added, and it is deliberately not, so a README cannot inject markup into the console.
 */
export function MarkdownViewer({ source, className }: { source: string; className?: string }) {
  if (!source.trim()) {
    return (
      <p className={cx('text-xs italic text-[var(--text-muted)]', className)}>
        This application has no README yet.
      </p>
    )
  }

  return (
    <div
      className={cx(
        'markdown text-sm leading-[var(--leading-body)] text-[var(--text-secondary)]',
        className,
      )}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--color-primary)] hover:underline"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-5 text-lg font-semibold text-[var(--text-primary)] first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-md font-semibold text-[var(--text-primary)] first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-4 text-sm font-semibold text-[var(--text-primary)]">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children, className: codeClassName }) =>
            codeClassName ? (
              <code className={cx('block overflow-x-auto', codeClassName)}>{children}</code>
            ) : (
              <code className="rounded-[var(--radius-sm)] bg-[var(--surface-inset)] px-1 py-0.5 text-xs">
                {children}
              </code>
            ),
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-inset)] p-3 text-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-2 border-[var(--color-primary)] pl-3 text-[var(--text-muted)]">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-[var(--border-default)] bg-[var(--surface-2)] px-2 py-1 text-left font-medium text-[var(--text-primary)]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-[var(--border-default)] px-2 py-1">{children}</td>
          ),
          hr: () => <hr className="my-4 border-[var(--border-default)]" />,
        }}
      >
        {source}
      </Markdown>
    </div>
  )
}
