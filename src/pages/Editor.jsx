import React, { useState, useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches, search } from '@codemirror/search';
import { foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldKeymap } from '@codemirror/language';
import { lintKeymap } from '@codemirror/lint';
import { keymap, lineNumbers, highlightActiveLineGutter, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine, EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { 
  Play, 
  Eye, 
  Maximize2, 
  RotateCcw, 
  Terminal, 
  Activity,
  CheckCircle2,
  AlertCircle,
  Type,
  Table as TableIcon,
  GitBranch,
  Video,
  Minimize2,
  X,
  Sparkles,
  Search,
  Copy,
  ChevronDown,
  Code2,
  Zap,
  Loader2,
  WrapText,
  Hash,
  ExternalLink,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Mermaid removed
import { generateOpenRouterResponse } from '../utils/openrouter';
import { generateAnimationScript, getMergeSortDemoScript } from '../utils/animationAI';
import { generateVisualizationData } from '../utils/vizAI';
import CodeAnimation2D from '../components/CodeAnimation2D';
import CallGraphD3 from '../components/CallGraphD3';
import FlowchartD3 from '../components/FlowchartD3';
import MermaidChart from '../components/MermaidChart';
import { Share2 } from 'lucide-react';

const DEFAULT_CODE = {
  javascript: `let arr = [5, 3, 8, 4];

for (let i = 0; i < arr.length; i++) {
  for (let j = 0; j < arr.length - i - 1; j++) {
    if (arr[j] > arr[j + 1]) {
      let temp = arr[j];
      arr[j] = arr[j + 1];
      arr[j + 1] = temp;
    }
  }
}

console.log("Sorted array:", arr);`,
  python: `# Example: Fibonacci in Python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(f"fib({i}) = {fibonacci(i)}")`,
  cpp: `// Example: Sorting in C++
#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::vector<int> arr = {64, 34, 25, 12, 22, 11, 90};
    std::sort(arr.begin(), arr.end());
    
    for (int x : arr) {
        std::cout << x << " ";
    }
    std::cout << std::endl;
    return 0;
}`,
  java: `// Example: Bubble Sort in Java
public class Main {
    public static void main(String[] args) {
        int[] arr = {64, 34, 25, 12, 22, 11, 90};
        int n = arr.length;
        
        for (int i = 0; i < n - 1; i++) {
            for (int j = 0; j < n - i - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    int temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        
        System.out.println("Sorted array:");
        for (int num : arr) {
            System.out.print(num + " ");
        }
    }
}`
};

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  cpp: 'C++',
  java: 'Java',
};

const LANGUAGE_COLORS = {
  javascript: '#f0db4f',
  python: '#3776ab',
  cpp: '#00599c',
  java: '#ed8b00',
};

const EditorPage = () => {
  const [lang, setLang] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_CODE['javascript']);
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [narration, setNarration] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activePanel, setActivePanel] = useState('output');
  const [isRunning, setIsRunning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [vizType, setVizType] = useState('flowchart');
  const [vizData, setVizData] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const [animScript, setAnimScript] = useState(null);
  const [animPlaying, setAnimPlaying] = useState(false);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(14);
  const [lineWrap, setLineWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const flowchartRef = useRef(null);
  const editorRef = useRef(null);

  // Track code metrics
  useEffect(() => {
    setLineCount(code.split('\n').length);
    setCharCount(code.length);
  }, [code]);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    setCode(DEFAULT_CODE[newLang]);
    setOutput('');
    setError(null);
  };

  const getLanguageExtension = () => {
    switch (lang) {
      case 'python': return [python()];
      case 'cpp': return [cpp()];
      case 'java': return [java()];
      default: return [javascript({ jsx: true, typescript: false })];
    }
  };

  // Build full CodeMirror extensions
  const buildExtensions = useCallback(() => {
    const exts = [
      // Core
      lineNumbers(),
      highlightActiveLineGutter(),
      foldGutter({
        openText: '▾',
        closedText: '▸',
      }),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      bracketMatching(),
      closeBrackets(),
      autocompletion(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      search({ top: true }),
      history(),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...searchKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...completionKeymap,
        ...lintKeymap,
        indentWithTab,
      ]),
      // Language
      ...getLanguageExtension(),
    ];

    if (lineWrap) {
      exts.push(EditorView.lineWrapping);
    }

    return exts;
  }, [lang, lineWrap]);

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running code...');
    setError(null);
    setActivePanel('output');

    setTimeout(() => {
      try {
        if (lang === 'javascript') {
          const logs = [];
          const mockConsole = { log: (...args) => logs.push(args.map(String).join(' ')) };
          try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('console', code);
            fn(mockConsole);
            setOutput(logs.length > 0 ? logs.join('\n') : '✓ Code executed (no output)');
          } catch (e) {
            setError(`${e.name}: ${e.message}`);
            setOutput('');
          }
        } else {
          // For non-JS languages, show a simulated execution message
          setOutput(`[${LANGUAGE_LABELS[lang]} Sandbox]\n✓ Code submitted for execution.\n\nNote: Live ${LANGUAGE_LABELS[lang]} execution requires a backend server.\nUse the "Visualize" button to analyze the code logic with AI.`);
        }
      } catch (err) {
        setError(`Runtime Error: ${err.message}`);
      }
      setIsRunning(false);
    }, 600);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCode = () => {
    setCode(DEFAULT_CODE[lang]);
    setOutput('');
    setError(null);
    setNarration('');
  };

  const toggleVisualization = async () => {
    if (!isVisualizing) {
      setIsVisualizing(true);
      setIsAnalyzing(true);
      setAnimScript(null);
      setVizData(null);
      setAnimPlaying(false);
      setNarration('AI is generating multi-view visualizations...');
      
      try {
        // Run both AI calls in parallel
        const [vizResponse, animResponse] = await Promise.allSettled([
          generateVisualizationData(code, lang, input, output),
          generateAnimationScript(code, lang, input, output)
        ]);

        if (vizResponse.status === 'fulfilled') {
          setVizData(vizResponse.value);
        } else {
          console.error('[vizAI] Failed:', vizResponse.reason);
        }

        if (animResponse.status === 'fulfilled') {
          setAnimScript(animResponse.value);
          setAnimPlaying(true);
        } else {
          console.warn('[2D] Animation AI failed, using demo.');
          setAnimScript(getMergeSortDemoScript());
        }

        setNarration('Visualizations ready. Explore Flowchart, Step Trace, Call Graph, or 2D Animation.');
      } catch (err) {
        console.error('Visualization error:', err);
        setNarration('Failed to generate visualizations.');
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setIsVisualizing(false);
      setAnimPlaying(false);
    }
  };

  // Mermaid flowchart processing removed in favor of native D3 JSON flowcharts

  const langColor = LANGUAGE_COLORS[lang];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: isFullScreen ? '100vh' : 'calc(100vh - var(--header-height) - 4rem)',
      position: isFullScreen ? 'fixed' : 'relative',
      inset: isFullScreen ? 0 : 'auto',
      zIndex: isFullScreen ? 9999 : 1,
      background: 'var(--bg-base)',
      padding: isFullScreen ? '20px' : 0,
      gap: '16px',
    }}>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            style={{
              position: 'absolute', top: '20px', left: '50%', x: '-50%',
              zIndex: 10000, background: 'rgba(239, 68, 68, 0.9)', color: 'white',
              padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)', pointerEvents: 'none'
            }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'rgba(15,15,22,0.85)',
        borderRadius: '14px',
        border: '1px solid var(--border-color)',
        backdropFilter: 'blur(12px)',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        {/* Left: Language picker + meta tools */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Language Selector */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: langColor, marginRight: '8px', flexShrink: 0,
              boxShadow: `0 0 8px ${langColor}88`
            }} />
            <select
              value={lang}
              onChange={(e) => handleLangChange(e.target.value)}
              style={{
                padding: '7px 28px 7px 8px',
                borderRadius: '8px',
                color: 'white',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.06)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '8px', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

          {/* Font Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setFontSize(s => Math.max(10, s - 1))}
              title="Decrease font size"
              style={{ color: 'var(--text-dim)', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', fontWeight: 700 }}
            >A-</button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minWidth: '28px', textAlign: 'center' }}>{fontSize}</span>
            <button
              onClick={() => setFontSize(s => Math.min(24, s + 1))}
              title="Increase font size"
              style={{ color: 'var(--text-dim)', padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', fontWeight: 700 }}
            >A+</button>
          </div>

          {/* Wrap toggle */}
          <button
            onClick={() => setLineWrap(w => !w)}
            title="Toggle line wrap"
            style={{
              padding: '6px 10px', borderRadius: '7px',
              color: lineWrap ? 'var(--primary)' : 'var(--text-dim)',
              background: lineWrap ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.04)',
              border: lineWrap ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            <WrapText size={14} />
          </button>

          {/* Copy */}
          <button
            onClick={copyCode}
            title="Copy code"
            style={{
              padding: '6px 10px', borderRadius: '7px',
              color: copied ? '#10b981' : 'var(--text-dim)',
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          </button>

          {/* Reset */}
          <button
            onClick={resetCode}
            title="Reset to default"
            style={{ padding: '6px 10px', borderRadius: '7px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center' }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullScreen(f => !f)}
            title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
            style={{ padding: '6px 10px', borderRadius: '7px', color: isFullScreen ? 'var(--primary)' : 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center' }}
          >
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* Right: Action buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={toggleVisualization}
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '7px',
              fontWeight: 600, fontSize: '0.85rem',
              color: isVisualizing ? 'white' : 'var(--text-muted)',
              background: isVisualizing
                ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                : 'rgba(255,255,255,0.06)',
              border: isVisualizing ? 'none' : '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
            }}
          >
            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
            {isVisualizing ? 'Close Viz' : 'Visualize'}
          </button>

          <button
            onClick={runCode}
            disabled={isRunning}
            style={{
              padding: '9px 22px',
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', gap: '7px',
              fontWeight: 700, fontSize: '0.85rem',
              color: 'white',
              background: isRunning
                ? 'rgba(99,102,241,0.5)'
                : 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 50%, var(--accent) 100%)',
              transition: 'all 0.2s ease',
              boxShadow: isRunning ? 'none' : '0 4px 15px -3px rgba(99,102,241,0.5)',
            }}
          >
            {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* ── Main Workspace ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Visualization Overlay */}
        <AnimatePresence>
          {isVisualizing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                zIndex: 100, borderRadius: '20px', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', background: 'rgba(10,10,12,0.96)',
                border: '1px solid var(--border-glow)', backdropFilter: 'blur(20px)',
                display: 'flex', flexDirection: 'column'
              }}
            >
              {/* Viz Tabs */}
              <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <VizTab active={vizType === 'flowchart'} onClick={() => setVizType('flowchart')} icon={<GitBranch size={14} />} label="Flowchart" />
                  <VizTab active={vizType === 'stepTrace'} onClick={() => setVizType('stepTrace')} icon={<Terminal size={14} />} label="Step Trace" />
                  <VizTab active={vizType === 'callGraph'} onClick={() => setVizType('callGraph')} icon={<Share2 size={14} />} label="Call Graph" />
                  <VizTab active={vizType === 'animation'} onClick={() => setVizType('animation')} icon={<Video size={14} />} label="2D Animate" />
                </div>
                <button onClick={() => setIsVisualizing(false)} style={{ color: 'var(--text-dim)', padding: '6px', display: 'flex', alignItems: 'center' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Loading state */}
              {isAnalyzing && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid var(--primary)', animation: 'spin 1s linear infinite' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>AI is analyzing your code...</p>
                </div>
              )}

              {!isAnalyzing && vizData && (
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, padding: '28px 32px', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Flowchart Tab */}
                    {vizType === 'flowchart' && (
                      <div style={{ textAlign: 'center', position: 'relative', height: '100%', minHeight: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px', gap: '8px' }}>
                          <button 
                            onClick={() => {
                              localStorage.setItem('currentVizData', JSON.stringify(vizData));
                              localStorage.setItem('currentVizType', 'flowchart');
                              window.open('/standalone-viz', '_blank');
                            }}
                            style={{
                              padding: '6px 12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
                              borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', zIndex: 10
                            }}
                          >
                            <ExternalLink size={14} /> Open in New Tab
                          </button>
                        </div>
                        <MermaidChart chartCode={vizData.flowchart} />
                      </div>
                    )}

                    {/* Step Trace Tab */}
                    {vizType === 'stepTrace' && (
                      <div style={{ maxWidth: '900px', margin: '0 auto', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                          <button 
                            onClick={() => {
                              localStorage.setItem('currentVizData', JSON.stringify(vizData));
                              localStorage.setItem('currentVizType', 'stepTrace');
                              window.open('/standalone-viz', '_blank');
                            }}
                            style={{
                              padding: '6px 12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
                              borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={14} /> Open in New Tab
                          </button>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <th style={{ padding: '14px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 700 }}>Step</th>
                              <th style={{ padding: '14px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 700 }}>Line #</th>
                              <th style={{ padding: '14px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 700 }}>Code</th>
                              <th style={{ padding: '14px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 700 }}>Explanation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {vizData.stepTrace.map((s, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '14px' }}>{s.step}</td>
                                <td style={{ padding: '14px' }}>
                                  <span style={{ padding: '3px 8px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: 600 }}>{s.line}</span>
                                </td>
                                <td style={{ padding: '14px' }}><code>{s.code}</code></td>
                                <td style={{ padding: '14px' }}>{s.explanation}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Call Graph Tab */}
                    {vizType === 'callGraph' && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                          <button 
                            onClick={() => {
                              localStorage.setItem('currentVizData', JSON.stringify(vizData));
                              localStorage.setItem('currentVizType', 'callGraph');
                              window.open('/standalone-viz', '_blank');
                            }}
                            style={{
                              padding: '6px 12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)',
                              borderRadius: '8px', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.75rem', fontWeight: 600,
                              display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                            }}
                          >
                            <ExternalLink size={14} /> Open in New Tab
                          </button>
                        </div>
                        <CallGraphD3 data={vizData.callGraph} />
                      </div>
                    )}

                    {/* 2D Animation Tab */}
                    {vizType === 'animation' && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 0 14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '14px' }}>
                          <button
                            onClick={() => {
                              if (animScript) {
                                localStorage.setItem('currentAnimationScript', JSON.stringify(animScript));
                                window.open('/animation', '_blank');
                              }
                            }}
                            disabled={!animScript}
                            style={{
                              padding: '5px 14px', borderRadius: '8px', 
                              fontSize: '0.78rem', fontWeight: 600, color: animScript ? 'var(--primary)' : 'var(--text-dim)',
                              background: animScript ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${animScript ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                              cursor: animScript ? 'pointer' : 'not-allowed'
                            }}
                          >
                            <ExternalLink size={14} /> Open in New Tab
                          </button>
                          {animScript && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#64748b' }}>
                              {animScript.steps.length} animation steps · {animScript.language}
                            </span>
                          )}
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                          {animScript ? (
                            <CodeAnimation2D
                              script={animScript}
                              isPlaying={animPlaying}
                              speed={animSpeed}
                              onStepChange={(step) => setNarration(step.narration)}
                            />
                          ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
                              <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', animation: 'spin 1s linear infinite' }} />
                              <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>Generating 2D animation script...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}


              {/* Narration bar */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border-color)', background: 'rgba(99,102,241,0.04)', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Sparkles size={16} color="var(--primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '0.95rem', color: '#ccd', fontStyle: 'italic', lineHeight: '1.5' }}>"{narration}"</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Editor Panel ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#1a1a22' }}>
          {/* Editor title bar */}
          <div style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Code2 size={14} color="var(--text-dim)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                main.{lang === 'javascript' ? 'js' : lang === 'python' ? 'py' : lang === 'cpp' ? 'cpp' : 'java'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                <Hash size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                {lineCount} lines · {charCount} chars
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>UTF-8</span>
            </div>
          </div>

          {/* CodeMirror Editor */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            <CodeMirror
              ref={editorRef}
              value={code}
              theme={oneDark}
              extensions={buildExtensions()}
              onChange={(value) => setCode(value)}
              basicSetup={false}
              style={{
                fontSize: `${fontSize}px`,
                height: '100%',
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              }}
            />
          </div>

          {/* Status bar */}
          <div style={{ padding: '5px 16px', background: 'rgba(99,102,241,0.08)', borderTop: '1px solid rgba(99,102,241,0.15)', display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: '6px' }} />
              {LANGUAGE_LABELS[lang]}
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Ctrl+Space: Autocomplete · Ctrl+F: Search · Alt+Shift+F: Fold</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 'auto' }}>Tab Size: 2</span>
          </div>
        </div>

        {/* ── Output Panel ── */}
        <div style={{ height: '220px', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', background: 'rgba(10,10,18,0.85)' }}>
          {/* Tabs */}
          <div style={{ padding: '0 16px', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '4px', alignItems: 'flex-end' }}>
            {[
              { id: 'output', label: 'Output', icon: <Terminal size={12} /> },
              { id: 'input', label: 'Input', icon: <Activity size={12} /> },
              { id: 'insights', label: 'Insights', icon: <Sparkles size={12} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                style={{
                  padding: '8px 14px 7px',
                  fontSize: '0.8rem', fontWeight: 600,
                  color: activePanel === tab.id ? 'var(--primary)' : 'var(--text-dim)',
                  borderBottom: activePanel === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, padding: '14px 18px', overflow: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
            {activePanel === 'input' && (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Provide standard input for your program here..."
                style={{
                  width: '100%', height: '100%', background: 'transparent',
                  border: 'none', color: '#cdd', outline: 'none', resize: 'none',
                  fontSize: '0.88rem', fontFamily: 'inherit', lineHeight: '1.6',
                }}
              />
            )}
            {activePanel === 'output' && (
              <div style={{ fontSize: '0.88rem', lineHeight: '1.7' }}>
                {error ? (
                  <div style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</pre>
                  </div>
                ) : (
                  <pre style={{ color: output ? '#aef3c7' : 'var(--text-dim)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {output || '// Run your code to see output here...'}
                  </pre>
                )}
              </div>
            )}
            {activePanel === 'insights' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', height: '100%' }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '12px', fontWeight: 700 }}>Code Metrics</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { label: 'Lines', value: lineCount },
                      { label: 'Characters', value: charCount },
                      { label: 'Language', value: LANGUAGE_LABELS[lang] },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{label}</span>
                        <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '12px', fontWeight: 700 }}>Keyboard Shortcuts</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {[
                      ['Ctrl+Space', 'Autocomplete'],
                      ['Ctrl+F', 'Search'],
                      ['Ctrl+Z', 'Undo'],
                      ['Ctrl+/', 'Comment'],
                    ].map(([key, desc]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <code style={{ fontSize: '0.72rem', padding: '3px 7px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', borderRadius: '5px' }}>{key}</code>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const VizTab = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      padding: '7px 12px',
      borderRadius: '8px',
      display: 'flex', alignItems: 'center', gap: '6px',
      fontSize: '0.78rem', fontWeight: 600,
      background: active ? 'rgba(99,102,241,0.14)' : 'transparent',
      color: active ? 'var(--primary)' : 'var(--text-dim)',
      border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
      transition: 'all 0.15s ease',
    }}
  >
    {icon} {label}
  </button>
);

export default EditorPage;
