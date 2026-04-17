import React, { useEffect, useState } from 'react';
import CodeAnimation2D from '../components/CodeAnimation2D';
import { AlertCircle } from 'lucide-react';

const StandaloneAnimation = () => {
  const [script, setScript] = useState(() => {
    try {
      const data = localStorage.getItem('currentAnimationScript');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  });
  const [error, setError] = useState(() => {
    try {
      if (!localStorage.getItem('currentAnimationScript')) {
        return 'No animation script found. Please generate one from the Editor first.';
      }
      return null;
    } catch (err) { return 'Failed to load animation: ' + err.message; }
  });

  useEffect(() => {
    // Check if error message is needed
    if (!script && !error) {
       setError('No animation script found. Please generate one from the Editor first.');
    }
  }, [script, error]);


  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f', color: '#f87171' }}>
        <AlertCircle size={32} style={{ marginRight: '16px' }} />
        <h2 style={{ fontFamily: "'Outfit', sans-serif" }}>{error}</h2>
      </div>
    );
  }

  if (!script) return null;

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#0a0a0f', overflow: 'hidden' }}>
      <CodeAnimation2D 
        script={script} 
        isPlaying={true} 
        speed={1} 
      />
    </div>
  );
};

export default StandaloneAnimation;
