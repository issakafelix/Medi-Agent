import React, { useRef, useState } from 'react';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  PlusIcon,
  ArrowUpIcon,
} from '@heroicons/react/24/solid';

export default function ChatInput({
  onSendMessage,
  onVoiceInput,
  isLoading,
  isDarkMode,
  inputMode,
  onInputModeChange,
  value,
  onChange,
  isEditing,
  onCancelEdit,
  inputRef,
  onUploadDocument,
  onUploadImage,
  isListening,
  liveTranscript,
  promptPresets = [],
  promptPresetKey,
  onPromptPresetChange,
}) {
  const isControlled = typeof value === 'string' && typeof onChange === 'function';
  const [uncontrolledInput, setUncontrolledInput] = useState('');
  const input = isControlled ? value : uncontrolledInput;
  const setInput = isControlled ? onChange : setUncontrolledInput;

  const attachmentInputRef = useRef(null);

  const handlePickAttachment = () => {
    if (isLoading) return;
    attachmentInputRef.current?.click?.();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isImageMode = inputMode === 'image';

  return (
    <div
      className={`px-3 sm:px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pt-4 sm:pb-8 bg-transparent flex justify-center`}
    >
      <div className={`w-full max-w-3xl flex flex-col p-[2px] transition-all duration-300 bg-white border border-[var(--border)] rounded-[2rem] focus-within:shadow-lg focus-within:border-[var(--brand-main)]/50 shadow-sm`}>
        <div className="flex flex-col p-3 pt-3">
          {/* Preset Chips */}
          {promptPresets.length > 0 && (
             <div className="flex overflow-x-auto gap-1.5 sm:gap-2 mb-3 px-1 pb-1 no-scrollbar">
               {promptPresets.map((preset) => (
                 <button
                   key={preset.key}
                   type="button"
                   onClick={() => onPromptPresetChange?.(preset.key)}
                   className={`flex items-center gap-1.5 px-3 py-1 bg-transparent rounded-full text-[11px] font-medium transition-colors border ${
                     promptPresetKey === preset.key
                       ? 'text-white border-stakely-border bg-stakely-surface shadow-glow'
                       : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/30'
                   }`}
                 >
                   {preset.label}
                 </button>
               ))}
             </div>
          )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <input
            ref={attachmentInputRef}
            type="file"
            accept="image/*,.txt,.md,.csv,.json,.log,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (String(file.type || '').startsWith('image/')) {
                  onUploadImage?.(file);
                } else {
                  onUploadDocument?.(file);
                }
              }
              e.target.value = '';
            }}
          />

          {isEditing && (
            <div className={`mb-2 mx-2 flex flex-row justify-between items-center text-xs px-3 py-1.5 rounded-xl ${
              isDarkMode ? 'bg-yellow-900/30 text-yellow-500' : 'bg-yellow-100 text-yellow-800'
            }`}>
              <span>✏️ Editing message</span>
              <button type="button" onClick={onCancelEdit} className="font-semibold hover:underline">Cancel</button>
            </div>
          )}

          {isListening && (
            <div className={`text-xs mx-3 mb-2 italic ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
              🎤 {liveTranscript || 'Listening...'}
            </div>
          )}

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening ? 'Speak now...' : isImageMode ? 'Describe the image...' : 'Ask Health Assistant'
            }
            disabled={isLoading || isListening}
            rows="1"
            style={{ maxHeight: '160px' }}
            className={`w-full bg-transparent border-0 outline-none resize-none px-3 pt-2 pb-1 text-[16px] sm:text-base text-[var(--user-text)] placeholder-gray-500 disabled:opacity-50`}
          />

          <div className="flex items-center justify-between mt-1 px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePickAttachment}
                disabled={isLoading || isListening}
                className={`p-2.5 rounded-full transition-colors text-gray-400 hover:bg-[var(--brand-light)] hover:text-[var(--brand-main)]`}
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {!input.trim() ? (
                <>
                  <button
                    type="button"
                    onClick={() => onVoiceInput?.()}
                    disabled={isLoading}
                    className={`p-2.5 rounded-full transition-colors ${
                      isListening
                        ? 'bg-red-500/20 text-red-500 animate-pulse'
                        : 'text-gray-400 hover:bg-[var(--brand-light)] hover:text-[var(--brand-main)]'
                    }`}
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                    !input.trim() || isLoading
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-[var(--brand-main)] text-white shadow-lg hover:bg-[var(--brand-dark)]'
                  }`}
                >
                  <ArrowUpIcon className="w-4 h-4 stroke-2" />
                </button>
              )}
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
