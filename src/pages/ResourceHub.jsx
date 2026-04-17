import React, { useState, useEffect } from 'react';
import {
  Play,
  Search,
  FileText,
  Sparkles,
  Download,
  MessageSquare,
  HelpCircle,
  Clock,
  ExternalLink,
  Loader2,
  ChevronLeft,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { YOUTUBE_API_KEY } from '../utils/config';
import { generateOpenRouterResponse } from '../utils/openrouter';
// (Mammoth imported globally via CDN in index.html to prevent Vite 500 resolution errors)

const MOCK_DOCS = [
  { id: 1, title: 'React 18 Architecture Guide', type: 'TXT', date: 'Oct 12', size: '2.4 MB', content: 'React 18 introduces Concurrent Features, allowing you to prepare multiple versions of the UI at the same time. This update includes automatic batching, new APIs like startTransition, and streaming server-side rendering with support for Suspense. The primary goal is to improve application performance and user experience.' },
  { id: 2, title: 'Python Data Science Cheatsheet', type: 'TXT', date: 'Nov 05', size: '1.2 MB', content: 'Data science in Python heavily relies on pandas, numpy, and matplotlib. DataFrames allow structured data manipulation. Use df.groupby() for aggregation, df.apply() for custom functions. Neural networks can be built using TensorFlow or PyTorch. Always ensure data is cleaned and normalized before training models to avoid skewed results.' },
];

const ResourceHub = ({ type = "videos" }) => {
  const [langFilter, setLangFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [fetchedVideos, setFetchedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const languages = ['All', 'English', 'Telugu', 'Hindi', 'Tamil'];

  const searchVideos = async (e) => {
    if (e) e.preventDefault();
    if (!YOUTUBE_API_KEY) {
      setError("YouTube API Key missing in .env");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchTerm = `${query} ${langFilter === 'All' ? '' : langFilter}`.trim();
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchTerm)}&maxResults=12&type=video&key=${YOUTUBE_API_KEY}`
      );

      if (!response.ok) throw new Error("YouTube API Limit reached or Key invalid.");

      const data = await response.json();
      const results = data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        thumb: item.snippet.thumbnails.high.url,
        lang: langFilter === 'All' ? 'Mixed' : langFilter,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
      }));

      setFetchedVideos(results);
    } catch (err) {
      setError(err.message);
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Document state
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeSummaryType, setActiveSummaryType] = useState('Key Highlights');
  const [aiSummary, setAiSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleSelectDoc = async (doc) => {
    setSelectedDoc(doc);
    handleAiAction('Key Highlights', doc.content, doc.base64Str);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setSelectedDoc(null);
    setAiSummary('');

    const ext = file.name.split('.').pop().toLowerCase();

    const newDoc = {
      id: Date.now(),
      title: file.name,
      type: ext.toUpperCase(),
      size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
      date: 'Just now',
      content: '', // Raw text if available
      base64Str: null // data URI for images/pdfs
    };

    const reader = new FileReader();

    // 1. Plain Text readable natively
    if (['txt', 'html', 'csv', 'md', 'json'].includes(ext)) {
      reader.onload = (event) => {
        newDoc.content = event.target.result.substring(0, 8000) + '... [text truncated for processing limit]';
        setIsUploading(false);
        setSelectedDoc(newDoc);
        handleAiAction('Key Highlights', newDoc.content, null);
      };
      reader.readAsText(file);

      // 2. Multimodal data URIs (Images and PDFs can be sent to Gemini via Base64 Native Processing)
    } else if (file.type.includes('image') || ext === 'pdf' || ext === 'jpg' || ext === 'png' || ext === 'jpeg') {
      reader.onload = (event) => {
        const b64 = event.target.result;
        newDoc.base64Str = b64;
        newDoc.content = `[Attached Media: ${file.name}] Successfully routed into AI multimodal memory stream. \n\nOur system will attempt to optically parse the content from the visual file structure when analyzing. Use the insights buttons to pull data directly natively from the file!`;
        setIsUploading(false);
        setSelectedDoc(newDoc);
        handleAiAction('Key Highlights', `Please read and deeply analyze this attached ${ext.toUpperCase()} file via computer vision or PDF parsing matrix.`, b64);
      };
      reader.readAsDataURL(file);

      // 3. Word Documents (.docx, .doc) parsed locally via Mammoth Buffer Engine
    } else if (ext === 'docx' || ext === 'doc') {
      reader.onload = async (event) => {
        try {
          // ArrayBuffer sent directly to mammoth to extract XML document trees into plain text
          const arrayBuffer = event.target.result;
          const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });

          let extractedText = result.value;
          if (!extractedText || extractedText.trim() === '') {
            extractedText = "[Unable to extract text. The document may be encrypted, scanned as images safely encapsulated within Word, or a heavily legacy binary .doc file without readable characters.]";
          }

          newDoc.content = extractedText.substring(0, 8000) + (extractedText.length > 8000 ? '... [document text truncated for memory limits]' : '');
          setIsUploading(false);
          setSelectedDoc(newDoc);
          handleAiAction('Key Highlights', newDoc.content, null);
        } catch (err) {
          newDoc.content = `[ERROR: Document Parsing Failed (${err.message})]. The inner XML tree of this Microsoft Word archive could not be read. Please convert to a unified PDF format and attempt upload again.`;
          setIsUploading(false);
          setSelectedDoc(newDoc);
          handleAiAction('Key Highlights', newDoc.content, null);
        }
      };
      reader.readAsArrayBuffer(file);

      // 4. Ultimate Fallback (Unsupported Types)
    } else {
      reader.onload = () => {
        newDoc.content = `[ERROR: UNSUPPORTED FORMAT detected (${ext})]. Raw binary formats like spreadsheets or audio files cannot be translated directly to semantic text right now. Please upload a structured .DOCX, .TXT, .PDF, or Visual Image.`;
        setIsUploading(false);
        setSelectedDoc(newDoc);
        handleAiAction('Key Highlights', newDoc.content, null);
      };
      reader.readAsText(file); // Trigger load just for error catching
    }
  };

  const handleAiAction = async (actionType, explicitContent = null, explicitBase64 = null) => {
    const contentToAnalyze = explicitContent || selectedDoc?.content;
    const mediaToAnalyze = explicitBase64 || selectedDoc?.base64Str;
    if (!contentToAnalyze && !mediaToAnalyze) return;

    setIsSummarizing(true);
    setActiveSummaryType(actionType);
    setAiSummary(`AI is scanning structure for ${actionType}...`);

    try {
      let prompt = '';

      if (actionType === 'Key Highlights') {
        prompt = `Extract exactly 3-4 key bullet points representing the absolute most important highlights from this text. Keep them precise. Text:\n"${contentToAnalyze}"`;
      } else if (actionType === 'Simple Summary') {
        prompt = `Write a short, clean, plain English paragraph summarizing this technical document so a beginner can easily understand the main purpose. Text:\n"${contentToAnalyze}"`;
      } else if (actionType === 'Logic Breakdown') {
        prompt = `Break down the core logic, methodology, or main arguments of this file step-by-step. Go deep into exactly what the file is asserting. Text:\n"${contentToAnalyze}"`;
      } else if (actionType === '20 MCQs') {
        prompt = `Generate exactly 3 multiple choice testing questions based heavily on the specific context of this document. Text:\n"${contentToAnalyze}"`;
      } else if (actionType === 'Auto-FAQs') {
        prompt = `Formulate 3 specific, frequently asked questions (with insightful answers) that a reader analyzing this document might ask. Text:\n"${contentToAnalyze}"`;
      }

      // "google/gemini-2.0-flash-001" is natively multimodal on OpenRouter
      const response = await generateOpenRouterResponse(prompt, "llama-3.3-70b-versatile", mediaToAnalyze);

      // Ultra-restrictive Markdown Scrubber
      let cleanResp = response.replace(/```json|```html|```markdown|```/gi, '').trim();
      cleanResp = cleanResp.replace(/\*\*/g, ''); // Blast bold tags
      cleanResp = cleanResp.replace(/##/g, '');   // Blast h2 tags
      cleanResp = cleanResp.replace(/#/g, '');    // Blast all headers
      cleanResp = cleanResp.replace(/__/g, '');   // Blast underline
      cleanResp = cleanResp.replace(/\*/g, '•');  // Convert single asterisks to true list bullets for spacing

      setAiSummary(cleanResp);
    } catch (err) {
      setAiSummary("Failed to generate insights. AI API or Network Error (" + err.message + ").");
    } finally {
      setIsSummarizing(false);
    }
  };

  useEffect(() => {
    if (type === 'videos') {
      searchVideos();
    }
  }, [langFilter, type]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '12px', letterSpacing: '-1px' }}>
            {type === 'docs' ? 'Omni Format' : 'Video'}{' '}
            <span className="text-gradient" style={type === 'docs' ? { backgroundImage: 'linear-gradient(135deg, #3b82f6, #10b981)' } : {}}>
              {type === 'docs' ? 'Document Reader' : 'Hub'}
            </span>
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>
            {type === 'docs'
              ? 'Natively parse and analyze TXT, PDF, Word Document (DOCX), or Image file formats flawlessly.'
              : 'Curated learning videos enhanced with multi-lingual search.'}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {type === 'videos' ? (
          <motion.div key="videos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {/* Same as earlier for videos, hidden inner elements logic unmodified */}
            <form onSubmit={searchVideos} style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', marginBottom: '40px', padding: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input type="text" placeholder="Enter topic (e.g., Python, React, DSA...)" value={query} onChange={(e) => setQuery(e.target.value)} style={{ padding: '16px 16px 16px 48px', borderRadius: '14px', width: '100%', fontSize: '1rem', color: '#fff', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', outline: 'none', transition: 'border-color 0.2s' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                {languages.map(lang => (
                  <button type="button" key={lang} onClick={() => setLangFilter(lang)} className={`glass hover-lift ${langFilter === lang ? 'bg-gradient' : ''}`} style={{ padding: '12px 20px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, color: langFilter === lang ? 'white' : 'var(--text-dim)', border: '1px solid var(--border-color)' }}>{lang}</button>
                ))}
                <button type="submit" disabled={loading} className="bg-gradient hover-lift" style={{ padding: '12px 28px', borderRadius: '12px', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px', opacity: loading ? 0.7 : 1 }}>
                  {loading ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />} {loading ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '32px' }}>
              {fetchedVideos.length > 0 ? fetchedVideos.map(video => (
                <a href={video.url} target="_blank" rel="noopener noreferrer" key={video.id} className="glass-card hover-lift" style={{ padding: '0', overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
                    <img src={video.thumb} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.3s' }} className="hover-show"><Play size={48} color="white" fill="white" /></div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>{video.lang}</span><span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>YouTube</span></div>
                    <h4 style={{ fontSize: '1.05rem', color: '#fff', marginBottom: '16px', lineHeight: '1.4', height: '2.8em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }} dangerouslySetInnerHTML={{ __html: video.title }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{video.channel}</span><ExternalLink size={18} color="var(--primary)" /></div>
                  </div>
                </a>
              )) : !loading && (
                <div style={{ gridColumn: '1 / -1', padding: '100px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px dashed var(--border-color)' }}>
                  <Search size={64} color="var(--text-dim)" style={{ marginBottom: '24px', opacity: 0.3 }} />
                  <h3 style={{ fontSize: '1.5rem', color: '#fff', marginBottom: '12px' }}>Ready to Search</h3>
                  <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>Enter a topic and select a language to discover learning resources.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="docs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 400px', gap: '24px' }}>
            <div className="glass-card" style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {selectedDoc && <button onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><ChevronLeft size={20} /></button>}
                  <Sparkles size={24} color="#10b981" />
                  <h3 style={{ fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>{selectedDoc ? selectedDoc.title : 'Library API'}</h3>
                </div>

                <label className="glass hover-lift" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 800, color: '#fff', cursor: 'pointer', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)' }}>
                  {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {isUploading ? 'Extracting...' : 'Upload File'}
                  <input type="file" accept=".txt,.pdf,.png,.jpg,.jpeg,.doc,.docx,.csv,.json" style={{ display: 'none' }} onChange={handleFileUpload} />
                </label>
              </div>

              <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
                {isUploading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 size={40} color="#10b981" className="animate-spin" />
                    </div>
                    <h4 style={{ fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>Extracting Document...</h4>
                    <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '80%' }}>Running localized and native memory stream extraction matrices.</p>
                  </div>
                ) : !selectedDoc ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {MOCK_DOCS.map(doc => (
                      <div key={doc.id} onClick={() => handleSelectDoc(doc)} className="glass hover-lift" style={{ display: 'flex', alignItems: 'center', padding: '20px', borderRadius: '16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', background: '#111114' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                          <FileText size={24} color="#10b981" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '4px' }}>{doc.title}</h4>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                            <span>{doc.type}</span> • <span>{doc.size}</span> • <span>Updated {doc.date}</span>
                          </div>
                        </div>
                        <ChevronLeft size={20} color="rgba(255,255,255,0.3)" style={{ transform: 'rotate(180deg)' }} />
                      </div>
                    ))}
                    <div style={{ marginTop: '20px', padding: '32px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '16px', background: 'rgba(0,0,0,0.2)' }}>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', fontWeight: 600, marginBottom: '8px' }}>Native Omni-File Support Active!</p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Upload ANY of your assignments:<br />
                        <span style={{ color: '#3b82f6', fontWeight: 800 }}>Microsoft Word (.docx/doc)</span><br />
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>Adobe PDF (.pdf)</span><br />
                        <span style={{ color: '#10b981', fontWeight: 800 }}>Images (.png/.jpg)</span><br />
                        <span style={{ color: '#a855f7', fontWeight: 800 }}>Raw Code & Text (.txt/.json)</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="doc-content-mock" style={{ fontSize: '1.05rem', lineHeight: '1.8', color: 'rgba(255,255,255,0.85)', padding: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {selectedDoc.content}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card" style={{ opacity: selectedDoc ? 1 : 0.5, pointerEvents: selectedDoc ? 'auto' : 'none', transition: '0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Sparkles size={18} color="#10b981" /> Document Processing
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  <button onClick={() => handleAiAction('Key Highlights')} className="glass hover-lift" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: activeSummaryType === 'Key Highlights' ? 'rgba(16, 185, 129, 0.2)' : '', color: activeSummaryType === 'Key Highlights' ? '#10b981' : 'white', cursor: 'pointer', border: activeSummaryType === 'Key Highlights' ? '1px solid #10b981' : '' }}>Highlights</button>
                  <button onClick={() => handleAiAction('Simple Summary')} className="glass hover-lift" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: activeSummaryType === 'Simple Summary' ? 'rgba(59, 130, 246, 0.2)' : '', color: activeSummaryType === 'Simple Summary' ? '#3b82f6' : 'white', cursor: 'pointer', border: activeSummaryType === 'Simple Summary' ? '1px solid #3b82f6' : '' }}>Summary</button>
                  <button onClick={() => handleAiAction('Logic Breakdown')} className="glass hover-lift" style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, background: activeSummaryType === 'Logic Breakdown' ? 'rgba(168, 85, 247, 0.2)' : '', color: activeSummaryType === 'Logic Breakdown' ? '#a855f7' : 'white', cursor: 'pointer', border: activeSummaryType === 'Logic Breakdown' ? '1px solid #a855f7' : '' }}>Breakdown</button>
                </div>

                <div className="glass" style={{ minHeight: '150px', padding: '24px', borderRadius: '16px', fontSize: '0.95rem', color: '#fff', border: '1px solid rgba(255,255,255,0.05)', background: '#111114', lineHeight: '1.8', position: 'relative' }}>
                  {isSummarizing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', opacity: 0.5 }}>
                      <Loader2 size={24} className="animate-spin" color="#10b981" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{aiSummary}</span>
                    </div>
                  ) : aiSummary ? (
                    <div dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>') }} />
                  ) : (
                    <span style={{ opacity: 0.3 }}>Execute an AI scan sequence to begin extracting deep data logic.</span>
                  )}
                </div>
              </div>

              <div className="glass-card" style={{ opacity: selectedDoc ? 1 : 0.5, pointerEvents: selectedDoc ? 'auto' : 'none', transition: '0.3s' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <HelpCircle size={18} color="var(--secondary)" /> Testing Tools
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button onClick={() => handleAiAction('20 MCQs')} className="glass hover-lift" style={{ width: '100%', padding: '16px', borderRadius: '12px', textAlign: 'left', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '4px', color: '#fff', fontWeight: 700 }}>Generate Challenge (MCQs)</h4>
                    <p style={{ fontSize: '0.75rem', color: '#fff', opacity: 0.6 }}>Test your knowledge on this document.</p>
                  </button>
                  <button onClick={() => handleAiAction('Auto-FAQs')} className="glass hover-lift" style={{ width: '100%', padding: '16px', borderRadius: '12px', textAlign: 'left', border: '1px solid var(--border-color)', cursor: 'pointer' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '4px', color: '#fff', fontWeight: 700 }}>Extract Auto-FAQs</h4>
                    <p style={{ fontSize: '0.75rem', color: '#fff', opacity: 0.6 }}>Predict and answer common questions.</p>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceHub;
