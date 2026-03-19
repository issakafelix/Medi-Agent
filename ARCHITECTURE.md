# 🎨 Visual Architecture & Component Map

## 📊 Component Hierarchy Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ChatBot.jsx (Root)                        │
│            (State Management & Layout)                       │
│  ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌────────────┐   │
│  │isDarkMode│ │messages │ │isLoading    │ │onSendMessage   │
│  └────────┘ └──────────┘ └──────────────┘ └────────────┘   │
└─────────────────────────────────────────────────────────────┘
          │                   │                      │
          ├─────────┬─────────┴──────────┬───────────┤
          │         │                    │           │
    ┌─────▼──┐  ┌───▼────────────┐  ┌──▼──────────┐ │
    │ Header  │  │Messages        │  │ChatInput    │ │
    │(Toggle) │  │Container       │  │(Input+Send) │ │
    └────────┘  │                │  └─────────────┘ │
                │ ┌────────────┐ │                  │
                │ │ Message    │ │ (repeating)       │
                │ ├────────────┤ │                  │
                │ │ Avatar     │ │                  │
                │ │ Bubble     │ │                  │
                │ │ Timestamp  │ │                  │
                │ │ Error UI   │ │                  │
                │ └────────────┘ │                  │
                │                │                  │
                │ ┌────────────┐ │                  │
                │ │ Typing     │ │ (when loading)   │
                │ │ Indicator  │ │                  │
                │ └────────────┘ │                  │
                └────────────────┘
```

---

## 🔄 Data Flow Diagram

```
User Types in ChatInput
        │
        ├─ onKeyDown (Enter key)
        │
        ├─ handleSendMessage()
        │
        ├─ Add Message to State
        │    │
        │    ├─ Message object {
        │    │    id, text, sender: 'user',
        │    │    timestamp, avatar
        │    │  }
        │
        ├─ Re-render → Message visible
        │s
        ├─ Set isLoading = true
        │
        ├─ Auto-scroll to bottom
        │
        ├─ Show TypingIndicator
        │
        ├─ [Simulate delay or call API]
        │
        ├─ Add Bot Message to State
        │    │
        │    ├─ Message object {
        │    │    id, text, sender: 'bot',
        │    │    timestamp, avatar
        │    │  }
        │
        ├─ Re-render → Message visible
        │
        ├─ Remove TypingIndicator
        │
        └─ Set isLoading = false
```

---

## 🎨 Dark Mode Toggle Flow

```
┌─────────────────────────────────┐
│  Header (Dark Mode Toggle)       │
│  Click Button                    │
│  setIsDarkMode(!isDarkMode)      │
└──────────────┬──────────────────┘
               │
               ├─ isDarkMode = true → Apply dark classes
               │
               ├─ Update all components
               │  - className={`${isDarkMode ? 'dark:' : ''}`}
               │
               ├─ Save to localStorage (optional)
               │
               └─ Re-render entire tree with new theme
```

---

## 🎭 Component Dependencies Map

```
ChatBot.jsx
├── imports
│   ├── React, hooks (useState, useRef, useEffect)
│   ├── ChatInput component
│   ├── Message component
│   ├── TypingIndicator component
│   └── Heroicons (SunIcon, MoonIcon)
├── state
│   ├── messages[]
│   ├── isLoading: boolean
│   └── isDarkMode: boolean
├── refs
│   ├── messagesEndRef
│   └── messagesContainerRef
└── exports
    └── ChatBot component

Message.jsx
├── imports
│   ├── React
│   └── Heroicons (ExclamationTriangleIcon)
├── props
│   ├── message: {id, text, sender, timestamp, avatar}
│   ├── isDarkMode: boolean
│   └── onRetry: function
└── exports
    └── Message component

ChatInput.jsx
├── imports
│   ├── React, useState
│   └── Heroicons (PaperAirplaneIcon, MicrophoneIcon)
├── props
│   ├── onSendMessage: function
│   ├── onVoiceInput: function
│   ├── isLoading: boolean
│   └── isDarkMode: boolean
├── state
│   └── input: string
└── exports
    └── ChatInput component

TypingIndicator.jsx
├── imports
│   └── React
├── props
│   └── isDarkMode: boolean
└── exports
    └── TypingIndicator component
