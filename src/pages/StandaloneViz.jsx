import React, { useState } from 'react';
import CallGraphD3 from '../components/CallGraphD3';
import FlowchartD3 from '../components/FlowchartD3';
import MermaidChart from '../components/MermaidChart';
import { AlertCircle, Terminal, GitBranch, Share2 } from 'lucide-react';

const StandaloneViz = () => {
  const [data] = useState(() => {
    try { return JSON.parse(localStorage.getItem('currentVizData')); } catch { return null; }
  });
  const [type] = useState(() => localStorage.getItem('currentVizType') || 'flowchart');

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#f87171' }}>
        <AlertCircle size={32} style={{ marginRight: '16px' }} />
        <h2 style={{ fontFamily: "'Outfit', sans-serif" }}>No visualization data found. Generate it in Editor first.</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', height: '100vh', width: '100vw', boxSizing: 'border-box', background: '#0a0a0f', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        {type === 'flowchart' && <GitBranch size={24} color="#a855f7" />}
        {type === 'stepTrace' && <Terminal size={24} color="#3b82f6" />}
        {type === 'callGraph' && <Share2 size={24} color="#10b981" />}
        <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
          {type === 'flowchart' ? 'LOGIC FLOWCHART' : type === 'callGraph' ? 'CALL GRAPH TREE' : 'EXECUTION TRACE'}
        </h1>
      </header>

      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '24px', position: 'relative', overflow: 'auto' }}>
        {type === 'flowchart' && <MermaidChart chartCode={data.flowchart} />}
        {type === 'callGraph' && <CallGraphD3 data={data.callGraph} height={600} width={1200} />}
        {type === 'stepTrace' && (
          <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Step</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Line</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Code</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: 'rgba(255,255,255,0.5)' }}>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {data.stepTrace.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '16px' }}>{s.step}</td>
                    <td style={{ padding: '16px' }}>{s.line}</td>
                    <td style={{ padding: '16px' }}><code>{s.code}</code></td>
                    <td style={{ padding: '16px' }}>{s.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StandaloneViz;
