import React from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, ShareIcon } from '@heroicons/react/24/outline';

/**
 * MessageActions Component - Feedback and interaction options
 * Appears on hover for bot messages
 */
export default function MessageActions({ messageId, onLike, onDislike, onShare, isDarkMode }) {
  return (
    <div
      className={`flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity`}
    >
      <button
        onClick={() => onLike(messageId)}
        className={`p-1 rounded transition-colors ${
          isDarkMode
            ? 'hover:bg-neutral-700 text-neutral-400'
            : 'hover:bg-gray-200 text-gray-500'
        }`}
        aria-label="Like response"
      >
        <HandThumbUpIcon className="w-4 h-4" />
      </button>

      <button
        onClick={() => onDislike(messageId)}
        className={`p-1 rounded transition-colors ${
          isDarkMode
            ? 'hover:bg-neutral-700 text-neutral-400'
            : 'hover:bg-gray-200 text-gray-500'
        }`}
        aria-label="Dislike response"
      >
        <HandThumbDownIcon className="w-4 h-4" />
      </button>

      <button
        onClick={() => onShare(messageId)}
        className={`p-1 rounded transition-colors ${
          isDarkMode
            ? 'hover:bg-neutral-700 text-neutral-400'
            : 'hover:bg-gray-200 text-gray-500'
        }`}
        aria-label="Share response"
      >
        <ShareIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
