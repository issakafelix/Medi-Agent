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

    // Symptom descriptions
    if (text.includes('symptom') || text.includes('pain') || text.includes('fever') || text.includes('ache')) {
      newSuggestions.push('Are there any other common symptoms I should look out for?');
      newSuggestions.push('How long do these symptoms typically last?');
      newSuggestions.push('When should I see a doctor immediately?');
    }
    // Medicine / Treatment
    else if (text.includes('medication') || text.includes('treatment') || text.includes('ibuprofen') || text.includes('dose')) {
      newSuggestions.push('What are the potential side effects of these medications?');
      newSuggestions.push('Are there any natural home remedies I can try?');
      newSuggestions.push('Can I take this medication with food?');
    }
    // Diagnosis / Condition
    else if (text.includes('condition') || text.includes('infection') || text.includes('disease') || text.includes('virus')) {
      newSuggestions.push('How is this condition officially diagnosed?');
      newSuggestions.push('Is this condition contagious?');
      newSuggestions.push('What are the long-term effects of this?');
    }
    // Hospital / Doctor
    else if (text.includes('hospital') || text.includes('clinic') || text.includes('specialist') || text.includes('doctor')) {
      newSuggestions.push('What type of specialist should I see for this?');
      newSuggestions.push('What should I bring to my doctor appointment?');
      newSuggestions.push('Are there urgent care clinics you recommend nearby?');
    }
    // General medical fallback
    else {
      newSuggestions.push('Can you explain that in simpler terms?');
      newSuggestions.push('What are the best preventative measures I can take?');
      newSuggestions.push('How does diet or lifestyle affect this?');
    }

    // Limit to 3 suggestions
    setSuggestions(newSuggestions.slice(0, 3));
  }, [lastBotMessage, lastUserMessage]);

  return suggestions;
}
