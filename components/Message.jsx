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
      className={`w-full animate-fadeIn motion-reduce:animate-none transition-colors duration-150 ease-out bg-transparent ${
        isDarkMode ? 'border-b border-neutral-900' : 'border-b border-gray-200'
      }`}
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div className="flex gap-3 py-5 sm:py-6">
          {/* Avatar */}
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              isDarkMode ? 'bg-gray-800' : 'bg-gray-200'
            }`}
            role="img"
            aria-label={isBot ? 'Assistant' : 'User'}
          >
            {isBot ? (
              <img
                src="/chat-con.png"
                alt="Assistant avatar"
                className="w-full h-full rounded-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {message.avatar || 'You'}
              </span>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-2 group">
            <div
              className={`text-sm leading-relaxed break-words ${
                hasError
                  ? isDarkMode
                    ? 'text-red-200'
                    : 'text-red-800'
                  : isDarkMode
                    ? 'text-gray-100'
                    : 'text-gray-900'
              }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                urlTransform={urlTransform}
                components={{
                  p: ({ children }) => (
                    <p className="whitespace-pre-wrap leading-7 text-[15px]">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-1 my-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7 text-[15px]">{children}</li>
                  ),
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className={isDarkMode ? 'text-blue-400 underline underline-offset-2' : 'text-blue-600 underline underline-offset-2'}
                    >
                      {children}
                    </a>
                  ),
                  img: ({ src, alt }) => (
                    <img
                      src={src}
                      alt={alt || 'Generated image'}
                      className={`max-w-full h-auto rounded-lg border my-2 ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}
                      loading="lazy"
                      decoding="async"
                    />
                  ),
                  hr: () => (
                    <hr className={isDarkMode ? 'border-gray-700 my-4' : 'border-gray-200 my-4'} />
                  ),
                  blockquote: ({ children }) => (
                    <blockquote
                      className={`border-l-4 pl-4 my-3 ${
                        isDarkMode ? 'border-gray-700 text-gray-200' : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {children}
                    </blockquote>
                  ),
                  code: ({ inline, className, children }) => {
                    const raw = normalizeCodeChildren(children).replace(/\n$/, '');
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match?.[1] || 'text';

                    if (!inline) {
                      return <CodeBlock language={language} code={raw} isDarkMode={isDarkMode} />;
                    }

                    return (
                      <code
                        className={`px-1.5 py-0.5 rounded-md text-[13px] ${
                          isDarkMode
                            ? 'bg-gray-700 text-gray-100'
                            : 'bg-gray-100 text-gray-900'
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
            </div>

          {/* Error State */}
          {hasError && (
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className={`text-xs ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                Failed to send
              </span>
              <button
                onClick={() => onRetry()}
                className={`text-xs font-semibold hover:underline ml-auto ${
                  isDarkMode ? 'text-red-200' : 'text-red-700'
                }`}
                aria-label="Retry sending message"
              >
                Retry
              </button>
            </div>
          )}

          {/* Actions */}
          {!hasError && ((isBot && (onCopy || onRegenerate || onLike || onDislike)) || (!isBot && (onEdit || onCopy))) && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
              {!isBot && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors p-1 rounded ${
                    isDarkMode
                      ? 'text-neutral-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Edit message"
                >
                  <PencilSquareIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
              )}

              {onCopy && (
                <button
                  type="button"
                  onClick={onCopy}
                  className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors p-1 rounded ${
                    isDarkMode
                      ? isBot
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-gray-700'
                        : 'text-neutral-300 hover:text-white hover:bg-gray-700'
                      : isBot
                        ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Copy message"
                >
                  <ClipboardIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
              )}

              {isBot && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors p-1 rounded ${
                    isDarkMode
                      ? 'text-neutral-400 hover:text-neutral-200 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Regenerate response"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
              )}

              {isBot && onLike && (
                <button
                  type="button"
                  onClick={onLike}
                  className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors p-1 rounded ${
                    rating === 1
                      ? isDarkMode
                        ? 'text-green-300'
                        : 'text-green-700'
                      : isDarkMode
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Like response"
                >
                  <HandThumbUpIcon className="w-4 h-4" />
                </button>
              )}

              {isBot && onDislike && (
                <button
                  type="button"
                  onClick={onDislike}
                  className={`inline-flex items-center gap-1 text-xs font-semibold transition-colors p-1 rounded ${
                    rating === -1
                      ? isDarkMode
                        ? 'text-red-300'
                        : 'text-red-700'
                      : isDarkMode
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-gray-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Dislike response"
                >
                  <HandThumbDownIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Timestamp */}
          <span
            className={`text-xs ${
              isDarkMode ? 'text-neutral-500' : 'text-gray-400'
            } opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity`}
          >
            {formatTime(message?.timestamp)}
          </span>
        </div>
        </div>
      </div>
    </div>
  );
}
