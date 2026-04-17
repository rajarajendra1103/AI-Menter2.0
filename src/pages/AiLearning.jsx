import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  BookOpen as Book, 
  GitBranch as MapIcon, 
  Code, 
  CheckCircle as ShieldCheck, 
  AlertTriangle, 
  Globe,
  RotateCw,
  Terminal,
  Layers,
  Cpu,
  FileCode,
  Layout,
  Zap,
  TrendingUp,
  Lightbulb,
  Search,
  Braces
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOpenRouterResponse } from '../utils/openrouter';
import MermaidChart from '../components/MermaidChart';

const CodeBlock = ({ children, style = {} }) => {
  let content = typeof children === 'string' ? children : (Array.isArray(children) ? children.join('\n') : JSON.stringify(children, null, 2));
  content = content?.replace(/^[`*#]+|[`*#]+$/g, '').trim();
  return <pre className="code-block" style={style}>{content || "No code available"}</pre>;
};

const Flashcard = ({ category, title, frontContent, backContent, icon: Icon, accent }) => {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="card-perspective" onClick={() => setFlipped(!flipped)}>
      <div className={`card-inner ${flipped ? 'is-flipped' : ''}`}>
        <div className="card-front" style={{ borderTop: `4px solid ${accent}` }}>
          <div className="category-label" style={{ color: accent }}><Icon size={16} />{category}</div>
          <h2 className="card-title">{title}</h2>
          <div className="card-content-body">{frontContent}</div>
          <div className="flip-hint"><RotateCw size={14} /> Tap to flip & reveal</div>
        </div>
        <div className="card-back" style={{ borderTop: `4px solid ${accent}` }}>
          <div className="category-label" style={{ color: accent }}>DEEP DIVE</div>
          <div className="card-content-body">{backContent}</div>
          <div className="flip-hint"><RotateCw size={14} /> Tap to flip back</div>
        </div>
      </div>
    </div>
  );
};

const AiLearning = ({ type }) => {
  const [activeTab, setActiveTab] = useState(type || 'lesson'); 
  const [topicInput, setTopicInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [suggestedKeywords, setSuggestedKeywords] = useState([]);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingKeywords, setFetchingKeywords] = useState(false);

  useEffect(() => { if (type) setActiveTab(type); }, [type]);

  useEffect(() => {
    if (activeTab === 'keywords') fetchTopKeywords();
  }, [selectedLanguage, activeTab]);

  const fetchTopKeywords = async () => {
    setFetchingKeywords(true);
    const prompt = `List 10 most important keywords for ${selectedLanguage}. Return ONLY a raw JSON array of strings: ["key1", "key2", ...]`;
    try {
      const resp = await generateOpenRouterResponse(prompt, "llama-3.3-70b-versatile");
      let parsed;
      let cleanJson = resp.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        parsed = JSON.parse(cleanJson);
      } catch (e) {
        const match = cleanJson.match(/\[[\s\S]*\]/);
        if (match) parsed = JSON.parse(match[0]);
        else throw new Error("Could not parse array");
      }
      setSuggestedKeywords(parsed);
    } catch (e) {
      setSuggestedKeywords(["const", "let", "function", "if", "else", "return", "for", "while", "class", "async"]);
    } finally { setFetchingKeywords(false); }
  };

  const getTodayTopicFromSSP = () => {
    try {
      const savedPlan = localStorage.getItem('studyPlan');
      if (savedPlan) {
        const plan = JSON.parse(savedPlan);
        return plan[0]?.topic || 'Variables';
      }
    } catch (e) { return 'Variables'; }
    return 'Variables';
  };

  const handleGenerate = async (explicitKeyword = null) => {
    let topicToFetch = explicitKeyword === "Type manually..." ? topicInput : (explicitKeyword || (activeTab === 'lesson' ? getTodayTopicFromSSP() : topicInput));
    if (!topicToFetch && activeTab !== 'lesson') return;

    setLoading(true);
    setContent(null);

    const isKeywords = activeTab === 'keywords';
    const context = activeTab === 'dsa' ? "Focus on algorithm logic." : "";

    const prompt = isKeywords 
      ? `Explain the keyword "${topicToFetch}" in ${selectedLanguage}.
         IMPORTANT: No Markdown formatting (**, ##). Use plain text.
         Return ONLY a raw JSON structure:
          {
           "concept": "Explanation (plain text)", 
           "flowchart": "graph TD\n  A[\"Start\"] --> B[\"Process\"]",
           "howToUse": "Instructions (plain text)", 
           "whereToUse": "Typical scenarios (plain text)", 
           "example": "Simple code snippet",
           "title": "${topicToFetch}"
         }
         IMPORTANT: Always wrap node labels in double quotes (e.g. A[\"var=[1,2]\"]). 
         NEVER use double quotes inside a label; use single quotes instead (e.g. A[\"arr['i']=1\"]).`
      : `Generate learning content for: ${topicToFetch} in ${activeTab} mode. ${context}
         Return ONLY a raw JSON structure:
          {
           "concept": "Explanation", "types": "Classifications", "syntax": "Code syntax", "flowchart": "graph TD\n  1[\"Start\"] --> 2[\"Process\"]",
           "timeComplexity": "O(n)", "spaceComplexity": "O(1)", "advantages": ["list"], "disadvantages": ["list"],
           "bestPractices": ["list"], "exampleProgram": "Code", "errorProneProgram": "Buggy",
           "howToUse": "How to", "useCaseProblem": "ProblemContext", "restrictions": "Limits", "realWorldApps": "Apps"
         }
         IMPORTANT: Always wrap node labels in double quotes (e.g. 1[\"arr=[1,2]\"]). 
         NEVER use double quotes inside a label; use single quotes instead (e.g. 1[\"arr['i']=1\"]).`

    try {
      const resp = await generateOpenRouterResponse(prompt, "llama-3.3-70b-versatile");
      let data;
      let cleanJson = resp.replace(/```json/gi, '').replace(/```/g, '').trim();
      try {
        data = JSON.parse(cleanJson);
      } catch (e) {
        const match = cleanJson.match(/\{[\s\S]*\}/);
        if (match) data = JSON.parse(match[0]);
        else throw new Error("Could not parse object");
      }
      setContent({ ...data, mode: activeTab });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="notes-container">
      <aside className="notes-sidebar">
        <div className="tab-switcher">
          <button className={activeTab === 'lesson' ? 'active-tab' : ''} onClick={() => setActiveTab('lesson')}><Layout size={16} /> Lesson</button>
          <button className={activeTab === 'topic' ? 'active-tab' : ''} onClick={() => setActiveTab('topic')}><Book size={16} /> Topic</button>
          <button className={activeTab === 'dsa' ? 'active-tab' : ''} onClick={() => setActiveTab('dsa')}><Terminal size={16} /> DSA</button>
          <button className={activeTab === 'keywords' ? 'active-tab' : ''} onClick={() => setActiveTab('keywords')}><Braces size={16} /> Keywords</button>
        </div>

        <div className="input-area">
          {activeTab === 'keywords' ? (
             <>
               <label className="input-label"><Globe size={14} /> Select Language</label>
               <select className="search-box lang-select" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)}>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
               </select>

               <label className="input-label"><ShieldCheck size={14} /> Select Keyword</label>
               <select className="search-box lang-select" onChange={(e) => handleGenerate(e.target.value)}>
                  <option value="">Most Important List...</option>
                  {suggestedKeywords.map((kw, i) => <option key={i} value={kw}>{kw}</option>)}
                  <option value="Type manually...">Type manually...</option>
               </select>

               <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', opacity: 0.3 }} />
                <input type="text" className="search-box" placeholder="Search other keywords..." value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleGenerate()} />
               </div>
             </>
          ) : activeTab === 'lesson' ? (
            <div className="ssp-status">
              <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Daily Target:</p>
              <h3 style={{ margin: '0.5rem 0', color: '#a855f7', fontWeight: 900 }}>{getTodayTopicFromSSP()}</h3>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '1.1rem', opacity: 0.3 }} />
              <input type="text" className="search-box" placeholder="Search topic..." value={topicInput} onChange={(e) => setTopicInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleGenerate()} />
            </div>
          )}
          
          <button className="generate-btn" onClick={() => handleGenerate()} disabled={loading}>
            <Zap size={18} className={loading ? 'pulse' : ''} />
            {loading ? 'Analyzing...' : 'Generate Flashcards'}
          </button>
        </div>
      </aside>

      <main className="content-area">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="loading-area"><div className="pulse-circle"><Zap size={60} color="#a855f7" /></div><h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Crafting Your Deck...</h2></motion.div>
          ) : content ? (
            <div className="flashcard-grid">
              {content.mode === 'keywords' ? (
                <>
                  <Flashcard category="Concept" title={content.title} icon={Lightbulb} accent="#a855f7" frontContent={<p style={{ fontSize: '1.3rem', lineHeight: '1.6' }}>{content.concept}</p>} backContent={<div><p style={{ color: '#a855f7', fontWeight: 700 }}>Where to use it:</p><p style={{ marginTop: '0.5rem', fontSize: '1rem' }}>{content.whereToUse}</p></div>}/>
                  <Flashcard category="Usage" title="How to use it" icon={Terminal} accent="#a855f7" frontContent={<p style={{ fontSize: '1.1rem' }}>{content.howToUse}</p>} backContent={<div><p style={{ color: '#a855f7', fontWeight: 700 }}>Logic:</p><p style={{ marginTop: '0.5rem' }}>Fundamental building block for robust architectures.</p></div>}/>
                  <Flashcard category="Practical" title="Simple Example" icon={Code} accent="#22c55e" frontContent={<CodeBlock>{content.example}</CodeBlock>} backContent={<p>Clean code implementation context.</p>}/>
                  {content.flowchart && <Flashcard category="Visual" title="Flowchart" icon={MapIcon} accent="#3b82f6" frontContent={<MermaidChart chartCode={content.flowchart} />} backContent={<p>Study the logical flow visual.</p>}/>}
                </>
              ) : (
                <>
                  <Flashcard category="Concept" title={content.title || topicInput} icon={Lightbulb} accent="#a855f7" frontContent={<p style={{ fontSize: '1.2rem', lineHeight: '1.6' }}>{content.concept}</p>} backContent={<div><p style={{ color: '#a855f7', fontWeight: 700 }}>Real World Apps:</p><p style={{ marginTop: '0.5rem' }}>{content.realWorldApps || content.whereToUse}</p>{content.useCaseProblem && <><p style={{ marginTop: '1.5rem', color: '#a855f7', fontWeight: 700 }}>Context Case:</p><p style={{ marginTop: '0.5rem' }}>{content.useCaseProblem}</p></>}</div>}/>
                  <Flashcard category="Format" title="Syntax" icon={Terminal} accent="#a855f7" frontContent={<CodeBlock>{content.syntax || content.howToUse}</CodeBlock>} backContent={<div><p style={{ color: '#a855f7', fontWeight: 700 }}>Usage Guide:</p><p style={{ marginTop: '0.5rem' }}>{content.howToUse}</p>{content.restrictions && <><p style={{ marginTop: '1.5rem', color: '#f59e0b', fontWeight: 700 }}>Restrictions:</p><p style={{ marginTop: '0.5rem' }}>{content.restrictions}</p></>}</div>}/>
                  <Flashcard category="Practice" title="Example Program" icon={Code} accent="#22c55e" frontContent={<CodeBlock style={{ fontSize: '0.8rem' }}>{content.exampleProgram || content.example}</CodeBlock>} backContent={<div><p style={{ color: '#fca5a5', fontWeight: 700 }}>Logical Errors:</p><CodeBlock style={{ fontSize: '0.75rem', color: '#fca5a5', marginTop: '1rem' }}>{content.errorProneProgram}</CodeBlock></div>}/>
                  {content.flowchart && <Flashcard category="Visual" title="Logic Flow" icon={MapIcon} accent="#3b82f6" frontContent={<MermaidChart chartCode={content.flowchart} />} backContent={<p>Logical execution path.</p>}/>}
                  {(content.timeComplexity || content.advantages) && <Flashcard category="Analysis" title="Complexity" icon={TrendingUp} accent="#f59e0b" frontContent={<div>{content.timeComplexity && <div className="analysis-tag"><span style={{ color: '#f59e0b', fontWeight: 800 }}>TIME</span> {content.timeComplexity}</div>}{content.spaceComplexity && <div className="analysis-tag" style={{ borderLeftColor:'#3b82f6'}}><span style={{ color: '#3b82f6', fontWeight: 800 }}>SPACE</span> {content.spaceComplexity}</div>}</div>} backContent={<div><p style={{ color: '#22c55e', fontWeight: 700 }}>Pros:</p><ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>{Array.isArray(content.advantages) ? content.advantages.map((a, i) => <li key={i}>{a}</li>) : <li>{content.advantages}</li>}</ul></div>}/>}
                  <Flashcard category="Expertise" title="Best Practices" icon={ShieldCheck} accent="#a855f7" frontContent={<ul style={{ paddingLeft: '1.2rem' }}>{Array.isArray(content.bestPractices) ? content.bestPractices.slice(0, 3).map((bp, i) => <li key={i} style={{marginBottom: '0.5rem'}}>{bp}</li>) : <li>{content.bestPractices}</li>}</ul>} backContent={<div><p style={{ color: '#ef4444', fontWeight: 700 }}>Cons:</p><ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>{Array.isArray(content.disadvantages) ? content.disadvantages.map((d, i) => <li key={i}>{d}</li>) : <li>{content.disadvantages}</li>}</ul></div>}/>
                </>
              )}
            </div>
          ) : (
            <motion.div key="empty" className="empty-state"><Layout size={100} style={{ opacity: 0.1 }} /><h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>AI Flashcard deck</h1><p style={{ opacity: 0.5 }}>Select mode and topic to start.</p></motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .notes-container { display: flex; gap: 40px; height: calc(100vh - 120px); margin: -20px; padding: 20px; background: #0a0a0c; border-radius: 24px; overflow: hidden; }
        .notes-sidebar { width: 320px; display: flex; flex-direction: column; gap: 24px; background: #111114; border: 1px solid rgba(255,255,255,0.05); border-radius: 24px; padding: 24px; flex-shrink: 0; overflow-y: auto; }
        .tab-switcher { display: flex; flex-direction: column; gap: 8px; }
        .tab-switcher button { display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 12px; font-weight: 700; color: #94a3b8; transition: 0.3s; background: rgba(255,255,255,0.02); border: 1px solid transparent; width: 100%; cursor: pointer; }
        .tab-switcher button.active-tab { background: #a855f7; color: white; border-color: #c084fc; box-shadow: 0 4px 20px rgba(168, 85, 247, 0.4); }
        .input-area { display: flex; flex-direction: column; gap: 16px; margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .input-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; color: #a855f7; font-weight: 800; display: flex; align-items: center; gap: 6px; }
        .ssp-status { background: rgba(168, 85, 247, 0.05); padding: 20px; border-radius: 16px; border: 1px solid rgba(168, 85, 247, 0.1); }
        .search-box { width: 100%; padding: 14px 14px 14px 40px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: white; outline: none; transition: 0.3s; font-size: 0.9rem; }
        .search-box:focus { border-color: #a855f7; background: rgba(255,255,255,0.05); }
        .lang-select { padding-left: 14px !important; background: #1a1a1f !important; border-color: rgba(255,255,255,0.15) !important; cursor: pointer; appearance: none; }
        .generate-btn { background: linear-gradient(135deg, #a855f7, #7c3aed); color: white; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 1rem; display: flex; align-items: center; gap: 10px; justify-content: center; cursor: pointer; border: none; }
        .content-area { flex: 1; overflow: hidden; position: relative; }
        .flashcard-grid { display: flex; gap: 32px; height: 100%; padding: 20px 40px 60px 0; overflow-x: auto; overflow-y: hidden; scroll-behavior: smooth; scroll-snap-type: x mandatory; align-items: stretch; }
        .card-perspective { min-width: 440px; height: 100%; perspective: 1500px; scroll-snap-align: start; cursor: pointer; }
        .card-inner { position: relative; width: 100%; height: 100%; transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1); transform-style: preserve-3d; }
        .card-inner.is-flipped { transform: rotateY(180deg); }
        .card-front, .card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 36px; padding: 48px; display: flex; flex-direction: column; background: #111114; border: 1px solid rgba(255,255,255,0.05); overflow-y: auto; }
        .card-front { background: linear-gradient(145deg, #16161a 0%, #0c0a10 100%); }
        .card-back { background: linear-gradient(145deg, #0c0a10 0%, #16161a 100%); transform: rotateY(180deg); border-color: rgba(168, 85, 247, 0.3); }
        .category-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 2px; font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        .card-title { font-size: 1.85rem; font-weight: 900; margin-bottom: 24px; font-family: 'Outfit', sans-serif; color: white; line-height: 1.2; }
        .card-content-body { font-size: 1.15rem; line-height: 1.7; color: rgba(255,255,255,0.8); flex: 1; }
        .flip-hint { margin-top: 24px; font-size: 0.8rem; color: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .code-block { background: #000; padding: 24px; border-radius: 20px; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; line-height: 1.6; color: #a5b4fc; border: 1px solid rgba(255, 255, 255, 0.03); margin: 16px 0; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
        .analysis-tag { background: rgba(168, 85, 247, 0.05); padding: 18px; border-radius: 16px; border-left: 5px solid #a855f7; margin-bottom: 14px; font-size: 1rem; }
        .mermaid-viz { background: #000; border-radius: 20px; padding: 24px; display: flex; justify-content: center; align-items: center; overflow: auto; min-height: 250px; flex: 1; }
        .loading-area, .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 24px; }
        .pulse-circle { width: 140px; height: 140px; border: 2px solid #a855f7; border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: pulse-circle 2s infinite; }
        @keyframes pulse-circle { 0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); } 70% { box-shadow: 0 0 0 30px rgba(168, 85, 247, 0); } 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); } }
        .pulse { animation: pulse 1.5s infinite; }
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default AiLearning;
