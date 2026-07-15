import React, { useState, useEffect, useRef } from 'react';
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import Prism from 'prismjs';

// Import Prism languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-dart';

// Language aliases mapping
const languageMap = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  cs: 'csharp',
  'c++': 'cpp',
  'c#': 'csharp',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  text: 'plaintext',
  txt: 'plaintext',
  plaintext: 'plaintext',
};

/**
 * CodeBlock Component - Syntax-highlighted code with copy button
 * Uses Prism.js for beautiful syntax highlighting similar to ChatGPT
 */
export default function CodeBlock({ language = 'javascript', code }) {
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(true);
  const codeRef = useRef(null);

  // Normalize language name
  const normalizedLang = languageMap[language?.toLowerCase()] || language?.toLowerCase() || 'plaintext';
  const prismLang = Prism.languages[normalizedLang] ? normalizedLang : 'plaintext';

  useEffect(() => {
    if (codeRef.current && prismLang !== 'plaintext') {
      try {
        Prism.highlightElement(codeRef.current);
      } catch {
        // If a Prism language component is misconfigured, don't crash the UI.
      }
    }
  }, [code, prismLang]);

  const handleCopy = async () => {
    const text = String(code ?? '');
    if (!text.trim()) return;

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
      } else {
        const ok = copyViaExecCommand();
        if (!ok) throw new Error('execCommand copy failed');
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op: avoid noisy UI; user can still select manually
    }
  };

  return (
    <div className="code-block-wrapper rounded-lg overflow-hidden my-3 shadow-lg">
      {/* Language Header - ChatGPT style */}
      <div className="code-header flex items-center justify-between px-4 py-2">
        <span className="text-xs font-mono font-medium text-gray-300">{language || 'code'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWrap((w) => !w)}
            className="text-xs font-medium px-2 py-1 rounded transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            aria-label={wrap ? 'Disable line wrap' : 'Enable line wrap'}
          >
            {wrap ? 'Unwrap' : 'Wrap'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors text-gray-400 hover:text-gray-200 hover:bg-gray-700"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <DocumentDuplicateIcon className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Content with Prism highlighting */}
      <pre
        className={`code-content px-4 py-3 text-sm font-mono leading-relaxed overflow-auto max-h-96 ${
          wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
        }`}
      >
        <code
          ref={codeRef}
          className={`language-${prismLang}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
