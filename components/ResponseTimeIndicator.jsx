import React from 'react';
import { ClockIcon } from '@heroicons/react/24/outline';

/**
 * Shows how long the AI took to respond
 */
export default function ResponseTimeIndicator({ responseTimeMs, isDarkMode }) {
  if (!responseTimeMs || responseTimeMs <= 0) return null;

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className={`inline-flex items-center gap-1 text-xs ${
      isDarkMode ? 'text-neutral-500' : 'text-gray-400'
    }`}>
      <ClockIcon className="w-3 h-3" />
      <span>{formatTime(responseTimeMs)}</span>
    </div>
  );
}
