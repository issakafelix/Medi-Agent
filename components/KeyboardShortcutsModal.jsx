import React, { useEffect } from 'react';
import { XMarkIcon, CommandLineIcon } from '@heroicons/react/24/outline';

const SHORTCUTS = [
  { keys: ['Enter'], description: 'Send message' },
  { keys: ['Shift', 'Enter'], description: 'New line in message' },
  { keys: ['Ctrl', '/'], description: 'Toggle shortcuts help' },
  { keys: ['Ctrl', 'Shift', 'N'], description: 'New chat' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Toggle sidebar' },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle dark mode' },
  { keys: ['Ctrl', 'Shift', 'F'], description: 'Search chats' },
  { keys: ['Escape'], description: 'Close modal / Cancel edit' },
];

export default function KeyboardShortcutsModal({ isOpen, onClose, isDarkMode }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />
      
      {/* Modal */}
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl animate-slideIn ${
          isDarkMode ? 'bg-neutral-800 border border-neutral-700' : 'bg-white border border-gray-200'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDarkMode ? 'border-neutral-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-2">
            <CommandLineIcon className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
            <h2
              id="shortcuts-title"
              className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode
                ? 'hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200'
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className={`text-sm ${isDarkMode ? 'text-neutral-300' : 'text-gray-600'}`}>
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIdx) => (
                  <React.Fragment key={keyIdx}>
                    <kbd
                      className={`px-2 py-1 text-xs font-mono rounded border ${
                        isDarkMode
                          ? 'bg-neutral-700 border-neutral-600 text-neutral-200'
                          : 'bg-gray-100 border-gray-300 text-gray-700'
                      }`}
                    >
                      {key}
                    </kbd>
                    {keyIdx < shortcut.keys.length - 1 && (
                      <span className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t text-center ${
          isDarkMode ? 'border-neutral-700' : 'border-gray-200'
        }`}>
          <p className={`text-xs ${isDarkMode ? 'text-neutral-500' : 'text-gray-400'}`}>
            Press <kbd className={`px-1.5 py-0.5 text-xs font-mono rounded ${
              isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'
            }`}>Ctrl</kbd> + <kbd className={`px-1.5 py-0.5 text-xs font-mono rounded ${
              isDarkMode ? 'bg-neutral-700 text-neutral-300' : 'bg-gray-100 text-gray-600'
            }`}>/</kbd> anytime to toggle this menu
          </p>
        </div>
      </div>
    </div>
  );
}
