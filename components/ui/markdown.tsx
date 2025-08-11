import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  content: string
  className?: string
  variant?: 'default' | 'compact' | 'analysis'
}

export function Markdown({ content, className, variant = 'default' }: MarkdownProps) {
  const baseClasses = "prose prose-sm max-w-none break-words"
  
  const variantClasses = {
    default: "prose-gray prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-4 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700",
    compact: "prose-gray prose-headings:text-gray-900 prose-headings:text-sm prose-headings:font-medium prose-p:text-gray-700 prose-p:text-sm prose-strong:text-gray-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:text-gray-700 prose-li:text-sm prose-code:text-xs prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
    analysis: "prose-gray prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-800 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50 prose-pre:border prose-blockquote:border-l-4 prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-4 prose-blockquote:italic prose-ul:text-gray-800 prose-ol:text-gray-800 prose-li:text-gray-800 prose-li:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
  }

  const combinedClasses = cn(
    baseClasses,
    variantClasses[variant],
    className
  )

  return (
    <div className={combinedClasses}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Custom components for better styling
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-medium mb-2 mt-3 first:mt-0">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-medium mb-1 mt-2 first:mt-0">{children}</h4>,
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => <blockquote className="mb-3 p-3 rounded-r border-l-4">{children}</blockquote>,
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return <code className="px-1 py-0.5 rounded text-xs font-mono break-words">{children}</code>
            }
            return (
              <pre className="mb-3 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                <code className="text-xs font-mono break-words">{children}</code>
              </pre>
            )
          },
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 whitespace-normal break-words text-sm text-gray-900 border-b border-gray-100">
              {children}
            </td>
          ),
          hr: () => <hr className="my-4 border-gray-200" />,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
