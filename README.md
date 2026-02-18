# AI Chatbot UI - Modern ChatGPT-like Interface

A production-ready React + Tailwind CSS chatbot UI component inspired by ChatGPT, featuring light/dark mode, smooth animations, and full accessibility support.

## 🎨 Design Features

### Visual Design
- **Clean, Minimal Aesthetic**: Distraction-free interface focusing on conversation
- **Rounded Chat Bubbles**: Message bubbles with 2xl border-radius for modern appearance
- **Smart Positioning**: User messages right-aligned, bot messages left-aligned (conversational standard)
- **Avatar System**: Visual indicators for bot and user with emoji placeholders (easily replaceable with images)
- **Professional Color Palette**: Neutral backgrounds with accent blue for CTA

### Dark Mode
- **True Dark Theme**: Not just inverted colors—carefully selected neutral tones (neutral-900, neutral-800)
- **Dynamic Toggle**: Easy-access button in header with smooth transitions
- **Contrast Compliant**: WCAG AA contrast ratios maintained in both themes
- **Persistent State**: Can be extended to localStorage for user preference persistence

### Animations
- **Fade-in Effect**: Messages fade in smoothly as they appear
- **Slide-in Animation**: Messages slide up subtly while fading in (0.3s ease-out)
- **Typing Indicator**: Three animated dots with staggered bounce animation
- **Smooth Scrolling**: Auto-scroll to latest message with `smooth` behavior
- **Button Hover States**: Subtle background color transitions on interactive elements

## 🏗️ Component Structure

```
ChatBot.jsx (Main Container)
├── Header (Title, Status, Dark Mode Toggle)
├── Messages Container
│   ├── Message.jsx (Reusable Message Component)
│   │   ├── Avatar
│   │   ├── Message Bubble
│   │   ├── Timestamp
│   │   └── Error State (with Retry)
│   └── TypingIndicator.jsx (Three Bouncing Dots)
└── ChatInput.jsx
    ├── Microphone Button
    ├── Text Input (Expandable)
    ├── Send Button
    └── Helper Text
```

## ✨ Key Features

### Message Input
- **Textarea Auto-expand**: Grows as user types (max 120px height)
- **Smart Send Logic**: 
  - `Enter` sends message
  - `Shift+Enter` creates new line
  - Disabled while bot is typing
- **Microphone Icon**: UI-only voice input trigger (ready for Web Speech API integration)
- **Real-time Validation**: Send button disabled for empty input

### Accessibility (A11y)
- **ARIA Labels**: All interactive elements have descriptive labels
- **Semantic HTML**: Proper use of `<button>`, `<form>`, `role` attributes
- **Keyboard Navigation**: Full keyboard support (Tab, Enter, Shift+Enter)
- **Status Announcements**: `role="status"` on typing indicator for screen readers
- **Color Not Only**: Error states use icons + text, not color alone
- **Focus States**: Visible focus indicators on all interactive elements

### Responsive Design
| Screen Size | Behavior |
|-------------|----------|
| **Mobile** (<640px) | Full-screen chat, optimized touch targets (44x44px minimum) |
| **Tablet** (640-1024px) | Slightly wider message bubbles (max-w-md) |
| **Desktop** (>1024px) | Centered layout, wider message bubbles (max-w-xl) |

## 🔧 Tech Stack

### Core
- **React 18**: Latest hooks-based architecture
- **Tailwind CSS 3**: Utility-first styling with dark mode support
- **Vite**: Fast build tool with HMR

### Icons
- **Heroicons**: 24x24 solid icons (send, microphone, sun, moon, warning)

### Build & Config
- **PostCSS**: CSS processing with Tailwind
- **Autoprefixer**: Vendor prefix compatibility

## 🚀 Getting Started

### Installation
```bash
cd new-chatbot
npm install
```

### Development
```bash
npm run dev
```
Opens on `http://localhost:3000` with hot reload

### Production Build
```bash
npm run build
```
Generates optimized files in `dist/`

## 🌍 Public Deployment (Recommended: Single URL)

This repo is set up so the FastAPI backend can serve the built frontend from `dist/` in production.
That means you deploy **one** service and users access the UI + API from the same origin.

### 1) Frontend build
```bash
npm install
npm run build
```

### 2) Backend setup
```bash
cd backend
Copy-Item .env.example .env
```
Edit `backend/.env` and set at least:
- `APP_ENV=prod`
- `TRUSTED_HOSTS=yourdomain.com,www.yourdomain.com` (recommended)
- `LLM_PROVIDER=openai-compatible` and `OPENAI_API_KEY=...` if you want real AI responses

### 3) Run backend (serves UI + API)
From the repo root:
```bash
cd backend
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 3005
```

Open `http://<your-server>:3005/`.

