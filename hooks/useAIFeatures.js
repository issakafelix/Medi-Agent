import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for Web Speech API voice input
 * Provides real-time speech-to-text transcription
 */
export function useVoiceInput() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRecognition));
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        finalTranscriptRef.current = '';
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          setError('No speech detected. Try again.');
        } else if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone access.');
        } else {
          setError(`Error: ${event.error}`);
        }
      };
      
      recognition.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        
        // Build complete transcript from all results
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        
        // Only update if changed to avoid duplication
        if (finalText !== finalTranscriptRef.current) {
          finalTranscriptRef.current = finalText;
          setTranscript(finalText);
        }
        setInterimTranscript(interimText);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    finalTranscriptRef.current = '';
    
    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      recognitionRef.current.start();
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (e.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else if (e.name === 'InvalidStateError') {
        // Already started - ignore
      } else {
        setError('Could not start voice recognition: ' + e.message);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch {
      // Already stopped
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    fullTranscript: transcript + interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    clearTranscript,
  };
}

/**
 * Custom hook for auto-saving drafts to localStorage
 */
export function useAutoSaveDraft(key, value, delay = 500) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (value?.trim()) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, value, delay]);

  const loadDraft = useCallback(() => {
    return localStorage.getItem(key) || '';
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
  }, [key]);

  return { loadDraft, clearDraft };
}

/**
 * Custom hook for generating suggested follow-up prompts
 * Specialized for programming and IT contexts
 */
export function useSuggestedPrompts(lastBotMessage, lastUserMessage) {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!lastBotMessage?.text || lastBotMessage.pending || lastBotMessage.error) {
      setSuggestions([]);
      return;
    }

    const text = lastBotMessage.text.toLowerCase();
    const userText = lastUserMessage?.text?.toLowerCase() || '';
    const newSuggestions = [];

    // Code-related suggestions
    if (text.includes('```') || text.includes('function') || text.includes('class ') || text.includes('const ') || text.includes('def ')) {
      newSuggestions.push('Analyze time & space complexity');
      newSuggestions.push('Add error handling and edge cases');
      newSuggestions.push('Write unit tests for this');
      newSuggestions.push('Show a more optimized version');
    }
    // System design / architecture
    else if (text.includes('database') || text.includes('api') || text.includes('server') || text.includes('architecture') || text.includes('microservice')) {
      newSuggestions.push('How would this scale to 1M users?');
      newSuggestions.push('What are the security considerations?');
      newSuggestions.push('Show the database schema design');
      newSuggestions.push('Add caching and optimization');
    }
    // Error / debugging context
    else if (text.includes('error') || text.includes('bug') || text.includes('issue') || text.includes('fix') || userText.includes('error')) {
      newSuggestions.push('What causes this error?');
      newSuggestions.push('How can I prevent this in the future?');
      newSuggestions.push('Show debugging steps');
    }
    // Algorithm / DSA context
    else if (text.includes('o(') || text.includes('complexity') || text.includes('algorithm') || text.includes('array') || text.includes('tree')) {
      newSuggestions.push('Can we optimize further?');
      newSuggestions.push('What about edge cases?');
      newSuggestions.push('Show alternative approaches');
      newSuggestions.push('Explain the intuition behind this');
    }
    // Security context
    else if (text.includes('security') || text.includes('vulnerability') || text.includes('authentication') || text.includes('encrypt')) {
      newSuggestions.push('What are common attack vectors?');
      newSuggestions.push('Show secure implementation');
      newSuggestions.push('How to test for vulnerabilities?');
    }
    // DevOps context
    else if (text.includes('docker') || text.includes('kubernetes') || text.includes('deploy') || text.includes('ci/cd') || text.includes('pipeline')) {
      newSuggestions.push('Show production-ready config');
      newSuggestions.push('Add monitoring and logging');
      newSuggestions.push('What about high availability?');
    }
    // List/comparison suggestions
    else if (text.includes('1.') || text.includes('•') || text.includes('pros') || text.includes('cons')) {
      newSuggestions.push('Which would you recommend and why?');
      newSuggestions.push('Dive deeper into the trade-offs');
      newSuggestions.push('Show implementation examples');
    }
    // General programming fallback
    else {
      newSuggestions.push('Show me a code example');
      newSuggestions.push('What are best practices for this?');
      newSuggestions.push('How is this used in production?');
    }

    // Limit to 3 suggestions
    setSuggestions(newSuggestions.slice(0, 3));
  }, [lastBotMessage, lastUserMessage]);

  return suggestions;
}
