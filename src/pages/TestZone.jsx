import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Lightbulb, 
  Timer, 
  CheckSquare, 
  Code, 
  FileCheck,
  Trophy,
  ArrowRight,
  Zap,
  Target,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOpenRouterResponse } from '../utils/openrouter';
import { Loader2 } from 'lucide-react';

const TestZone = () => {
  const [activeTest, setActiveTest] = useState(null); // null, 'quick', 'topic', 'mock'
  
  const testTypes = [
    {
      id: 'quick',
      title: 'Quick Quizzes',
      icon: <Zap size={24} color="#facc15" />,
      desc: '10 Questions based on your latest study.',
      format: 'MCQs + Fill-in code commands',
      unlocked: true
    },
    {
      id: 'topic',
      title: 'Topic-wise Tests',
      icon: <Target size={24} color="var(--secondary)" />,
      desc: '20 Questions covering a complete module.',
      format: 'MCQs + Logical programming',
      unlocked: true
    },
    {
      id: 'mock',
      title: 'Full-length Mocks',
      icon: <Trophy size={24} color="var(--accent)" />,
      desc: 'Course completion finals with coding tasks.',
      format: 'MCQs + Write & Execute code',
      unlocked: false
    }
  ];

  if (activeTest) {
    return <TestInterface testId={activeTest} onExit={() => setActiveTest(null)} />;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '12px' }}>
          Test <span className="text-gradient">Zone</span>
        </h1>
        <p style={{ color: 'var(--text-dim)' }}>Validate your mastery through adaptive assessments.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {testTypes.map((test) => (
          <div key={test.id} className="glass-card" style={{ opacity: test.unlocked ? 1 : 0.6 }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: '14px', 
              background: 'rgba(255,255,255,0.05)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              {test.icon}
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{test.title}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '20px', minHeight: '3em' }}>{test.desc}</p>
            
            <div className="glass" style={{ padding: '12px', borderRadius: '10px', marginBottom: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
               <span style={{ fontWeight: 600, display: 'block', marginBottom: '4px', color: 'var(--primary)' }}>FORMAT</span>
               {test.format}
            </div>
            
            <button 
              disabled={!test.unlocked}
              onClick={() => setActiveTest(test.id)}
              className={test.unlocked ? 'bg-gradient hover-lift' : 'glass'}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                color: test.unlocked ? 'white' : 'var(--text-dim)',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {test.unlocked ? 'Start Test' : 'Locked (Complete Course)'} {test.unlocked && <ArrowRight size={18} />}
            </button>
          </div>
        ))}
      </div>

      <div className="glass-card">
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Performance Metrics</h3>
            <button style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>Export Stats</button>
         </div>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <MetricCard label="Global Rank" value="#4,281" color="var(--primary)" />
            <MetricCard label="Avg Score" value="88%" color="var(--secondary)" />
            <MetricCard label="Tests Taken" value="24" color="var(--accent)" />
            <MetricCard label="Best Streak" value="7 Days" color="#22c55e" />
         </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, color }) => (
  <div className="glass" style={{ padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
     <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>{label}</p>
     <p style={{ fontSize: '1.5rem', fontWeight: 800, color: color }}>{value}</p>
  </div>
);

const TestInterface = ({ testId, onExit }) => {
  const [questions, setQuestions] = useState([
    {
      q: "What is the correct syntax to output 'Hello World' in Python?",
      options: ["print('Hello World')", "echo('Hello World')", "console.log('Hello World')", "System.out.println('Hello World')"],
      ans: 0
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);

  React.useEffect(() => {
    const generateQuestions = async () => {
      try {
        const prompt = `Generate 5 high-quality coding MCQs for ${testId === 'quick' ? 'Core Python & JS' : 'Data Structures'}. 
        Format as JSON array of objects: { "q": string, "options": [string, string, string, string], "ans": number (0-3) }`;
        const response = await generateOpenRouterResponse(prompt, "llama-3.3-70b-versatile");
        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
           setQuestions(JSON.parse(match[0]));
        }
      } catch (e) {
        console.error("AI Quest Gen failed", e);
      } finally {
        setLoading(false);
      }
    };
    generateQuestions();
  }, [testId]);

  if (loading) return (
    <div className="glass-card" style={{ textAlign: 'center', padding: '100px' }}>
       <Loader2 size={48} className="animate-spin" color="var(--primary)" />
       <p style={{ marginTop: '20px', color: 'var(--text-dim)' }}>AI is curating your exam questions...</p>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card" 
      style={{ maxWidth: '800px', margin: '0 auto', minHeight: '500px', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Timer size={18} color="var(--text-muted)" />
            <span style={{ fontWeight: 600 }}>14:52 Remaining</span>
         </div>
         <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Question {qIdx + 1} of 10</span>
         <button onClick={onExit} style={{ color: 'var(--accent)', fontWeight: 600 }}>Exit Test</button>
      </div>

      <div style={{ flex: 1, padding: '40px 30px' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>{questions[qIdx].q}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions[qIdx].options.map((opt, i) => (
            <button 
              key={i}
              onClick={() => setSelected(i)}
              className="glass hover-lift"
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '16px',
                textAlign: 'left',
                border: selected === i ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                background: selected === i ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                fontSize: '1rem',
                color: selected === i ? 'white' : 'var(--text-muted)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ 
                   width: '24px', 
                   height: '24px', 
                   borderRadius: '50%', 
                   border: '2px solid currentColor',
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center',
                   fontSize: '0.75rem'
                 }}>
                   {i === 0 ? 'A' : i === 1 ? 'B' : i === 2 ? 'C' : 'D'}
                 </div>
                 {opt}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '30px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid var(--border-color)' }}>
         <button className="glass" style={{ padding: '12px 24px', borderRadius: '10px' }}>Skip</button>
         <button 
           className="bg-gradient hover-lift" 
           style={{ padding: '12px 32px', borderRadius: '10px', color: 'white', fontWeight: 600 }}
           onClick={() => {
             if (qIdx < questions.length - 1) {
               setQIdx(qIdx + 1);
               setSelected(null);
             } else {
               onExit();
             }
           }}
         >
           Save & Next
         </button>
      </div>
    </motion.div>
  );
};

export default TestZone;
