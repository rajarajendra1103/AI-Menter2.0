import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  BookOpen, 
  Code, 
  Calendar, 
  Map as MapIcon, 
  CheckCircle2, 
  ArrowDownCircle,
  Clock,
  Briefcase,
  Zap,
  Layout,
  Star,
  Compass,
  FileCode,
  ShieldCheck,
  ZapOff,
  ChevronDown,
  Timer
} from 'lucide-react';
import { generateOpenRouterResponse } from '../utils/openrouter';

const Courses = () => {
  const [step, setStep] = useState('selection'); // selection, roadmap, ssp_input, ssp_display, ssp_done
  const [selectedLang, setSelectedLang] = useState(null);
  const [savedPlan, setSavedPlan] = useState(() => {
    const existingPlan = localStorage.getItem('studyPlan');
    return existingPlan ? JSON.parse(existingPlan) : null;
  });

  
  const langs = [
    { id: 'python', name: 'Python', icon: '🐍', desc: 'The most popular for AI & Data Science' },
    { id: 'java', name: 'Java', icon: '☕', desc: 'Industry standard for enterprise apps' },
    { id: 'cpp', name: 'C++', icon: '🔵', desc: 'High-performance and systems programming' },
    { id: 'js', name: 'JavaScript', icon: '🟨', desc: 'The language of the web' },
    { id: 'dsa', name: 'DSA', icon: '📊', desc: 'Data Structures & Algorithms mastery' }
  ];

  const handleSelect = (lang) => {
    setSelectedLang(lang);
    setStep('roadmap');
  };

  const handleResetPlan = () => {
    localStorage.removeItem('studyPlan');
    setSavedPlan(null);
    setStep('selection');
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '100px' }}>
      <AnimatePresence mode="wait">
        {step === 'selection' && (
          <motion.div key="selection" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}>
            {savedPlan ? (
                <div style={{ marginBottom: '60px' }}>
                    <div className="glass-card" style={{ padding: '40px', border: '1px solid #22c55e44', background: '#111114' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Your Active <span className="text-gradient">Study Plan</span></h2>
                                <p style={{ opacity: 0.5 }}>Manage your progress or start a new track below.</p>
                            </div>
                            <button onClick={handleResetPlan} style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.8rem', opacity: 0.6, background: 'none', border: '1px solid #ef444433', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>Reset Plan</button>
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                            {savedPlan.map((topic, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: topic.status === 'completed' ? '#22c55e' : '#a855f7' }} />
                                    <span style={{ fontWeight: 700, opacity: topic.status === 'completed' ? 0.3 : 1 }}>{topic.topic}</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>{topic.level}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => window.location.href='/learning'} className="bg-gradient hover-lift" style={{ margin: '32px auto 0', display: 'flex', alignItems: 'center', gap: '8px', padding: '16px 32px', borderRadius: '16px', color: 'white', fontWeight: 900, border: 'none', cursor: 'pointer' }}>Go to AI Workshop <ArrowRight size={18} /></button>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h1 style={{ fontSize: '3.5rem', fontWeight: 900, marginBottom: '16px' }}>Master Your <span className="text-gradient">Career</span></h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>Choose a specialized track and let AI build your custom learning voyage.</p>
                </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
              {langs.map(lang => (
                <div key={lang.id} className="glass-card hover-lift" style={{ cursor: 'pointer', padding: '40px', background: '#111114' }} onClick={() => handleSelect(lang)}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '24px' }}>{lang.icon}</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{lang.name}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.5' }}>{lang.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'roadmap' && (
          <motion.div key="roadmap" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <button onClick={() => setStep('selection')} style={{ color: '#a855f7', marginBottom: '32px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>← Switch Track</button>
            <div style={{ marginBottom: '48px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900 }}>{selectedLang.name} <span className="text-gradient">AI Roadmap</span></h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem' }}>Your custom path from fundamental theory to professional execution.</p>
            </div>
            <RoadmapView lang={selectedLang} onSetPlan={() => setStep('ssp_input')} />
          </motion.div>
        )}

        {(step === 'ssp_input' || step === 'ssp_display' || step === 'ssp_done') && (
          <motion.div key="ssp" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            {step !== 'ssp_done' && (
              <button 
                onClick={() => setStep(step === 'ssp_display' ? 'ssp_input' : 'roadmap')} 
                style={{ color: '#a855f7', marginBottom: '32px', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ← {step === 'ssp_display' ? 'Back to Config' : 'Back to Roadmap'}
              </button>
            )}
            <SmartStudyPlanner lang={selectedLang} phase={step} setPhase={setStep} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RoadmapView = ({ lang, onSetPlan }) => {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoadmap = async () => {
      setLoading(true);
      const prompt = `Generate a programming roadmap for ${lang.name}. 
      Beginner must start with: 'What is coding?', 'High-vs-Low Level', 'Intro', 'Keywords', 'Syntax'.
      Return ONLY raw JSON: { "beginner": [...], "intermediate": [...], "advance": [...] }`;
      try {
        const resp = await generateOpenRouterResponse(prompt, "llama-3.3-70b-versatile");
        const cleanJson = resp.replace(/```json/g, '').replace(/```/g, '').trim();
        setRoadmap(JSON.parse(cleanJson));
      } catch (err) {
        setRoadmap({ beginner: ["What is coding?", "High-vs-Low Level", "Intro", "Keywords", "Syntax"], intermediate: ["Loops", "Functions"], advance: ["Architecture"] });
      } finally { setLoading(false); }
    };
    fetchRoadmap();
  }, [lang]);

  if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Zap size={60} color="#a855f7" className="pulse" /><h2 style={{ marginTop: '24px', fontWeight: 900 }}>AI is mapping the path...</h2></div>;

  const levels = [{ t: 'Beginner', c: '#a855f7', i: Compass, data: roadmap.beginner }, { t: 'Intermediate', c: '#3b82f6', i: Zap, data: roadmap.intermediate }, { t: 'Advance', c: '#f59e0b', i: Star, data: roadmap.advance }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '20px', top: '40px', bottom: '120px', width: '2px', background: 'linear-gradient(to bottom, #a855f7, #3b82f6, #f59e0b)', opacity: 0.1 }} />
        {levels.map((lvl, idx) => (
            <div key={idx} style={{ position: 'relative', paddingLeft: '60px' }}>
                <div style={{ position: 'absolute', left: '0', top: '0', width: '42px', height: '42px', borderRadius: '50%', background: '#111114', border: `2px solid ${lvl.c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, boxShadow: `0 0 20px ${lvl.c}22` }}><lvl.i size={20} color={lvl.c} /></div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '24px', color: lvl.c }}>{lvl.t}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {lvl.data.map((it, i) => (
                        <div key={i} className="glass" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CheckCircle2 size={18} color="rgba(255,255,255,0.15)" /><span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{it}</span>
                        </div>
                    ))}
                </div>
                {idx === 2 && (
                    <div style={{ marginTop: '80px', textAlign: 'center' }}>
                        <button onClick={() => { localStorage.setItem('tempRoadmap', JSON.stringify(roadmap)); onSetPlan(); }} className="bg-gradient hover-lift" style={{ border: 'none', cursor: 'pointer', padding: '20px 60px', borderRadius: '24px', color: 'white', fontWeight: 900, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px', margin: '0 auto', boxShadow: '0 10px 40px rgba(168, 85, 247, 0.4)' }}>Initiate Study Planner <ArrowRight size={22} /></button>
                    </div>
                )}
            </div>
        ))}
    </div>
  );
};

const SmartStudyPlanner = ({ lang, phase, setPhase }) => {
  const [hours, setHours] = useState(2);
  const [start, setStart] = useState(new Date().toISOString().split('T')[0]);
  const [generatedPlan, setGeneratedPlan] = useState([]);

  const handleOK = () => {
    const data = JSON.parse(localStorage.getItem('tempRoadmap') || '{}');
    const flat = [
        ...(data.beginner || []).map(t => ({ topic: t, level: 'Beginner' })),
        ...(data.intermediate || []).map(t => ({ topic: t, level: 'Intermediate' })),
        ...(data.advance || []).map(t => ({ topic: t, level: 'Advance' }))
    ].map((it, i) => ({ ...it, id: i + 1, status: 'pending', date: 'Schedule Active' }));
    setGeneratedPlan(flat);
    setPhase('ssp_display');
  };

  const handleFinalize = () => {
    localStorage.setItem('studyPlan', JSON.stringify(generatedPlan.map(it => ({ ...it, hoursPerDay: hours, startDate: start }))));
    setPhase('ssp_done');
  };

  return (
    <div className="glass-card" style={{ maxWidth: '750px', margin: '0 auto', textAlign: 'center', padding: '60px', background: '#111114' }}>
      {phase === 'ssp_input' && (
        <div style={{ textAlign: 'left' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '32px' }}><Clock size={40} /></div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '12px' }}>Smart Study <span className="text-gradient">Planner</span></h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '48px', fontSize: '1.1rem' }}>Configure your learning velocity for {lang.name}.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', marginBottom: '48px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', color: '#a855f7', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Daily study hours</label>
              <input type="range" min="1" max="10" value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: '100%', accentColor: '#a855f7' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontWeight: 900, fontSize: '1.1rem' }}><span>{hours} Hours / Day</span><span>Est. {Math.round(80/hours)} Days</span></div>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 800, fontSize: '0.8rem', color: '#3b82f6', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '1px' }}>Starting day</label>
              <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="search-box" style={{ width: '100%', paddingLeft: '16px', fontWeight: 700, fontSize: '1.1rem' }} />
            </div>
          </div>
          <button onClick={handleOK} className="bg-gradient hover-lift" style={{ border: 'none', cursor: 'pointer', width: '100%', padding: '24px', borderRadius: '24px', color: 'white', fontWeight: 900, fontSize: '1.25rem' }}>OK</button>
        </div>
      )}

      {phase === 'ssp_display' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'left' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px' }}>Full Study <span className="text-gradient">Plan</span></h2>
          <p style={{ opacity: 0.5, marginBottom: '32px', fontSize: '1.1rem' }}>Review your comprehensive curriculum for {lang.name}.</p>
          <div style={{ maxHeight: '420px', overflowY: 'auto', background: 'rgba(0,0,0,0.5)', borderRadius: '24px', padding: '12px' }}>
            {generatedPlan.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: it.level === 'Beginner' ? '#a855f7' : it.level === 'Intermediate' ? '#3b82f6' : '#f59e0b' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)' }}>{it.topic}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.7rem', padding: '6px 12px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.1)', color: '#c084fc', fontWeight: 700 }}>{it.level}</span>
                </div>
            ))}
          </div>
          <button onClick={handleFinalize} className="bg-gradient hover-lift" style={{ border: 'none', cursor: 'pointer', width: '100%', padding: '24px', borderRadius: '24px', color: 'white', fontWeight: 900, fontSize: '1.25rem', marginTop: '40px', boxShadow: '0 10px 40px rgba(168, 85, 247, 0.4)' }}>Finalize Plan</button>
        </motion.div>
      )}

      {phase === 'ssp_done' && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle2 size={100} color="#22c55e" style={{ margin: '0 auto 32px' }} />
          <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '16px' }}>Setup <span style={{ color: '#22c55e' }}>Complete</span></h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.15rem', marginBottom: '48px', lineHeight: '1.6' }}>Your study voyage is mapped and synchronized. <br/> Redirecting to your bridge (Dashboard)...</p>
          <button onClick={() => window.location.href='/dashboard'} className="bg-gradient hover-lift" style={{ border: 'none', cursor: 'pointer', width: '100%', padding: '24px', borderRadius: '24px', color: 'white', fontWeight: 900, fontSize: '1.25rem' }}>Go to Dashboard</button>
        </motion.div>
      )}
    </div>
  );
};

export default Courses;
