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
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isImageMode = inputMode === 'image';

  return (
    <div
      className={`px-3 sm:px-6 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:pt-4 sm:pb-6 bg-transparent flex justify-center`}
    >
      <div className={`w-full max-w-3xl flex flex-col p-3 rounded-[32px] transition-colors duration-200 ${
        isDarkMode ? 'bg-[#1e1f22]' : 'bg-gray-100'
      }`}>
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
            className={`w-full bg-transparent border-0 outline-none resize-none px-3 pt-2 pb-1 text-[16px] sm:text-base ${
              isDarkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-500'
            } disabled:opacity-50`}
          />

          <div className="flex items-center justify-between mt-1 px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePickAttachment}
                disabled={isLoading || isListening}
                className={`p-2.5 rounded-full transition-colors ${
                  isDarkMode ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                }`}
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
                        : isDarkMode ? 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={`p-2.5 rounded-full transition-colors ${
                    isDarkMode ? 'text-white hover:bg-gray-700/50' : 'text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
