import React from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

/**
 * ChatHistory Component - Sidebar for previous conversations
 * Can be integrated into main ChatBot component when expanded
 */
export default function ChatHistory({
  onSelectChat,
  currentChatId,
  onNewChat,
  onDeleteChat,
  onClearAll,
  conversations,
}) {
  const items = Array.isArray(conversations) ? conversations : [];

  // formatRelative removed — not currently used

  return (
    <aside
      className={`w-72 flex flex-col pt-[env(safe-area-inset-top)] bg-[var(--bg-sidebar)] border-r border-[var(--border)] h-full min-h-0 transition-colors duration-300`}
    >
      {/* New Chat Button */}
      <button
        type="button"
        onClick={() => onNewChat?.()}
        className={`m-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 border border-[var(--border)] bg-[var(--bg-color)] text-[var(--text-main)] hover:bg-[var(--user-bubble)] shadow-sm flex items-center justify-between group/newchat`}
        aria-label="Start new conversation"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </span>
        <svg className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover/newchat:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* History List */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth overscroll-contain px-3 py-2 custom-scrollbar">
        <div
          className={`text-[11px] font-bold uppercase tracking-wider px-2 py-3 text-[var(--text-muted)]`}
        >
          Recent
        </div>

        {items.length === 0 && (
          <div className="px-2 py-3 text-sm text-[var(--text-muted)] italic">
            No chats yet.
          </div>
        )}

        {items
          .slice()
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map((chat) => (
            <div key={chat.id} className="relative group/item mb-1">
              <button
                onClick={() => onSelectChat(chat.id)}
                className={`w-full text-left pr-10 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  currentChatId === chat.id
                    ? 'bg-[var(--user-bubble)] text-[var(--text-main)] font-medium'
                    : 'text-[var(--text-main)] hover:bg-[var(--user-bubble)]/50'
                }`}
                aria-label={`Open chat: ${chat.title || 'Chat'}`}
              >
                <p className="truncate text-sm">{chat.title}</p>
              </button>

              {typeof onDeleteChat === 'function' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all duration-200 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                  aria-label={`Delete chat: ${chat.title || 'Chat'}`}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
      </div>
      
      {/* Footer Info */}
      <div className="p-3 border-t border-[var(--border)]">
         {items.length > 0 && (
          <button
            type="button"
            onClick={() => onClearAll?.()}
            className="w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 text-left flex items-center gap-2"
          >
            <TrashIcon className="w-3 h-3" />
            Clear all conversations
          </button>
        )}
      </div>
    </aside>
  );
}