```

---

## 🎯 File Types & Purposes

```
┌──────────────────────────────────────────────────┐
│  .jsx / .js (React & Logic Files)                 │
│  ├─ ChatBot.jsx (Main state container)            │
│  ├─ App.jsx (Root wrapper)                        │
│  ├─ main.jsx (Entry point)                        │
│  ├─ components/*.jsx (UI components)              │
│  ├─ hooks/useCustomHooks.js (Reusable logic)      │
│  └─ services/apiService.js (API calls)            │
├──────────────────────────────────────────────────┤
│  .css (Styling)                                   │
│  └─ styles/globals.css (Custom animations)        │
├──────────────────────────────────────────────────┤
│  Configuration Files                              │
│  ├─ tailwind.config.js (Theme, colors)            │
│  ├─ vite.config.js (Build settings)               │
│  ├─ postcss.config.js (CSS processing)            │
│  ├─ .eslintrc.cjs (Code quality)                  │
│  └─ package.json (Dependencies)                   │
├──────────────────────────────────────────────────┤
│  Documentation (.md files)                        │
│  ├─ README.md (Overview)                          │
│  ├─ GETTING_STARTED.md (Dev guide)                │
│  ├─ DESIGN_DECISIONS.md (Technical)               │
│  ├─ PROJECT_SUMMARY.md (Features)                 │
│  ├─ FILE_STRUCTURE.md (File reference)            │
│  ├─ EXECUTIVE_SUMMARY.md (High-level)             │
│  ├─ QUICK_REFERENCE.md (Cheat sheet)              │
│  ├─ CHANGELOG.md (Version history)                │
│  └─ ARCHITECTURE.md (This file)                   │
├──────────────────────────────────────────────────┤
│  Web Files                                        │
│  └─ index.html (HTML template)                    │
└──────────────────────────────────────────────────┘
```

---

## 📱 Responsive Layout Diagram

```
MOBILE (320px - 639px)
┌─────────────────┐
│  [≡] Header     │  Fixed at top
├─────────────────┤
│                 │
│  Message 1      │  Single column
│  (right, blue)  │  Full width
│                 │
├─────────────────┤
│                 │
│  Message 2      │  
│  (left, gray)   │  Messages wrap text
│                 │
├─────────────────┤
│  [Input box]    │  Fixed at bottom
│  [🎤] [📤]      │  Fixed buttons
└─────────────────┘

TABLET (640px - 1023px)
┌──────────────────────┐
│  Header [≡]          │
├──────────────────────┤
│                      │
│    Message 1         │  Wider bubble
│    (max-w-md)        │  (448px max)
│                      │
├──────────────────────┤
│  [Input box]  [🎤]   │
│  [Send Button]       │  Better spacing
└──────────────────────┘

DESKTOP (1024px+)
┌────────────────────────────────────┐
│  Header [≡]                        │
├────────────────────────────────────┤
│                                    │
│        Message 1                   │
│        (max-w-xl, 768px)           │
│                                    │
├────────────────────────────────────┤
│  [Input box]              [🎤] [📤]│
│  Ready for sidebar expansion       │
└────────────────────────────────────┘

WITH SIDEBAR (Optional)
┌──────┬──────────────────────────┐
│ Chat │ Header [≡]               │
│ List │├──────────────────────────┤
│      │ Message 1                │
│ New  │                          │
│ Chat │ Message 2                │
│ ─    │├──────────────────────────┤
│ 🕐   │ [Input box]  [🎤] [📤]    │
│ Chat │                          │
│ 1    │                          │
│ ─    │                          │
│ 🕐   │                          │
│ Chat └──────────────────────────┘
│ 2    
└──────
```

---

## 🎨 Dark Mode Theme Diagram

```
LIGHT MODE
┌─────────────────────────────────┐
│ Header (white bg, gray text)     │
├─────────────────────────────────┤
│                                 │
│  Message 1 (blue bg)            │
│  User → Right aligned           │
│                                 │
│  Message 2 (gray bg)            │
│  Bot ← Left aligned             │
│                                 │
├─────────────────────────────────┤
│ Input (gray-50 bg)              │
└─────────────────────────────────┘

DARK MODE
┌─────────────────────────────────┐
│ Header (neutral-800 bg, white)  │
├─────────────────────────────────┤
│ Background: neutral-900 (deep)  │
│                                 │
│  Message 1 (blue-600 bg)        │
│  User → Right aligned           │
│                                 │
│  Message 2 (neutral-800 bg)     │
│  Bot ← Left aligned             │
│                                 │
├─────────────────────────────────┤
│ Input (neutral-800 bg)          │
└─────────────────────────────────┘

COLOR SWATCHES
Light Mode:
  Primary: #3b82f6 (blue-500)
  Background: #ffffff
  Card: #f3f4f6 (gray-100)
  Text: #111827 (gray-900)

Dark Mode:
  Primary: #2563eb (blue-600)
  Background: #171717 (neutral-900)
  Card: #262626 (neutral-800)
  Text: #ffffff
```

---

## ⚡ Animation Pipeline

```
User sends message
        │
        ├─ Message added to state
        │
        ├─ Re-render triggered
        │
        ├─ Message component renders with animate-fadeIn
        │    └─ CSS: opacity 0→1 over 300ms
        │
        ├─ Message component renders with animate-slideIn
        │    └─ CSS: translateY(4px) + opacity 0→1 over 300ms
        │
        ├─ Both animations run simultaneously (GPU-accelerated)
        │
        ├─ Message appears smoothly on screen
        │
        └─ Auto-scroll with smooth behavior
             └─ JavaScript: scrollIntoView({ behavior: 'smooth' })

Typing Indicator
        │
        ├─ Show TypingIndicator component
        │
        ├─ 3 dots render with bounce animation
        │
        ├─ animate-bounce on each dot
        │    with animation-delay staggering
        │    - Dot 1: 0s delay
        │    - Dot 2: 0.2s delay  
        │    - Dot 3: 0.4s delay
        │
        ├─ Creates wave-like motion effect
        │
        └─ Repeats infinitely until bot responds
```

---

## 🔌 API Integration Points

```
Frontend (This Project)
    │
    ├─ Chat Interface
    │  └─ User types message
    │     └─ Click Send
    │
    ├─ Call: sendMessage(text)
    │  └─ Services/apiService.js
    │     └─ POST /api/chat
    │
    └─ Receive: { reply: "..." }
       └─ Display bot message
       └─ Hide typing indicator
       └─ Enable input again

Optional Features:
    ├─ Voice Input
    │  └─ Web Speech API (Browser)
    │     └─ transcribeAudio()
    │        └─ Returns text
    │           └─ Use sendMessage()
    │
    ├─ Message Rating
    │  └─ Click Like/Dislike
    │     └─ rateMessage()
    │        └─ POST /api/messages/{id}/rating
    │
    └─ Chat History
       └─ Click conversation
          └─ getChatHistory()
             └─ GET /api/history
                └─ Load messages
```

---

## 🧩 Hook Composition

```
useDarkMode()
├─ Returns: [isDarkMode, setIsDarkMode]
├─ Persists to: localStorage
└─ Checks: System preference on first load

useAutoScroll(dependency)
├─ Returns: ref for message container
├─ Effect: scrollIntoView({ behavior: 'smooth' })
└─ Triggers: When dependency changes

useNotification(message, duration)
├─ Returns: { notification, show, dismiss }
├─ Auto-dismisses: After duration (default 3s)
└─ Used for: Toast/alert notifications

useMessages()
├─ Returns: { messages, addMessage, updateMessage, ... }
├─ Manages: All message state
└─ Methods: addMessage, removeMessage, clearMessages

useDebounce(value, delay)
├─ Returns: debouncedValue
├─ Delays: Updates by X milliseconds
└─ Use for: Optimizing frequent events
```

---

## 📊 State Management Architecture

```
Global State (ChatBot.jsx)
├─ messages: Array<Message>
│  └─ Each message:
│     ├─ id: number (unique)
│     ├─ text: string (content)
│     ├─ sender: 'user' | 'bot'
│     ├─ timestamp: Date
│     ├─ avatar: emoji
│     └─ error?: boolean (optional)
│
├─ isLoading: boolean
│  └─ true when bot is typing
│     └─ Shows TypingIndicator
│     └─ Disables input
│
└─ isDarkMode: boolean
   └─ true for dark theme
      └─ Passed to all components
      └─ Conditional classNames
```

---

## 🚀 Build & Deploy Flow

```
Development
    │
    ├─ npm run dev
    │  └─ Vite dev server starts
    │     ├─ HMR enabled
    │     ├─ Auto browser open
    │     └─ Watch files for changes
    │
    ├─ Edit code
    │  └─ File changes detected
    │     └─ Vite hot-reloads
    │        └─ Component re-renders
    │           └─ See changes instantly
    │
    └─ Test & iterate

Production Build
    │
    ├─ npm run build
    │  └─ Vite builds for production
    │     ├─ Minifies JavaScript
    │     ├─ Purges CSS
    │     ├─ Optimizes images
    │     └─ Creates dist/ folder
    │
    ├─ npm run preview
    │  └─ Preview production build locally
    │     └─ Test before deployment
    │
    └─ Deployment
       ├─ Vercel: vercel deploy
       ├─ Netlify: Drag dist/ folder
       ├─ Docker: docker build -t chatbot .
       └─ Manual: Upload dist/ to host
```

---

## 📈 Performance Architecture

```
Optimization Strategies

CSS Animations
├─ GPU-accelerated (transform, opacity only)
├─ 60fps target framerate
├─ No JavaScript overhead
└─ Smooth user experience

Code Splitting
├─ Components lazy-loadable
├─ Services on-demand import
├─ Vendor code separated
└─ Smaller initial bundle

Tailwind CSS
├─ Utility-first = smaller output
├─ PurgeCSS removes unused classes
├─ Dark mode via class switching
└─ No extra CSS files

React Optimization
├─ Functional components
├─ Hooks for state
├─ Memoization ready
└─ No unnecessary re-renders

Bundle Result
└─ ~150KB gzipped total
   ├─ React runtime: 42KB
   ├─ CSS: 18KB
   ├─ JavaScript: 35KB
   ├─ Icons: 15KB
   └─ Fonts/misc: 40KB
```

---

**This architecture provides a scalable, maintainable, and performant chatbot UI! 🎉**
