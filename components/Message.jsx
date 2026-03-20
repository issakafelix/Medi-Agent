import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardIcon,
  PencilSquareIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from '@heroicons/react/24/outline';
import CodeBlock from './CodeBlock';

function normalizeCodeChildren(children) {
  if (Array.isArray(children)) return children.join('');
  return String(children ?? '');
}

export default function Message({
  message,
  isDarkMode,
  onRetry,
  onCopy,
  onRegenerate,
  onEdit,
  onLike,
  onDislike,
}) {
  const isBot = message.sender === 'bot';
  const hasError = message.error;
  const rating = message?.backend?.rating ?? message?.rating ?? null;

  const urlTransform = (url) => {
    const u = String(url ?? '');
    if (!u) return '';
    if (u.startsWith('data:image/')) return u;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return '';
  };

  const formatTime = (value) => {
    const date = value instanceof Date ? value : new Date(value ?? Date.now());
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className={`w-full flex ${
        isBot ? 'justify-start' : 'justify-end'
      } animate-slideIn my-4 sm:my-6 px-3 sm:px-6`}
    >
      <div 
        className={`flex max-w-[90%] sm:max-w-[80%] md:max-w-3xl flex-col gap-1 group ${
          isBot ? 'items-start' : 'items-end'
        }`}
      >
        <div className={`flex items-end gap-2 sm:gap-3 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* Avatar */}
          <div
            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full shadow-sm flex items-center justify-center flex-shrink-0 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-100'
            }`}
            role="img"
          >
            {isBot ? (
              <img
                src="/chat-con.png"
                alt="Assistant avatar"
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className={`text-sm sm:text-base font-medium ${isDarkMode ? 'text-teal-400' : 'text-teal-600'}`}>
                {message.avatar || 'U'}
              </span>
            )}
          </div>

          {/* Message Bubble */}
          <div
            className={`relative px-4 sm:px-5 py-3 sm:py-4 shadow-sm text-[15px] sm:text-base leading-relaxed break-words
              ${hasError ? 'border-2 border-red-500' : ''}
              ${
                isBot 
                  ? isDarkMode 
                    ? 'bg-gray-800 text-gray-100 rounded-tr-2xl rounded-tl-2xl rounded-br-2xl rounded-bl-sm border border-gray-700' 
                    : 'bg-white text-gray-800 rounded-tr-3xl rounded-tl-3xl rounded-br-3xl rounded-bl-sm border border-gray-100'
                  : 'bg-teal-600 text-white rounded-tr-3xl rounded-tl-3xl rounded-bl-3xl rounded-br-sm'
              }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              urlTransform={urlTransform}
              components={{
                p: ({ children }) => (
                  <p className="whitespace-pre-wrap mb-2 last:mb-0">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold">{children}</strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-1 mb-3">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-1 mb-3">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="mb-1">{children}</li>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:opacity-80 font-medium"
                  >
                    {children}
                  </a>
                ),
                code: ({ inline, className, children }) => {
                  const raw = normalizeCodeChildren(children).replace(/\n$/, '');
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match?.[1] || 'text';

                  if (!inline) {
                    return <div className="my-3 overflow-hidden rounded-xl shadow-sm"><CodeBlock language={language} code={raw} isDarkMode={isDarkMode} /></div>;
                  }

                  return (
                    <code
                      className={`px-1.5 py-0.5 mx-0.5 rounded-md text-[0.9em] font-mono ${
                        isBot 
                          ? isDarkMode ? 'bg-gray-700 text-teal-300' : 'bg-gray-100 text-teal-600'
                          : 'bg-teal-700 text-white'
                      }`}
                    >
                      {raw}
                    </code>
                  );
                },
              }}
            >
              {String(message.text ?? '')}
            </ReactMarkdown>

            {/* Error Message */}
            {hasError && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-red-200/50">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-500 font-medium">Failed to send</span>
                <button
                  onClick={() => onRetry()}
                  className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline ml-auto"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions & Timestamp */}
        <div className={`flex items-center gap-3 mt-1 px-12 ${isBot ? 'justify-start' : 'justify-end'}`}>
          <span className={`text-[11px] font-medium transition-opacity ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {formatTime(message?.timestamp)}
          </span>

          {!hasError && ((isBot && (onCopy || onRegenerate || onLike || onDislike)) || (!isBot && (onEdit || onCopy))) && (
            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>
              {!isBot && onEdit && (
                <button onClick={onEdit} className="p-1 hover:text-teal-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Edit">
                  <PencilSquareIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {onCopy && (
                <button onClick={onCopy} className="p-1 hover:text-teal-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Copy">
                  <ClipboardIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {isBot && onRegenerate && (
                <button onClick={onRegenerate} className="p-1 hover:text-teal-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors" title="Regenerate">
                  <ArrowPathIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {isBot && onLike && (
                <button onClick={onLike} className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${rating === 1 ? 'text-teal-500' : 'hover:text-teal-500'}`} title="Helpful">
                  <HandThumbUpIcon className="w-3.5 h-3.5" />
                </button>
              )}
              {isBot && onDislike && (
                <button onClick={onDislike} className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors ${rating === -1 ? 'text-red-500' : 'hover:text-red-500'}`} title="Not Helpful">
                  <HandThumbDownIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