### Security notes
- Do **not** commit secrets. `.env` and `backend/.env` are ignored by git.
- If an API key was ever exposed, rotate it.

## 🎯 Design Decisions Explained

### 1. **Layout: Flex Column**
The main container uses `flex flex-col` with `overflow-hidden` to ensure the input bar stays fixed while messages scroll independently. This prevents mobile keyboard from pushing content out of view.

### 2. **Message Bubble Styling**
- **Colors**: Blue for user (primary action), neutral gray for bot (information)
- **Roundness**: `rounded-2xl` (16px) creates friendly, modern appearance
- **Padding**: `px-4 py-2` balances readability with efficient space usage
- **Max Width**: Prevents very long messages from dominating the screen

### 3. **Typing Indicator Animation**
Uses CSS `animation-delay` on individual dots rather than a single animation. This provides a natural wave-like motion commonly seen in messaging apps.

### 4. **Dark Mode Implementation**
- Conditional Tailwind classes (e.g., `${isDarkMode ? 'dark:class' : 'light:class'}`)
- Neutral-900 (#171717) for backgrounds ensures deep blacks don't cause eye strain
- Blue-600 for dark mode CTAs maintains contrast

### 5. **Auto-scroll Behavior**
`useRef` + `scrollIntoView({ behavior: 'smooth' })` ensures users always see the latest message without jarring jumps. Triggers on message additions and typing indicator changes.

### 6. **Input Expandable Textarea**
Allows multi-line messages without fixed height. CSS `field-sizing: content` (modern) or overflow handling keeps it flexible and modern.

### 7. **Error State Design**
Uses a separate error component state rather than replacing the message. This allows users to:
- See what they tried to send
- Understand why it failed (icon + text)
- Retry quickly without retyping

## 📱 Mobile Optimizations

- Touch-friendly button sizes (minimum 44x44 recommended)
- Optimized for landscape orientation with `viewport-fit=cover`
- Reduced animations on `prefers-reduced-motion: reduce` (extensible)
- Smaller avatar sizes on mobile
- Single-column layout (no sidebars)

## 🔌 Integration Points

### Connect to Real Backend
Replace the demo response in `ChatBot.jsx`:
```jsx
// Instead of setTimeout, use fetch:
const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message: messageText }),
});
```

### Voice Input Integration
Use Web Speech API in `ChatInput.jsx`:
```jsx
const recognition = new window.webkitSpeechRecognition();
recognition.onresult = (e) => setInput(e.results[0][0].transcript);
```

### Persist Dark Mode
```jsx
// In ChatBot.jsx useEffect:
useEffect(() => {
  localStorage.setItem('isDarkMode', isDarkMode);
}, [isDarkMode]);
```

## 📊 Performance Considerations

- **Message Virtualization**: For chat histories >100 messages, implement `react-window`
- **Code Splitting**: Input components lazy-loaded if needed
- **Animation Performance**: Uses CSS animations (GPU-accelerated) not JS
- **Debouncing**: Input could be debounced for real-time features

## 🎓 File Structure
```
new-chatbot/
├── ChatBot.jsx                 # Main container & state management
├── App.jsx                     # Root component
├── main.jsx                    # Entry point
├── components/
│   ├── Message.jsx             # Individual message component
│   ├── ChatInput.jsx           # Input area component
│   └── TypingIndicator.jsx     # Typing animation component
├── styles/
│   └── globals.css             # Global styles & animations
├── index.html                  # HTML entry point
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── vite.config.js              # Vite build configuration
├── package.json                # Dependencies
└── README.md                   # This file
```

## 🎨 Customization

### Change Colors
Edit `tailwind.config.js` theme colors:
```js
theme: {
  colors: {
    primary: '#yourcolor',
    // ...
  }
}
```

### Adjust Animations Speed
Modify `animation` values in `tailwind.config.js`:
```js
animation: {
  fadeIn: 'fadeIn 0.5s ease-in-out', // Slower
}
```

### Update Fonts
Already using system fonts for performance. To add custom fonts:
```js
// tailwind.config.js
theme: {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
  }
}
```

## 🔒 Accessibility Checklist

- ✅ ARIA labels on all interactive elements
- ✅ Semantic HTML structure
- ✅ Keyboard navigation support
- ✅ WCAG AA color contrast compliance
- ✅ Focus indicators visible
- ✅ Status announcements for dynamic content
- ✅ Error messages clear and actionable

## 📈 Future Enhancements

- [ ] Message reactions (emoji picker)
- [ ] File upload support
- [ ] Code syntax highlighting
- [ ] Message editing
- [ ] Message deletion
- [ ] Read receipts
- [ ] Chat history persistence
- [ ] User settings sidebar
- [ ] Advanced markdown support
- [ ] Conversation export

---

**Built with ❤️ for modern web applications**
#   r e p o - t r i a l  
 