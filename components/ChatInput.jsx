import React, { useRef, useState } from 'react';
import {
  PaperAirplaneIcon,
  MicrophoneIcon,
  PlusIcon,
  SpeakerWaveIcon,
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
    // Send on Enter, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isImageMode = inputMode === 'image';

  return (
    <div
      className={`border-t bg-[var(--bg-primary)] ${
        isDarkMode ? 'border-neutral-900' : 'border-gray-200'
      } px-4 sm:px-6 py-2 sm:py-3`}
    >
      <div className="mx-auto w-full max-w-3xl">
      {isEditing && (
        <div
          className={`mb-2 flex items-center justify-between text-xs px-3 py-2 rounded-xl border ${
            isDarkMode
              ? 'border-yellow-600 bg-yellow-900 text-yellow-200'
              : 'border-yellow-400 bg-yellow-100 text-yellow-800'
          }`}
        >
          <span>✏️ Editing message</span>
          <button
            type="button"
            onClick={() => onCancelEdit?.()}
            disabled={isLoading}
            className={`font-semibold transition-colors ${
              isDarkMode
                ? 'text-yellow-300 hover:text-yellow-100 disabled:text-gray-600'
                : 'text-yellow-700 hover:text-yellow-900 disabled:text-gray-300'
            }`}
            aria-label="Cancel editing"
          >
            Cancel
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        {/* Hidden file input (documents + images) */}
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

        <div className="flex items-end gap-2">
          {/* Plus button (attachments) */}
          <button
            type="button"
            onClick={handlePickAttachment}
            disabled={isLoading || isListening}
            className={`p-2 sm:p-2.5 rounded-full transition-all duration-200 flex-shrink-0 border ${
              isDarkMode
                ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:text-gray-600'
                : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:text-gray-300'
            }`}
            aria-label="Add attachment"
            title="Attach an image or document"
          >
            <PlusIcon className="w-5 h-5" />
          </button>

          {/* Input pill */}
          <div
            className={`flex-1 min-w-0 flex flex-col rounded-3xl border transition-all duration-200 ${
              isListening
                ? 'border-red-500 ring-2 ring-red-500/30'
                : isDarkMode
                  ? 'bg-gray-700 border-gray-600 focus-within:border-gray-400'
                  : 'bg-gray-100 border-gray-200 focus-within:border-gray-300'
            }`}
          >
            <div className="flex items-end gap-2 px-3 sm:px-4 py-2 sm:py-2.5">
          {/* Live transcript display while listening */}
          {isListening && liveTranscript && (
            <div className={`text-xs mb-1 italic ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
              🎤 {liveTranscript}
            </div>
          )}
          {isListening && !liveTranscript && (
            <div className={`text-xs mb-1 italic ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>
              🎤 Listening...
            </div>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Speaking...'
                : isImageMode
                  ? 'Describe the image you want...'
                  : 'Ask anything'
            }
            disabled={isLoading || isListening}
            rows="1"
            className={`flex-1 min-w-0 bg-transparent border-0 outline-none resize-none text-sm ${
              isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
            } disabled:opacity-50`}
            aria-label="Message input"
            style={{ maxHeight: '120px' }}
          />
            {/* Right-side actions: mic/voice when empty, send when typing */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {!input.trim() ? (
                <>
                  <button
                    type="button"
                    onClick={() => onVoiceInput?.()}
                    disabled={isLoading}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : isDarkMode
                          ? 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-60'
                          : 'hover:bg-gray-200 text-gray-600 disabled:text-gray-300'
                    }`}
                    aria-label={isListening ? 'Stop listening' : 'Voice input'}
                    title={isListening ? 'Click to stop' : 'Click to speak'}
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onVoiceInput?.()}
                    disabled={isLoading}
                    className={`p-2 rounded-full transition-all duration-200 ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : isDarkMode
                          ? 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-60'
                          : 'hover:bg-gray-200 text-gray-600 disabled:text-gray-300'
                    }`}
                    aria-label={isListening ? 'Stop voice mode' : 'Voice mode'}
                    title={isListening ? 'Click to stop' : 'Voice mode'}
                  >
                    <SpeakerWaveIcon className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`p-2 rounded-full transition-all duration-200 font-semibold ${
                    input.trim() && !isLoading
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : isDarkMode
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  aria-label="Send message"
                  title="Send"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            </div>
          </div>
        </div>

        {/* Mode Toggle (kept, but secondary) */}
        {typeof onInputModeChange === 'function' && (
          <div
            className={`hidden sm:flex items-center justify-center rounded-xl border overflow-hidden self-center ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
            }`}
            aria-label="Input mode"
          >
            <button
              type="button"
              onClick={() => onInputModeChange?.('text')}
              disabled={isLoading || isListening}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                !isImageMode
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Text mode"
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => onInputModeChange?.('image')}
              disabled={isLoading || isListening}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${
                isImageMode
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Image mode"
            >
              Image
            </button>
          </div>
        )}
      </form>

      {/* Helper Text - hidden on mobile */}
      <p
        className={`hidden sm:block text-xs mt-2 text-center ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        Press Enter to send, Shift+Enter for new line
      </p>
      </div>
    </div>
  );
}
