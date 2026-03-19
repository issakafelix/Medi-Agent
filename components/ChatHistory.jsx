import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

/**
 * ChatHistory Component - Sidebar for previous conversations
 * Can be integrated into main ChatBot component when expanded
 */
export default function ChatHistory({
  isDarkMode,
  onSelectChat,
  currentChatId,
  onNewChat,
  onDeleteChat,
  onClearAll,
  conversations,
}) {
  const items = Array.isArray(conversations) ? conversations : [];

  const formatRelative = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  };

  return (
    <aside
      className={`w-72 border-r flex flex-col ${
        isDarkMode
          ? 'bg-gray-900 border-gray-800'
          : 'bg-white border-gray-200'
      } h-full min-h-0`}
    >
      {/* New Chat Button */}
      <button
        type="button"
        onClick={() => onNewChat?.()}
        className={`m-3 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 border ${
          isDarkMode
            ? 'bg-gray-800 hover:bg-gray-700 text-white border-gray-700'
            : 'bg-white hover:bg-gray-100 text-gray-900 border-gray-300'
        }`}
        aria-label="Start new conversation"
      >
        + New Chat
      </button>

      {/* Clear All */}
      {items.length > 0 && (
        <button
          type="button"
          onClick={() => onClearAll?.()}
          className={`mx-3 -mt-1 mb-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
            isDarkMode
              ? 'bg-gray-900 hover:bg-gray-800 text-gray-200 border-gray-800'
              : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200'
          }`}
          aria-label="Delete all chats"
        >
          Delete all
        </button>
      )}

      {/* History List */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain px-2">
        <div
          className={`text-xs font-semibold uppercase tracking-wider px-3 py-2 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Recent Chats
        </div>

        {items.length === 0 && (
          <div className={`px-3 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No chats yet.
          </div>
        )}

        {items
          .slice()
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map((chat) => (
            <div key={chat.id} className="relative group">
              <button
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left pr-10 px-3 py-2.5 rounded-xl mb-1 transition-all duration-200 ${
                  currentChatId === chat.id
                    ? isDarkMode
                      ? 'bg-gray-800 text-white'
                      : 'bg-gray-200 text-gray-900'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-white'
                }`}
                aria-label={`Open chat: ${chat.title || 'Chat'}`}
              >
                <p className="truncate text-sm font-medium">{chat.title}</p>
                <p
                  className={`truncate text-xs mt-0.5 ${
                    currentChatId === chat.id
                      ? isDarkMode ? 'text-white/70' : 'text-gray-600'
                      : isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}
                >
                  {formatRelative(chat.updatedAt)}
                </p>
              </button>

              {typeof onDeleteChat === 'function' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className={`absolute right-2 top-2 p-2 rounded-lg transition-opacity ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  } opacity-0 group-hover:opacity-100 focus:opacity-100`}
                  aria-label={`Delete chat: ${chat.title || 'Chat'}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
      </div>
    </aside>
  );
}
