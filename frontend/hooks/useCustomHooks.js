/**
 * Utility Hooks for Chatbot Application
 */

import { useState, useEffect, useRef } from 'react';

/**
 * Hook for managing dark mode persistence
 */
export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('isDarkMode');
    if (stored !== null) return JSON.parse(stored);

    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
    // Apply to document root if using class-based dark mode
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  return [isDarkMode, setIsDarkMode];
};

/**
 * Hook for auto-scrolling to latest message
 */
export const useAutoScroll = (dependency) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dependency]);

  return scrollRef;
};

/**
 * Hook for message notifications (with auto-dismiss)
 */
export const useNotification = (initialMessage = null, duration = 3000) => {
  const [notification, setNotification] = useState(initialMessage);

  const showNotification = (message) => {
    setNotification(message);
    const timer = setTimeout(() => setNotification(null), duration);
    return () => clearTimeout(timer);
  };

  const dismissNotification = () => setNotification(null);

  return {
    notification,
    showNotification,
    dismissNotification,
  };
};

/**
 * Hook for managing chat messages
 */
export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        ...message,
        id: Date.now(),
        timestamp: new Date(),
      },
    ]);
  };

  const updateMessage = (id, updates) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  };

  const removeMessage = (id) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    setMessages,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    isLoading,
    setIsLoading,
  };
};

/**
 * Hook for debouncing user input
 */
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
