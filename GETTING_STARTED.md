# Getting Started - AI Chatbot UI

## 📋 Prerequisites

- **Node.js**: v16+ (download from [nodejs.org](https://nodejs.org))
- **npm**: v8+ (comes with Node.js)
- **Code Editor**: VS Code recommended
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd new-chatbot
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
The app opens automatically at `http://localhost:3000`

### 3. Start Developing
- Edit files in the `new-chatbot` folder
- Hot Module Replacement (HMR) reloads changes instantly
- No need to restart the server

## 📁 Project Structure Explained

```
new-chatbot/
│
├── 📄 index.html              # HTML entry point
├── 📄 main.jsx                # React app entry point
├── 📄 App.jsx                 # Root component
├── 📄 ChatBot.jsx             # Main chatbot container
│
├── 📁 components/             # Reusable React components
│   ├── ChatInput.jsx          # Message input area
│   ├── Message.jsx            # Individual message bubble
│   ├── TypingIndicator.jsx    # "Bot typing" animation
│   ├── ChatHistory.jsx        # Conversation sidebar (optional)
│   ├── CodeBlock.jsx          # Code syntax highlighting
│   ├── MessageActions.jsx     # Like/share buttons
│   └── Toast.jsx              # System notifications
│
├── 📁 hooks/                  # Custom React hooks
│   └── useCustomHooks.js      # Utilities for dark mode, messages, etc.
│
├── 📁 services/               # API & external services
│   └── apiService.js          # Backend API calls, voice input
│
├── 📁 styles/                 # Global styling
│   └── globals.css            # Tailwind imports + custom animations
│
├── 📁 public/                 # Static assets (images, fonts)
│
├── 🔧 Configuration Files
│   ├── package.json           # Dependencies & scripts
│   ├── vite.config.js         # Build tool configuration
│   ├── tailwind.config.js     # Tailwind CSS customization
│   ├── postcss.config.js      # CSS processing
│   └── .eslintrc.cjs          # Code quality rules
│
├── 📚 Documentation
│   ├── README.md              # Overview & features
│   ├── DESIGN_DECISIONS.md    # Deep-dive into design choices
│   └── GETTING_STARTED.md     # This file
│
└── 📝 Environment Files
    ├── .gitignore             # Files to exclude from Git
    └── .env.example           # Environment variable template
```

## 🎨 Key Files & Their Purpose

### Core Components

| File | Purpose | Key Exports |
|------|---------|-------------|
| `ChatBot.jsx` | Main state & layout | ChatBot component |
| `components/ChatInput.jsx` | User input handling | ChatInput component |
| `components/Message.jsx` | Display messages | Message component |
| `components/TypingIndicator.jsx` | Animation | TypingIndicator component |

### Utilities

| File | Purpose |
|------|---------|
| `hooks/useCustomHooks.js` | Reusable logic (dark mode, messages, etc.) |
| `services/apiService.js` | API calls to backend |
| `styles/globals.css` | Global styles, custom animations |

### Configuration

| File | Purpose |
|------|---------|
| `package.json` | Project dependencies |
| `vite.config.js` | Build settings |
| `tailwind.config.js` | Tailwind CSS theme |
| `.eslintrc.cjs` | Code quality rules |

## 🛠️ Available Commands

```bash
# Start development server (hot reload enabled)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint code quality check
npm run lint
```

## 🎯 Common Tasks

### Edit a Component
1. Open the component file (e.g., `components/Message.jsx`)
2. Make your changes
3. Save the file (Ctrl+S or Cmd+S)
4. Changes appear instantly in browser (HMR)

**Example**: Change message bubble color
```jsx
// In components/Message.jsx, line 26
className={`
  px-4 py-2 rounded-2xl
  ${isBot
    ? isDarkMode
      ? 'bg-red-800 text-red-100' // Changed from neutral-800
      : 'bg-red-100 text-red-900'
    : isDarkMode
      ? 'bg-blue-600 text-white'
      : 'bg-blue-500 text-white'
  }`}
```

### Add a New Component
1. Create new file in `components/` folder:
```bash
touch components/MyNewComponent.jsx
```

2. Create basic component structure:
```jsx
export default function MyNewComponent({ isDarkMode }) {
  return (
    <div className={isDarkMode ? 'bg-black' : 'bg-white'}>
      {/* Component content */}
    </div>
  );
}
```

3. Import and use in `ChatBot.jsx`:
```jsx
import MyNewComponent from './components/MyNewComponent';

export default function ChatBot() {
  // ... existing code
  return (
    <div>
      <MyNewComponent isDarkMode={isDarkMode} />
    </div>
  );
}
```

### Connect to Real Backend API
Replace the mock response in `ChatBot.jsx`:

```jsx
// Line 46-64 in ChatBot.jsx
import { sendMessage } from './services/apiService';

const handleSendMessage = async (messageText) => {
  if (!messageText.trim()) return;

  const userMessage = {
    id: messages.length + 1,
    text: messageText,
    sender: 'user',
    timestamp: new Date(),
    avatar: '👤',
  };

  setMessages((prev) => [...prev, userMessage]);
  setIsLoading(true);

  try {
    const response = await sendMessage(messageText); // Call API
    const botMessage = {
      id: messages.length + 2,
      text: response.reply,
      sender: 'bot',
      timestamp: new Date(),
      avatar: '🤖',
    };
    setMessages((prev) => [...prev, botMessage]);
  } catch (error) {
    console.error('Error:', error);
    // Show error state
  } finally {
    setIsLoading(false);
  }
};
```

### Enable Voice Input
In `components/ChatInput.jsx`, update `handleVoiceInput`:

```jsx
import { transcribeAudio } from '../services/apiService';

const handleVoiceInput = () => {
  const recognition = transcribeAudio((transcript) => {
    setInput(transcript);
  });
  recognition.start();
};
```

### Customize Colors
Edit `tailwind.config.js`:

```js
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',  // Your primary blue
          600: '#0284c7',
        },
        // Add more custom colors
      },
    },
  },
};
```

Then use in components:
```jsx
className="bg-primary-500 hover:bg-primary-600"
```

### Add Custom Animations
Edit `styles/globals.css`:

```css
@keyframes slideInFromLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-slideInFromLeft {
  animation: slideInFromLeft 0.3s ease-out;
}
```

Use in components:
```jsx
className="animate-slideInFromLeft"
```

## 🔍 Debugging Tips

### Check Component Props
Add `console.log` to see component props:
```jsx
export default function Message({ message, isDarkMode, onRetry }) {
  console.log('Message props:', { message, isDarkMode }); // Debug line
  return (/* ... */);
}
```

### React Developer Tools
1. Install [React DevTools extension](https://chrome.google.com/webstore/detail/react-developer-tools/)
2. Open DevTools (F12)
3. Go to React tab to inspect components and state

### Tailwind CSS IntelliSense
1. Install [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) in VS Code
2. Get autocomplete for Tailwind classes
3. Hover over classes to see CSS output

## 🎨 Theming

### Current Color System
**Light Mode:**
- Primary: Blue-500 (#3b82f6)
- Background: White
- Cards: Gray-100
- Text: Gray-900

**Dark Mode:**
- Primary: Blue-600 (#2563eb)
- Background: Neutral-900 (#171717)
- Cards: Neutral-800 (#262626)
- Text: White

### Change Theme
Edit `ChatBot.jsx`:
```jsx
const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode
```

Or check system preference:
```jsx
const [isDarkMode, setIsDarkMode] = useState(() => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});
```

## 📱 Testing on Different Devices

### Mobile Emulation (Browser DevTools)
1. Press F12 to open DevTools
2. Click device toggle (Ctrl+Shift+M)
3. Select device (iPhone, iPad, Android, etc.)
4. Rotate device (Ctrl+Shift+R)

### Actual Device Testing
1. Find your computer's IP address:
   - Windows: `ipconfig` → look for "IPv4 Address"
   - Mac/Linux: `ifconfig` → look for "inet"
2. On device, visit: `http://[YOUR_IP]:3000`
3. Example: `http://192.168.1.100:3000`

## 🚀 Building for Production

### Generate Optimized Build
```bash
npm run build
```

Output in `dist/` folder:
- Minified JavaScript
- Optimized CSS
- Compressed images
- Source maps (for debugging)

### Deploy to Vercel (Recommended for Beginners)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click "Import Project"
5. Select your repository
6. Click Deploy
7. Done! Your app is live 🎉

### Deploy to Netlify
1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "New site from Git"
4. Connect your GitHub account
5. Select your repository
6. Build command: `npm run build`
7. Publish directory: `dist`
8. Deploy

## 🆘 Troubleshooting

### Port 3000 Already in Use
```bash
# Kill process using port 3000 (Windows PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Or use different port
npm run dev -- --port 3001
```

### npm install Fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -r node_modules
npm install
```

### Changes Not Showing (HMR Not Working)
1. Save file again (sometimes HMR misses first save)
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

### Styling Not Applying
1. Check class name is spelled correctly
2. Ensure Tailwind config includes file: Check `content` in `tailwind.config.js`
3. Rebuild Tailwind: `npm run dev` restarts Tailwind watcher

### Dark Mode Toggle Not Working
1. Ensure `isDarkMode` state is properly passed to all components
2. Check conditional classNames: `${isDarkMode ? 'dark:class' : 'light:class'}`
3. Verify component re-renders on state change

## 📚 Learning Resources

### Official Documentation
- [React 18 Docs](https://react.dev)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Heroicons](https://heroicons.com/)
- [Vite Documentation](https://vitejs.dev/)

### Tutorials & Articles
- "React Hooks in Depth" - freeCodeCamp
- "Tailwind CSS for Beginners" - YouTube
- "Web Accessibility WCAG 2.1" - MDN

### Community
- [React Discord](https://discord.gg/react)
- [Tailwind Discord](https://discord.gg/tailwindcss)
- Stack Overflow (tag: reactjs)

## 💡 Pro Tips

1. **Use React DevTools** to inspect component state in real-time
2. **Enable Tailwind IntelliSense** in VS Code for class autocomplete
3. **Use keyboard shortcuts**: Ctrl+Shift+L to format code
4. **Test dark mode** frequently during development
5. **Check accessibility** with WAVE extension (webaim.org/extensions/)
6. **Profile performance** with Lighthouse (DevTools → Lighthouse)
7. **Use `console.log`** to debug state changes
8. **Commit frequently** with meaningful commit messages

## 🎓 Next Steps

After mastering the basics:
1. **Add database**: Connect to MongoDB or PostgreSQL
2. **User authentication**: Implement login/signup
3. **Message history**: Persist conversations to database
4. **Real-time updates**: Use WebSockets for live chat
5. **Advanced styling**: Explore Framer Motion for complex animations
6. **Performance optimization**: Implement code splitting, lazy loading
7. **Testing**: Add unit tests with Vitest, component tests with Cypress

---

## 📞 Need Help?

- **Check DESIGN_DECISIONS.md** for deep technical details
- **Check README.md** for feature overview
- **Search error message online** (usually StackOverflow)
- **Read error stack trace** carefully (it tells you the problem)
- **Use console** (F12 → Console tab) to see JavaScript errors

---

**Happy coding! 🚀**

*Made with ❤️ for developers*
