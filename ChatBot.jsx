import React, { useMemo, useRef, useEffect, useState } from 'react';
import ChatInput from './components/ChatInput';
import Message from './components/Message';
import TypingIndicator from './components/TypingIndicator';
import Toast from './components/Toast';
import ChatHistory from './components/ChatHistory';
import SuggestedPrompts from './components/SuggestedPrompts';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import SearchModal from './components/SearchModal';
import ResponseTimeIndicator from './components/ResponseTimeIndicator';
import { useVoiceInput, useAutoSaveDraft, useSuggestedPrompts } from './hooks/useAIFeatures';
import {
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  describeImage,
  sendMessage,
  getConversations,
  getConversation,
  deleteConversation,
  rateMessage,
} from './services/apiService';

const THEME_STORAGE_KEY = 'chatbot.theme';
const MEMORY_STORAGE_KEY = 'chatbot.memory';
const PREFS_STORAGE_KEY = 'chatbot.prefs';
const EMPTY_MESSAGES = [];

const PROMPT_PRESETS = [
  { 
    key: 'default', 
    label: '💻 Full-Stack Dev', 
    system: '' 
  },
  {
    key: 'health',
    label: '🩺 Health',
    system: 'health'
  },
  { 
    key: 'senior-engineer', 
    label: '🏗️ Senior Engineer', 
    system: 'senior-engineer' 
  },
  { 
    key: 'code-reviewer', 
    label: '🔍 Code Reviewer', 
    system: 'code-reviewer' 
  },
  { 
    key: 'architect', 
    label: '📐 System Architect', 
    system: 'architect' 
  },
  { 
    key: 'devops', 
    label: '🚀 DevOps Engineer', 
    system: 'devops' 
  },
  { 
    key: 'security', 
    label: '🔒 Security Expert', 
    system: 'security' 
  },
  { 
    key: 'debug', 
    label: '🐛 Debug Assistant', 
    system: 'debug' 
  },
  { 
    key: 'dsa', 
    label: '📊 DSA & Algorithms', 
    system: 'dsa' 
  },
  { 
    key: 'interview', 
    label: '🎯 Interview Prep', 
    system: 'interview' 
  },
];

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function summarizeTextHeuristic(rawText) {
  const text = String(rawText ?? '').replace(/\r\n/g, '\n');
  const trimmed = text.replace(/\s+/g, ' ').trim();
  const wordCount = trimmed ? trimmed.split(' ').length : 0;
  const charCount = text.length;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const topLines = lines.slice(0, 8);

  // Very simple sentence extraction
  const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [];
  const lead = (sentences.length ? sentences.slice(0, 4).join(' ').trim() : trimmed.slice(0, 600)).trim();

  return {
    wordCount,
    charCount,
    preview: topLines.join('\n'),
    lead,
  };
}

async function readTextFile(file) {
  return await file.text();
}

async function extractTextFromPdfOptional(file) {
  // Optional dependency: pdfjs-dist
  try { 
    // Hide optional dependency from Rollup so builds work even when pdfjs-dist isn't installed.
    const runtimeImport = new Function('p', 'return import(p)');
    const pdfjsLib = await runtimeImport('pdfjs-dist');

    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    let out = '';
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const content = await page.getTextContent();
      const strings = content.items
        .map((it) => ('str' in it ? it.str : ''))
        .filter(Boolean);
      out += strings.join(' ') + '\n';
      // Keep extraction bounded
      if (out.length > 120000) break;
    }
    return out.trim();
  } catch (e) {
    return null;
  }
}

