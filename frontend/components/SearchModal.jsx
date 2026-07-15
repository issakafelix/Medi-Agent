import React, { useState, useEffect, useRef, useMemo } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchModal({ isOpen, onClose, isDarkMode, conversations, onSelectResult }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Search across all conversations and messages
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    const matches = [];

    for (const chat of conversations) {
      // Search in chat title
      if (chat.title?.toLowerCase().includes(lowerQuery)) {
        matches.push({
          type: 'chat',
          chatId: chat.id,
          chatTitle: chat.title,
          preview: chat.title,
          timestamp: chat.updatedAt,
        });
      }

      // Search in messages
      for (const msg of chat.messages || []) {
        if (msg.text?.toLowerCase().includes(lowerQuery)) {
          const idx = msg.text.toLowerCase().indexOf(lowerQuery);
          const start = Math.max(0, idx - 30);
          const end = Math.min(msg.text.length, idx + query.length + 50);
          const preview = (start > 0 ? '...' : '') + msg.text.slice(start, end) + (end < msg.text.length ? '...' : '');

          matches.push({
            type: 'message',
            chatId: chat.id,
            chatTitle: chat.title,
            messageId: msg.id,
            sender: msg.sender,
            preview,
            timestamp: msg.timestamp,
          });
        }
      }
    }

    // Sort by timestamp (newest first) and limit results
    return matches
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
  }, [query, conversations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[5vh] sm:pt-[10vh] p-2 sm:p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close search"
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl rounded-2xl shadow-2xl animate-slideIn overflow-hidden ${
          isDarkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
      >
        {/* Search Input */}
        <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b ${
          isDarkMode ? 'border-neutral-700' : 'border-gray-200'
        }`}>
          <MagnifyingGlassIcon className={`w-5 h-5 flex-shrink-0 ${
            isDarkMode ? 'text-neutral-400' : 'text-gray-400'
          }`} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all chats and messages..."
            className={`flex-1 bg-transparent border-0 outline-none text-sm ${
              isDarkMode ? 'text-white placeholder-neutral-500' : 'text-black placeholder-gray-400'
            }`}
            id="search-title"
          />
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-neutral-700 text-neutral-400'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.trim() && results.length === 0 && (
            <div className={`px-4 py-8 text-center ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
              <p className="text-sm">No results found for &quot;{query}&quot;</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result, idx) => (
                <button
                  key={`${result.chatId}-${result.messageId || 'chat'}-${idx}`}
                  type="button"
                  onClick={() => {
                    onSelectResult(result);
                    onClose();
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isDarkMode
                      ? 'hover:bg-neutral-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      result.type === 'chat'
                        ? isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                        : result.sender === 'bot'
                          ? isDarkMode ? 'bg-gray-700/70 text-gray-200' : 'bg-gray-200 text-gray-800'
                          : isDarkMode ? 'bg-gray-600/60 text-gray-100' : 'bg-gray-300 text-gray-900'
                    }`}>
                      {result.type === 'chat' ? 'Chat' : result.sender === 'bot' ? 'AI' : 'You'}
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
                      {result.chatTitle}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${isDarkMode ? 'text-neutral-200' : 'text-black'}`}>
                    {result.preview}
                  </p>
                </button>
              ))}
            </div>
          )}

          {!query.trim() && (
            <div className={`px-4 py-8 text-center ${isDarkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
              <p className="text-sm">Start typing to search across all your conversations</p>
            </div>
          )}
        </div>

        {/* Footer - hidden on small screens */}
        <div className={`hidden sm:block px-4 py-2 border-t ${isDarkMode ? 'border-neutral-700' : 'border-gray-200'}`}>
          <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
            <kbd className={`px-1.5 py-0.5 text-xs font-mono rounded ${
              isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'
            }`}>↵</kbd> to select · <kbd className={`px-1.5 py-0.5 text-xs font-mono rounded ${
              isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'
            }`}>Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