export default function ChatBot({ isDarkMode: controlledDarkMode, onToggleDarkMode } = {}) {
  const initialMessages = useMemo(
    () => [
      {
        id: 1,
        text: "👋 Hi! I'm your AI research assistant.\n\nI’m built to help deeply in **two areas**: **coding/computer research** and **health research & guidance**.\n\nPick *General* or *Health* in the header, or just ask your question.",
        sender: 'bot',
        timestamp: new Date(Date.now() - 60000),
        avatar: '🤖',
      },
    ],
    []
  );

  const [chats, setChats] = useState([
    {
      id: 1,
      title: 'New chat',
      updatedAt: new Date(),
      conversationId: null,
      backendLoaded: false,
      messages: initialMessages,
    },
  ]);
  const [currentChatId, setCurrentChatId] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState('text'); // text | image
  const [uncontrolledDarkMode, setUncontrolledDarkMode] = useState(false);
  const isDarkMode = controlledDarkMode ?? uncontrolledDarkMode;

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const isThemeExplicitRef = useRef(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // New AI feature states
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const requestStartTimeRef = useRef(null);

  const inputRef = useRef(null);
  const [draftText, setDraftText] = useState('');
  const [editing, setEditing] = useState(null); // { userMessageId: number, botMessageId: number | null }

  const [promptPresetKey, setPromptPresetKey] = useState('default');

  const [memoryDraft, setMemoryDraft] = useState('');
  const [savedMemory, setSavedMemory] = useState('');
  const [tone, setTone] = useState('neutral'); // neutral | friendly | professional
  const [verbosity, setVerbosity] = useState('normal'); // concise | normal | detailed

  const nextIdRef = useRef(2);
  const nextChatIdRef = useRef(2);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  
  // Voice input hook
  const { 
    isListening, 
    fullTranscript,
    interimTranscript,
    error: voiceError, 
    isSupported: voiceSupported,
    toggleListening,
    clearTranscript 
  } = useVoiceInput();
  
  // Auto-save draft hook
  const DRAFT_KEY = `chatbot.draft.${currentChatId}`;
  const { loadDraft, clearDraft } = useAutoSaveDraft(DRAFT_KEY, draftText);

  const toggleDarkMode = () => {
    if (typeof onToggleDarkMode === 'function') {
      onToggleDarkMode(!isDarkMode);
      return;
    }

    const next = !isDarkMode;
    isThemeExplicitRef.current = true;
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    setUncontrolledDarkMode(next);
  };

  const nextId = () => {
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    return id;
  };

  const currentChat = useMemo(
    () => chats.find((c) => c.id === currentChatId) ?? chats[0],
    [chats, currentChatId]
  );

  const messages = useMemo(
    () => currentChat?.messages ?? EMPTY_MESSAGES,
    [currentChat]
  );
  
  // Get last messages for suggested prompts
  const lastBotMessage = useMemo(
    () => [...messages].reverse().find((m) => m.sender === 'bot'),
    [messages]
  );
  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((m) => m.sender === 'user'),
    [messages]
  );
  const suggestedFollowUps = useSuggestedPrompts(lastBotMessage, lastUserMessage);
  
  // Load saved draft on chat switch
  useEffect(() => {
    const savedDraft = loadDraft();
    if (savedDraft) {
      setDraftText(savedDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId]);
  
  // Append voice transcript to draft - only when listening stops
  const prevListeningRef = useRef(false);
  useEffect(() => {
    // Only append when we transition from listening to not listening
    if (prevListeningRef.current && !isListening && fullTranscript) {
      setDraftText((prev) => (prev ? prev + ' ' : '') + fullTranscript.trim());
      clearTranscript();
    }
    prevListeningRef.current = isListening;
  }, [isListening, fullTranscript, clearTranscript]);
  
  // Show voice errors
  useEffect(() => {
    if (voiceError) {
      showToast(voiceError, 'error');
    }
  }, [voiceError]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);
  
  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+/ - Toggle shortcuts help
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
        return;
      }
      // Ctrl+Shift+N - New chat
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        handleNewChat();
        return;
      }
      // Ctrl+Shift+S - Toggle sidebar
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
        return;
      }
      // Ctrl+Shift+D - Toggle dark mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDarkMode();
        return;
      }
      // Ctrl+Shift+F - Search chats
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setShowSearchModal(true);
        return;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getConversations(50);
        const convos = Array.isArray(data?.conversations) ? data.conversations : [];
        if (!convos.length) return;

        const mapped = convos.map((c) => {
          const localId = nextChatIdRef.current;
          nextChatIdRef.current += 1;

          return {
            id: localId,
            title: c.title || 'Chat',
            updatedAt: new Date(c.updated_at),
            conversationId: c.conversation_id,
            backendLoaded: false,
            messages: [],
          };
        });

        if (cancelled) return;
        setChats(mapped);
        setCurrentChatId(mapped[0].id);
      } catch {
        // Backend might not be running; keep local chats.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const sendToBackend = async ({
    text,
    conversationId,
  }) => {
    return await sendMessage(text, {
      conversationId,
      tone,
      verbosity,
      memory: savedMemory,
      preset: promptPresetKey,
    });
  };

  const parseImageCommand = (text) => {
    const raw = String(text ?? '').trim();
    const lower = raw.toLowerCase();
    const isCmd = lower.startsWith('/image ') || lower.startsWith('/img ');
    if (!isCmd) return { isImage: false, raw, display: raw };
    const prompt = raw.split(' ').slice(1).join(' ').trim();
    return { isImage: true, raw, display: prompt };
  };

  const mapBackendConversationMessages = (detail) => {
    const out = [];
    let lastUserLocalId = null;
    let lastUserPromptRaw = '';

    const msgs = Array.isArray(detail?.messages) ? detail.messages : [];
    for (const m of msgs) {
      const role = String(m?.role ?? 'user');
      const isBot = role === 'bot' || role === 'assistant';
      const localId = nextId();

      const rawContent = String(m?.content ?? '');
      const parsed = !isBot ? parseImageCommand(rawContent) : null;

      const msg = {
        id: localId,
        text: !isBot ? (parsed?.display ?? rawContent) : rawContent,
        sender: isBot ? 'bot' : 'user',
        timestamp: new Date(m?.created_at ?? Date.now()),
        avatar: isBot ? '🤖' : '👤',
        backend: {
          message_id: m?.message_id,
          rating: m?.rating ?? null,
          raw_content: rawContent,
        },
      };

      if (isBot) {
        msg.inReplyTo = lastUserLocalId;
        msg.prompt = lastUserPromptRaw || undefined;
      } else {
        lastUserLocalId = localId;
        lastUserPromptRaw = rawContent;
      }

      out.push(msg);
    }

    return out;
  };

  const loadConversationIfNeeded = async (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat?.conversationId || chat.backendLoaded) return;

    setIsLoading(true);
    try {
      const detail = await getConversation(chat.conversationId);
      const mappedMessages = mapBackendConversationMessages(detail);

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            title: detail?.title || c.title,
            updatedAt: new Date(detail?.updated_at ?? c.updatedAt),
            backendLoaded: true,
            messages: mappedMessages,
          };
        })
      );

      requestAnimationFrame(() => scrollToBottom('auto'));
    } catch {
      showToast('Failed to load conversation history', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize theme from storage / system (uncontrolled mode only)
  useEffect(() => {
    if (controlledDarkMode !== undefined) return;

    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark') {
      isThemeExplicitRef.current = true;
      setUncontrolledDarkMode(true);
      return;
    }
    if (stored === 'light') {
      isThemeExplicitRef.current = true;
      setUncontrolledDarkMode(false);
      return;
    }

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    setUncontrolledDarkMode(Boolean(media.matches));

    const onChange = (e) => {
      // Only auto-follow system when user hasn't chosen explicitly
      if (isThemeExplicitRef.current) return;
      setUncontrolledDarkMode(Boolean(e.matches));
    };

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }

    // Safari fallback
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, [controlledDarkMode]);

  // Load saved memory + preferences
  useEffect(() => {
    const mem = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (typeof mem === 'string') {
      setSavedMemory(mem);
      setMemoryDraft(mem);
    }

    const prefsRaw = localStorage.getItem(PREFS_STORAGE_KEY);
    const prefs = prefsRaw ? safeJsonParse(prefsRaw, null) : null;
    if (prefs && typeof prefs === 'object') {
      if (typeof prefs.tone === 'string') setTone(prefs.tone);
      if (typeof prefs.verbosity === 'string') setVerbosity(prefs.verbosity);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MEMORY_STORAGE_KEY, savedMemory);
  }, [savedMemory]);

  useEffect(() => {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify({ tone, verbosity }));
  }, [tone, verbosity]);

  // Apply class-based dark mode for things like scrollbar styling
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // Note: Theme persistence is only written on explicit user toggle.

  // Track scroll position and show "Jump to latest" affordance
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const thresholdPx = 200;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = distanceFromBottom <= thresholdPx;
      isAtBottomRef.current = atBottom;
      setShowJumpToLatest(!atBottom);
    };

    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [currentChatId]);

  // Auto-scroll to latest message only when user is already near bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom('smooth');
    }
  }, [messages, isLoading]);

  // Handle sending message
  const handleSendMessage = async (messageText, modeOverride) => {
    const trimmed = (messageText ?? '').trim();
    if (!trimmed) return;

    const mode = modeOverride ?? inputMode;
    const outboundText = mode === 'image' ? `/image ${trimmed}` : trimmed;

    const userMessageId = nextId();
    const botMessageId = nextId();

    const userMessage = {
      id: userMessageId,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
      avatar: '👤',
    };

    const placeholderBot = {
      id: botMessageId,
      text: 'Thinking…',
      sender: 'bot',
      timestamp: new Date(),
      avatar: '🤖',
      inReplyTo: userMessageId,
      prompt: outboundText,
      preset: promptPresetKey,
      tone,
      verbosity,
      memory: savedMemory,
      pending: true,
    };

    const existingConversationId = currentChat?.conversationId ?? null;

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          title: chat.title === 'New chat' ? trimmed.slice(0, 40) : chat.title,
          updatedAt: new Date(),
          messages: [...chat.messages, userMessage, placeholderBot],
        };
      })
    );

    setIsLoading(true);
    requestStartTimeRef.current = Date.now();
    requestAnimationFrame(() => {
      isAtBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollToBottom('smooth');
    });

    try {
      const result = await sendToBackend({ text: outboundText, conversationId: existingConversationId });
      const replyText = String(result?.reply ?? '');
      const newConversationId = result?.conversation_id ?? existingConversationId;
      const responseTimeMs = Date.now() - requestStartTimeRef.current;

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          const nextConversationId = chat.conversationId ?? newConversationId ?? null;
          return {
            ...chat,
            conversationId: nextConversationId,
            backendLoaded: Boolean(nextConversationId),
            updatedAt: new Date(),
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? {
                    ...m,
                    text: replyText || 'No reply received.',
                    pending: false,
                    error: false,
                    timestamp: new Date(),
                    responseTimeMs,
                    backend: {
                      conversation_id: result?.conversation_id,
                      user_message_id: result?.user_message_id,
                      bot_message_id: result?.bot_message_id,
                    },
                  }
                : m
            ),
          };
        })
      );
      clearDraft();
    } catch (e) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            updatedAt: new Date(),
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? {
                    ...m,
                    text: 'Failed to reach backend. Retry?',
                    pending: false,
                    error: true,
                    timestamp: new Date(),
                  }
                : m
            ),
          };
        })
      );
      showToast('Backend request failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle voice input using Web Speech API
  const handleVoiceInput = () => {
    if (!voiceSupported) {
      showToast('Voice input not supported in this browser', 'error');
      return;
    }
    toggleListening();
    if (!isListening) {
      showToast('Listening... Speak now', 'info');
    }
  };

  // Handle retry
  const handleRetry = async (messageId) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    // Retry failed bot calls
    if (msg.sender === 'bot' && msg.error && msg.prompt) {
      const convoId = currentChat?.conversationId ?? null;

      setIsLoading(true);
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            updatedAt: new Date(),
            messages: chat.messages.map((m) =>
              m.id === messageId
                ? { ...m, text: 'Retrying…', error: false, pending: true, timestamp: new Date() }
                : m
            ),
          };
        })
      );

      try {
        const result = await sendToBackend({ text: msg.prompt, conversationId: convoId });
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== currentChatId) return chat;
            return {
              ...chat,
              conversationId: chat.conversationId ?? result?.conversation_id ?? null,
              updatedAt: new Date(),
              messages: chat.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      text: String(result?.reply ?? 'No reply received.'),
                      error: false,
                      pending: false,
                      timestamp: new Date(),
                      backend: {
                        conversation_id: result?.conversation_id,
                        user_message_id: result?.user_message_id,
                        bot_message_id: result?.bot_message_id,
                      },
                    }
                  : m
              ),
            };
          })
        );
      } catch {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== currentChatId) return chat;
            return {
              ...chat,
              updatedAt: new Date(),
              messages: chat.messages.map((m) =>
                m.id === messageId
                  ? { ...m, text: 'Failed to reach backend. Retry?', error: true, pending: false, timestamp: new Date() }
                  : m
              ),
            };
          })
        );
      } finally {
        setIsLoading(false);
      }

      return;
    }

    // Default behavior: remove message
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: chat.messages.filter((m) => m.id !== messageId),
        };
      })
    );
  };

  const handleCopyMessage = async (messageText) => {
    const text = String(messageText ?? '').trim();
    if (!text) {
      showToast('Nothing to copy', 'info');
      return;
    }

    const copyViaExecCommand = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    };

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
        return;
      }

      const ok = copyViaExecCommand();
      showToast(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
    } catch {
      try {
        const ok = copyViaExecCommand();
        showToast(ok ? 'Copied to clipboard' : 'Copy failed', ok ? 'success' : 'error');
      } catch {
        showToast('Copy failed', 'error');
      }
    }
  };

  const handleRegenerate = async (botMessageId, overridePrompt) => {
    const botMessage = messages.find((m) => m.id === botMessageId);
    const prompt = overridePrompt ?? botMessage?.prompt;
    if (!prompt) return;

    const presetKey = botMessage?.preset ?? promptPresetKey;
    const regenTone = botMessage?.tone ?? tone;
    const regenVerbosity = botMessage?.verbosity ?? verbosity;
    const regenMemory = botMessage?.memory ?? savedMemory;

    const convoId = currentChat?.conversationId ?? null;

    setIsLoading(true);
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: chat.messages.map((m) =>
            m.id === botMessageId
              ? {
                  ...m,
                  text: 'Regenerating…',
                  prompt,
                  preset: presetKey,
                  tone: regenTone,
                  verbosity: regenVerbosity,
                  memory: regenMemory,
                  pending: true,
                  error: false,
                  timestamp: new Date(),
                }
              : m
          ),
        };
      })
    );

    try {
      const result = await sendMessage(prompt, {
        conversationId: convoId,
        tone: regenTone,
        verbosity: regenVerbosity,
        memory: regenMemory,
        preset: presetKey,
      });

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            conversationId: chat.conversationId ?? result?.conversation_id ?? null,
            updatedAt: new Date(),
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? {
                    ...m,
                    text: String(result?.reply ?? 'No reply received.'),
                    prompt,
                    preset: presetKey,
                    tone: regenTone,
                    verbosity: regenVerbosity,
                    memory: regenMemory,
                    pending: false,
                    error: false,
                    timestamp: new Date(),
                    backend: {
                      conversation_id: result?.conversation_id,
                      user_message_id: result?.user_message_id,
                      bot_message_id: result?.bot_message_id,
                    },
                  }
                : m
            ),
          };
        })
      );
    } catch {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            updatedAt: new Date(),
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? {
                    ...m,
                    text: 'Failed to reach backend. Retry?',
                    pending: false,
                    error: true,
                    timestamp: new Date(),
                  }
                : m
            ),
          };
        })
      );
      showToast('Backend request failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateBotMessage = async (localMessageId, rating) => {
    const msg = messages.find((m) => m.id === localMessageId);
    const backendMessageId = msg?.backend?.bot_message_id ?? msg?.backend?.message_id;
    if (!backendMessageId) {
      showToast('Rating is available after messages sync', 'info');
      return;
    }

    const previousRating = msg?.backend?.rating ?? null;
    if (previousRating === rating) {
      showToast('Already rated', 'info');
      return;
    }

    // Optimistic UI update
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          messages: chat.messages.map((m) =>
            m.id === localMessageId
              ? {
                  ...m,
                  backend: {
                    ...(m.backend || {}),
                    rating,
                  },
                }
              : m
          ),
        };
      })
    );

    try {
      await rateMessage(backendMessageId, rating);
      showToast(rating === 1 ? 'Liked' : 'Disliked', 'success');
    } catch {
      // Revert on failure
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === localMessageId
                ? {
                    ...m,
                    backend: {
                      ...(m.backend || {}),
                      rating: previousRating,
                    },
                  }
                : m
            ),
          };
        })
      );
      showToast('Failed to submit rating', 'error');
    }
  };

  const handleSaveMemory = () => {
    setSavedMemory(String(memoryDraft ?? '').trim());
    showToast('Memory saved', 'success');
  };

  const handleClearMemory = () => {
    setMemoryDraft('');
    setSavedMemory('');
    showToast('Memory cleared', 'success');
  };

  const startEditMessage = (userMessageId) => {
    const userMessage = messages.find((m) => m.id === userMessageId && m.sender === 'user');
    if (!userMessage) return;

    const botReply = messages.find(
      (m) => m.sender === 'bot' && m.inReplyTo === userMessageId
    );

    setEditing({
      userMessageId,
      botMessageId: botReply?.id ?? null,
    });
    setDraftText(userMessage.text ?? '');

    requestAnimationFrame(() => inputRef.current?.focus?.());
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraftText('');
  };

  const handleSubmitFromInput = (text) => {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return;

    if (!editing) {
      handleSendMessage(trimmed, inputMode);
      setDraftText('');
      return;
    }

    const { userMessageId, botMessageId } = editing;

    // Update the user message text (in-place)
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: chat.messages.map((m) =>
            m.id === userMessageId
              ? {
                  ...m,
                  text: trimmed,
                  timestamp: new Date(),
                }
              : m
          ),
        };
      })
    );

    setEditing(null);
    setDraftText('');

    if (botMessageId) {
      handleRegenerate(botMessageId, trimmed);
      showToast('Updated message & regenerated reply', 'success');
      return;
    }

    // Fallback: if there is no paired bot reply, create one via backend.
    const newBotId = nextId();
    const convoId = currentChat?.conversationId ?? null;

    const placeholderBot = {
      id: newBotId,
      text: 'Thinking…',
      sender: 'bot',
      timestamp: new Date(),
      avatar: '🤖',
      inReplyTo: userMessageId,
      prompt: trimmed,
      preset: promptPresetKey,
      tone,
      verbosity,
      memory: savedMemory,
      pending: true,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: [...chat.messages, placeholderBot],
        };
      })
    );

    setIsLoading(true);
    sendToBackend({ text: trimmed, conversationId: convoId })
      .then((result) => {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== currentChatId) return chat;
            return {
              ...chat,
              conversationId: chat.conversationId ?? result?.conversation_id ?? null,
              updatedAt: new Date(),
              messages: chat.messages.map((m) =>
                m.id === newBotId
                  ? {
                      ...m,
                      text: String(result?.reply ?? 'No reply received.'),
                      pending: false,
                      error: false,
                      timestamp: new Date(),
                      backend: {
                        conversation_id: result?.conversation_id,
                        user_message_id: result?.user_message_id,
                        bot_message_id: result?.bot_message_id,
                      },
                    }
                  : m
              ),
            };
          })
        );
        showToast('Updated message', 'success');
      })
      .catch(() => {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id !== currentChatId) return chat;
            return {
              ...chat,
              updatedAt: new Date(),
              messages: chat.messages.map((m) =>
                m.id === newBotId
                  ? { ...m, text: 'Failed to reach backend. Retry?', pending: false, error: true, timestamp: new Date() }
                  : m
              ),
            };
          })
        );
        showToast('Backend request failed', 'error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleUploadDocument = async (file) => {
    if (!file) return;
    setIsLoading(true);

    const fileName = file.name || 'document';
    const fileType = file.type || '';
    const ext = (fileName.split('.').pop() || '').toLowerCase();

    const userMessageId = nextId();
    const botMessageId = nextId();

    const userMessage = {
      id: userMessageId,
      text: `Summarize this file: ${fileName}`,
      sender: 'user',
      timestamp: new Date(),
      avatar: '👤',
      file: { name: fileName, type: fileType, size: file.size },
    };

    const placeholderBot = {
      id: botMessageId,
      text: 'Extracting text from document...',
      sender: 'bot',
      timestamp: new Date(),
      avatar: '🤖',
      inReplyTo: userMessageId,
      pending: true,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: [...chat.messages, userMessage, placeholderBot],
        };
      })
    );

    requestAnimationFrame(() => {
      isAtBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollToBottom('smooth');
    });

    let extractedText = '';
    try {
      if (fileType.startsWith('text/') || ['txt', 'md', 'csv', 'json', 'log'].includes(ext)) {
        extractedText = await readTextFile(file);
      } else if (fileType === 'application/pdf' || ext === 'pdf') {
        const pdfText = await extractTextFromPdfOptional(file);
        if (pdfText) {
          extractedText = pdfText;
        }
      }
    } catch (err) {
      console.error('Error extracting text:', err);
    }

    if (!extractedText) {
      // Can't extract text - show error
      const errorText = `I couldn't extract text from "${fileName}".\n\n` +
        `- For PDFs: make sure "pdfjs-dist" is installed\n` +
        `- For images: use the image upload button instead\n\n` +
        `File info:\n- Type: ${fileType || 'unknown'}\n- Size: ${(file.size / 1024).toFixed(1)} KB`;

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? { ...m, text: errorText, pending: false, error: true }
                : m
            ),
          };
        })
      );
      setIsLoading(false);
      showToast('Could not extract text', 'error');
      return;
    }

    // Update placeholder to show we're now asking AI
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          messages: chat.messages.map((m) =>
            m.id === botMessageId
              ? { ...m, text: 'Asking AI to summarize...' }
              : m
          ),
        };
      })
    );

    // Truncate text if too long (keep first ~6000 chars for context window)
    const maxChars = 6000;
    const truncatedText = extractedText.length > maxChars 
      ? extractedText.slice(0, maxChars) + '\n\n[...truncated for length]'
      : extractedText;

    const summary = summarizeTextHeuristic(extractedText);
    const prompt = `Please summarize this document "${fileName}" (${summary.wordCount} words):\n\n${truncatedText}`;

    // Send to AI for real summarization
    const convoId = currentChat?.conversationId ?? null;
    requestStartTimeRef.current = Date.now();

    try {
      const result = await sendToBackend({ text: prompt, conversationId: convoId });
      const responseTimeMs = Date.now() - requestStartTimeRef.current;
      const aiSummary = String(result?.reply ?? 'No summary returned.');

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            conversationId: chat.conversationId ?? result?.conversation_id ?? null,
            updatedAt: new Date(),
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? {
                    ...m,
                    text: `**Summary of ${fileName}**\n\n${aiSummary}\n\n---\n_Document stats: ${summary.wordCount} words, ${summary.charCount} characters_`,
                    pending: false,
                    error: false,
                    timestamp: new Date(),
                    responseTimeMs,
                    backend: {
                      conversation_id: result?.conversation_id,
                      user_message_id: result?.user_message_id,
                      bot_message_id: result?.bot_message_id,
                    },
                  }
                : m
            ),
          };
        })
      );
      showToast('Document summarized', 'success');
    } catch (err) {
      console.error('Error summarizing document:', err);
      // Fallback to local heuristic summary
      const fallbackText = `**Local Summary of ${fileName}**\n\n` +
        `_(AI summarization failed, showing extracted preview)_\n\n` +
        `- Words: ${summary.wordCount}\n` +
        `- Characters: ${summary.charCount}\n\n` +
        `**Key excerpt:**\n${summary.lead}\n\n` +
        `**Preview:**\n${summary.preview}`;

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== currentChatId) return chat;
          return {
            ...chat,
            messages: chat.messages.map((m) =>
              m.id === botMessageId
                ? { ...m, text: fallbackText, pending: false, error: false }
                : m
            ),
          };
        })
      );
      showToast('Using local summary (AI unavailable)', 'info');
    }

    setIsLoading(false);
  };

  const handleUploadImage = async (file) => {
    if (!file) return;
    setIsLoading(true);

    const fileName = file.name || 'image';
    const userMessage = {
      id: nextId(),
      text: `Describe this image: ${fileName}`,
      sender: 'user',
      timestamp: new Date(),
      avatar: '👤',
      file: { name: fileName, type: file.type, size: file.size },
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: [...chat.messages, userMessage],
        };
      })
    );

    let botText;
    try {
      const result = await describeImage(file);
      console.log('Image describe result:', result);
      const description = result?.description || result?.text || '';
      botText = description ? String(description) : 'No description returned by backend.';
      showToast('Image described', 'success');
    } catch (e) {
      console.error('Image describe error:', e);
      botText =
        `Image description failed: ${e.message}\n\nMake sure the backend is running at http://localhost:3005`;
      showToast('Image describe failed', 'error');
    }

    const botMessage = {
      id: nextId(),
      text: botText,
      sender: 'bot',
      timestamp: new Date(),
      avatar: '🤖',
      inReplyTo: userMessage.id,
      prompt: `describe-image:${fileName}`,
      preset: promptPresetKey,
    };

    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        return {
          ...chat,
          updatedAt: new Date(),
          messages: [...chat.messages, botMessage],
        };
      })
    );

    setIsLoading(false);
    requestAnimationFrame(() => {
      isAtBottomRef.current = true;
      setShowJumpToLatest(false);
      scrollToBottom('smooth');
    });
  };

  const suggestedPrompts = useMemo(
    () => [
      'Review my code for bugs and improvements',
      'Design a REST API for a todo app',
      'Explain Big O notation with examples',
      'Debug this error: [paste your error]',
      'Compare SQL vs NoSQL databases',
      'Write unit tests for this function',
    ],
    []
  );

  const hasUserMessages = messages.some((m) => m.sender === 'user');

  const handleNewChat = () => {
    setIsLoading(false);

    const newId = nextChatIdRef.current;
    nextChatIdRef.current += 1;

    setChats((prev) => [
      ...prev,
      {
        id: newId,
        title: 'New chat',
        updatedAt: new Date(),
        conversationId: null,
        backendLoaded: false,
        messages: initialMessages,
      },
    ]);
    setCurrentChatId(newId);
    requestAnimationFrame(() => scrollToBottom('auto'));
  };

  const handleSelectChat = (chatId) => {
    setIsLoading(false);
    setCurrentChatId(chatId);
    setIsSidebarOpen(false);
    requestAnimationFrame(() => scrollToBottom('auto'));

    // Load messages for backend conversations on demand
    loadConversationIfNeeded(chatId);
  };

  const handleDeleteChat = async (chatId) => {
    const chat = chats.find((c) => c.id === chatId);
    if (!chat) return;

    const ok = window.confirm('Delete this chat? This cannot be undone.');
    if (!ok) return;

    try {
      if (chat.conversationId) {
        await deleteConversation(chat.conversationId);
      }
    } catch {
      showToast('Failed to delete chat from backend', 'error');
    }

    const remaining = chats.filter((c) => c.id !== chatId);
    setChats(remaining);

    if (chatId === currentChatId) {
      if (remaining.length) {
        setCurrentChatId(remaining[0].id);
        requestAnimationFrame(() => scrollToBottom('auto'));
        loadConversationIfNeeded(remaining[0].id);
      } else {
        const newId = nextChatIdRef.current;
        nextChatIdRef.current += 1;
        setChats([
          {
            id: newId,
            title: 'New chat',
            updatedAt: new Date(),
            conversationId: null,
            backendLoaded: false,
            messages: initialMessages,
          },
        ]);
        setCurrentChatId(newId);
        requestAnimationFrame(() => scrollToBottom('auto'));
      }
    }
  };

  const handleDeleteAllChats = async () => {
    const ok = window.confirm('Delete all chats? This cannot be undone.');
    if (!ok) return;

    setIsLoading(true);
    try {
      const ids = chats
        .map((c) => c.conversationId)
        .filter((id) => typeof id === 'number' && Number.isFinite(id));

      for (const id of ids) {
        try {
          await deleteConversation(id);
        } catch {
          // Keep going
        }
      }
    } finally {
      const newId = nextChatIdRef.current;
      nextChatIdRef.current += 1;
      setChats([
        {
          id: newId,
          title: 'New chat',
          updatedAt: new Date(),
          conversationId: null,
          backendLoaded: false,
          messages: initialMessages,
        },
      ]);
      setCurrentChatId(newId);
      setIsLoading(false);
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
  };

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  return (
    <div
      className="flex h-screen min-h-[100dvh] bg-[var(--bg-primary)]"
    >
      {/* Sidebar (desktop docked) */}
      <div className="hidden lg:block">
        <ChatHistory
          isDarkMode={isDarkMode}
          conversations={chats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          onClearAll={handleDeleteAllChats}
        />
      </div>

      {/* Sidebar (mobile drawer) */}
      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn motion-reduce:animate-none"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div
            className={`absolute left-0 top-0 h-full w-72 max-w-[85vw] flex flex-col animate-slideInRight motion-reduce:animate-none ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            } border-r shadow-2xl`}
            role="dialog"
            aria-modal="true"
            aria-label="Chat history"
          >
            <div
              className={`h-14 px-3 flex items-center justify-between border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}
            >
              <span className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-semibold`}>
                Chats
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label="Close sidebar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <ChatHistory
                isDarkMode={isDarkMode}
                conversations={chats}
                currentChatId={currentChatId}
                onNewChat={() => {
                  handleNewChat();
                  setIsSidebarOpen(false);
                }}
                onSelectChat={handleSelectChat}
                onDeleteChat={handleDeleteChat}
                onClearAll={() => {
                  handleDeleteAllChats();
                  setIsSidebarOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header
          className={`bg-[var(--bg-primary)] border-b ${
            isDarkMode ? 'border-neutral-900' : 'border-gray-200'
          }`}
        >
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile sidebar toggle */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`lg:hidden p-2 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label="Open chat history"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
              <img
                src="/chat-con.png"
                alt="Assistant avatar"
                className="w-8 h-8 rounded-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="min-w-0">
                <h1
                  className={`font-bold text-sm sm:text-base truncate ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  <span className="hidden sm:inline">
                    {promptPresetKey === 'health' ? 'Health Assistant' : 'AI Code Assistant'}
                  </span>
                  <span className="sm:hidden">
                    {promptPresetKey === 'health' ? 'Health' : 'AI Assistant'}
                  </span>
                </h1>
                <p
                  className={`text-xs flex items-center gap-1.5 ${
                    isDarkMode ? 'text-green-400' : 'text-green-600'
                  }`}
                >
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Online · Health & Coding
                </p>
              </div>
            </div>

            {/* Section toggle (General / Health) */}
            <div
              className={`flex items-center rounded-xl border overflow-hidden flex-shrink-0 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-300 bg-white'
              }`}
              aria-label="Assistant section"
            >
              <button
                type="button"
                onClick={() => setPromptPresetKey('default')}
                className={`px-3 py-2 text-xs font-semibold transition-colors $
                  {promptPresetKey !== 'health'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-900'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                aria-label="General section"
              >
                General
              </button>
              <button
                type="button"
                onClick={() => setPromptPresetKey('health')}
                className={`px-3 py-2 text-xs font-semibold transition-colors $
                  {promptPresetKey === 'health'
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-900'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                aria-label="Health section"
              >
                Health
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-xl transition-all duration-200 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
                aria-label="Toggle dark mode"
              >
                {isDarkMode ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className="absolute top-4 right-4 z-50">
            <Toast
              message={toast.message}
              type={toast.type}
              isDarkMode={isDarkMode}
              onClose={() => setToast(null)}
            />
          </div>
        )}

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
        >
          <div className="w-full">
            {messages.map((message) => (
              <React.Fragment key={message.id}>
                <Message
                  message={message}
                  isDarkMode={isDarkMode}
                  onRetry={() => handleRetry(message.id)}
                  onCopy={message.sender === 'bot' ? () => handleCopyMessage(message.text) : undefined}
                  onRegenerate={() => handleRegenerate(message.id)}
                  onEdit={message.sender === 'user' ? () => startEditMessage(message.id) : undefined}
                  onLike={message.sender === 'bot' ? () => handleRateBotMessage(message.id, 1) : undefined}
                  onDislike={message.sender === 'bot' ? () => handleRateBotMessage(message.id, -1) : undefined}
                />
                {/* Response time indicator for bot messages */}
                {message.sender === 'bot' && message.responseTimeMs && !message.pending && (
                  <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 -mt-2">
                    <div className="ml-10">
                      <ResponseTimeIndicator responseTimeMs={message.responseTimeMs} isDarkMode={isDarkMode} />
                    </div>
                  </div>
                )}
                {/* AI-suggested follow-ups after the last bot message */}
                {message.sender === 'bot' && 
                message.id === lastBotMessage?.id && 
                !message.pending && 
                !message.error &&
                suggestedFollowUps.length > 0 && (
                  <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 pb-4">
                    <SuggestedPrompts
                      suggestions={suggestedFollowUps}
                      onSelect={(t) => handleSendMessage(t, 'text')}
                      isDarkMode={isDarkMode}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Suggested prompts */}
            {!hasUserMessages && !isLoading && (
              <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-6">
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-xs sm:text-sm font-medium`}>
                  Try one of these:
                </p>
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                  {suggestedPrompts.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSendMessage(p, 'text')}
                      className={`px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm border transition-all duration-200 ${
                        isDarkMode
                          ? 'border-gray-700 text-gray-200 hover:bg-gray-800'
                          : 'border-gray-300 text-gray-700 hover:bg-white'
                      }`}
                      aria-label={`Use suggested prompt: ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-4">
                <TypingIndicator isDarkMode={isDarkMode} />
              </div>
            )}

            {/* Jump to latest */}
            {showJumpToLatest && (
              <div className="sticky bottom-4 flex justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={() => {
                    isAtBottomRef.current = true;
                    setShowJumpToLatest(false);
                    scrollToBottom('smooth');
                  }}
                  className={`pointer-events-auto px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg'
                  }`}
                  aria-label="Jump to latest message"
                >
                  ↓ Jump to latest
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <ChatInput
          onSendMessage={handleSubmitFromInput}
          onVoiceInput={handleVoiceInput}
          isLoading={isLoading}
          isDarkMode={isDarkMode}
          inputMode={inputMode}
          onInputModeChange={(mode) => setInputMode(mode === 'image' ? 'image' : 'text')}
          value={draftText}
          onChange={setDraftText}
          isEditing={Boolean(editing)}
          onCancelEdit={cancelEdit}
          inputRef={inputRef}
          promptPresets={PROMPT_PRESETS}
          promptPresetKey={promptPresetKey}
          onPromptPresetChange={setPromptPresetKey}
          onUploadDocument={handleUploadDocument}
          onUploadImage={handleUploadImage}
          memoryDraft={memoryDraft}
          onMemoryDraftChange={setMemoryDraft}
          onSaveMemory={handleSaveMemory}
          onClearMemory={handleClearMemory}
          tone={tone}
          onToneChange={setTone}
          verbosity={verbosity}
          onVerbosityChange={setVerbosity}
          isListening={isListening}
          liveTranscript={isListening ? fullTranscript + interimTranscript : ''}
        />
      </div>
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        isDarkMode={isDarkMode}
      />
      
      {/* Search Modal */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        isDarkMode={isDarkMode}
        conversations={chats}
        onSelectResult={(result) => {
          handleSelectChat(result.chatId);
          showToast(`Jumped to ${result.chatTitle}`, 'success');
        }}
      />
    </div>
  );
}
