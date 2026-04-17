import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Play, Pause,
  RotateCcw, Repeat, Terminal, Variable, MemoryStick, Layers, Box, Cpu, GitBranch, RefreshCw, Activity
} from 'lucide-react';

// ─── Zone definitions ────────────────────────────────────────────────────────
const ZONES = {
  variables: { id: 'variables', label: 'VARIABLES', icon: '◈', color: '#6366f1' },
  arrays:    { id: 'arrays',    label: 'ARRAYS / DATA', icon: '▦', color: '#06b6d4' },
  stack:     { id: 'stack',     label: 'CALL STACK', icon: '⬆', color: '#f59e0b' },
  heap:      { id: 'heap',      label: 'MEMORY HEAP', icon: '◉', color: '#ec4899' },
  loops:     { id: 'loops',     label: 'LOOP / CONTROL', icon: '↺', color: '#10b981' },
  output:    { id: 'output',    label: 'OUTPUT', icon: '▶', color: '#22c55e' },
};

const KIND_TO_ZONE = {
  variable_assign:   'variables',
  variable_reassign: 'variables',
  string_create:     'variables',
  string_mutate:     'variables',
  array_create:      'arrays',
  array_push:        'arrays',
  array_pop:         'arrays',
  array_index:       'arrays',
  array_update:      'arrays',
  array_slice:       'arrays',
  array_merge:       'arrays',
  tuple_create:      'arrays',
  tuple_unpack:      'arrays',
  function_call:     'stack',
  function_return:   'stack',
  loop_iteration:    'loops',
  condition_branch:  'loops',
  pointer_create:    'heap',
  pointer_null:      'heap',
  gc_mark:           'heap',
  gc_sweep:          'heap',
  output:            'output',
};

const TYPE_TO_ZONE = {
  box:         'variables',
  bead_chain:  'variables',
  shelf:       'arrays',
  glass_case:  'arrays',
  stack_frame: 'stack',
  ring:        'loops',
  fork:        'loops',
  tether:      'heap',
  cloud:       'heap',
  sphere:      'output',
};

const KIND_COLORS = {
  variable_assign:   '#6366f1',
  variable_reassign: '#818cf8',
  string_create:     '#8b5cf6',
  string_mutate:     '#7c3aed',
  array_create:      '#06b6d4',
  array_push:        '#0ea5e9',
  array_pop:         '#f97316',
  array_index:       '#06b6d4',
  array_update:      '#0891b2',
  array_slice:       '#0284c7',
  array_merge:       '#22c55e',
  tuple_create:      '#0ea5e9',
  tuple_unpack:      '#38bdf8',
  function_call:     '#f59e0b',
  function_return:   '#fbbf24',
  loop_iteration:    '#10b981',
  condition_branch:  '#f97316',
  pointer_create:    '#ec4899',
  pointer_null:      '#f43f5e',
  gc_mark:           '#6b7280',
  gc_sweep:          '#4b5563',
  output:            '#22c55e',
};

// ─── Object Renderers ────────────────────────────────────────────────────────

const ObjectCard = ({ obj, highlight }) => {
  const isArray = Array.isArray(obj.value);
  const displayValue = obj.value !== null && obj.value !== undefined ? obj.value : '';

  return (
    <div style={{
      background: highlight ? `${obj.color}33` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${highlight ? obj.color : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '8px',
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      minWidth: '120px',
      boxShadow: highlight ? `0 0 15px ${obj.color}40` : 'none',
      transition: 'all 0.3s ease',
      transform: highlight ? 'scale(1.05)' : 'scale(1)',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: obj.color, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{obj.label}</span>
        {obj.type && <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{obj.type}</span>}
      </div>
      
      {isArray ? (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {displayValue.map((val, i) => (
            <div key={i} style={{ 
              background: 'rgba(0,0,0,0.3)', 
              border: `1px solid ${obj.color}66`,
              padding: '4px 8px', borderRadius: '4px',
              color: '#fff', fontSize: '0.85rem' 
            }}>
              {val}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ 
          fontSize: '1.1rem', color: '#fff', fontWeight: 500,
          background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px',
          textAlign: 'center', minHeight: '32px'
        }}>
          {displayValue}
        </div>
      )}
    </div>
  );
};

// ─── React Component ─────────────────────────────────────────────────────────
const CodeAnimation2D = ({ script, isPlaying: isPlayingProp, speed: speedProp = 1, onStepChange }) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(isPlayingProp ?? false);
  const [speed, setSpeed] = useState(speedProp ?? 1);
  const [isRepeat, setIsRepeat] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null);

  const steps = script?.steps || [];
  const currentStep = steps[currentStepIdx] || null;
  const totalSteps = steps.length;

  const [activeObjects, setActiveObjects] = useState(new Map());

  // ── Apply step to state ──
  const applyStep = useCallback((step) => {
    if (!step) return;

    setActiveObjects(prev => {
      const next = new Map(prev);
      const ids = step.objects.map(o => o.id);

      if (step.kind === 'output') {
        next.clear();
      } else {
        const ACCUMULATE = ['function_call', 'array_create', 'array_push', 'variable_assign', 'pointer_create'];
        if (!ACCUMULATE.includes(step.kind)) {
          // Clear unrelated
          for (let id of next.keys()) {
            if (!ids.includes(id)) {
              next.delete(id);
            }
          }
        }
      }

      step.objects.forEach(obj => {
        let zoneHint = KIND_TO_ZONE[step.kind] ?? TYPE_TO_ZONE[obj.type] ?? 'variables';
        next.set(obj.id, { ...obj, zoneHint });
      });

      return next;
    });

    const zoneId = KIND_TO_ZONE[step.kind] ?? 'variables';
    setActiveZoneId(zoneId);

    onStepChange?.(step);
  }, [onStepChange]);

  useEffect(() => {
    if (currentStep) applyStep(currentStep);
  }, [currentStepIdx, applyStep, script]);

  // ── Auto playback ──
  useEffect(() => {
    if (!isPlaying) return;
    const isAtEnd = currentStepIdx >= totalSteps - 1;
    if (isAtEnd && !isRepeat) { setIsPlaying(false); return; }
    
    const timer = setTimeout(() => {
      if (isAtEnd && isRepeat) setCurrentStepIdx(0);
      else setCurrentStepIdx(i => Math.min(totalSteps - 1, i + 1));
    }, 3000 / speed);
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIdx, speed, totalSteps, isRepeat]);

  // ── Controls ──
  const handlePrev = () => setCurrentStepIdx(i => Math.max(0, i - 1));
  const handleNext = () => setCurrentStepIdx(i => Math.min(totalSteps - 1, i + 1));
  const handleReset = () => { setIsPlaying(false); setCurrentStepIdx(0); setActiveObjects(new Map()); setActiveZoneId(null); };
  const handlePlayPause = () => setIsPlaying(p => !p);

  const progress = totalSteps > 1 ? currentStepIdx / (totalSteps - 1) : 0;
  const kindColor = KIND_COLORS[currentStep?.kind] ?? '#6366f1';
  const activeZone = activeZoneId ? ZONES[activeZoneId] : null;

  // Group active objects by zone
  const objectsByZone = useMemo(() => {
    const grouped = {};
    Object.keys(ZONES).forEach(z => grouped[z] = []);
    activeObjects.forEach(obj => {
      const z = obj.zoneHint || 'variables';
      if (grouped[z]) grouped[z].push(obj);
    });
    return grouped;
  }, [activeObjects]);

  const btnStyle = (color) => ({
    color, display: 'flex', alignItems: 'center',
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#060610', borderRadius: '16px', overflow: 'hidden',
      position: 'relative', fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* Title bar */}
      <div style={{
        padding: '10px 18px',
        background: 'rgba(255,255,255,0.025)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
            {script?.title ?? '2D Runtime Visualizer'}
          </span>
          {script?.summary && (
             <p style={{ fontSize: '0.68rem', color: '#475569', marginTop: '1px', margin: 0 }}>
               {script.summary}
             </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.68rem', color: '#0ea5e9', fontWeight: 700, padding: '3px 10px', background: 'rgba(14,165,233,0.12)', borderRadius: '20px', letterSpacing: '0.05em' }}>
            HUD
          </span>
          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, padding: '3px 10px', background: 'rgba(16,185,129,0.12)', borderRadius: '20px', letterSpacing: '0.05em' }}>
            RUNTIME
          </span>
        </div>
      </div>

      {/* Main UI Area */}
      <div style={{ flex: 1, display: 'flex', gap: '16px', padding: '16px', overflow: 'auto', position: 'relative' }}>
        
        {/* Render zones as dynamic grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', width: '100%' }}>
          {Object.values(ZONES).map(zone => (
            <div key={zone.id} style={{
              background: activeZoneId === zone.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${activeZoneId === zone.id ? zone.color : 'rgba(255,255,255,0.05)'}`,
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.3s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ color: zone.color, fontSize: '1.2rem' }}>{zone.icon}</span>
                <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.05em' }}>{zone.label}</h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1 }}>
                {objectsByZone[zone.id]?.length > 0 ? (
                  objectsByZone[zone.id].map(obj => (
                    <ObjectCard 
                      key={obj.id} 
                      obj={obj} 
                      highlight={currentStep?.objects?.some(o => o.id === obj.id)} 
                    />
                  ))
                ) : (
                  <div style={{ color: '#475569', fontSize: '0.8rem', fontStyle: 'italic', margin: 'auto' }}>Empty</div>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Active zoom / overlay narration */}
      {currentStep && (
        <div style={{
          background: 'rgba(6,6,20,0.88)', backdropFilter: 'blur(14px)',
          borderTop: `1px solid ${kindColor}44`,
          padding: '12px 16px',
          display: 'flex', flexDirection: 'column', gap: '4px',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, padding: '3px 9px',
              borderRadius: '6px', background: `${kindColor}20`, color: kindColor,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {currentStep.kind.replace(/_/g, ' ')}
            </span>
            {activeZone && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '3px 9px',
                borderRadius: '6px', background: `${activeZone.color}15`, color: activeZone.color,
                letterSpacing: '0.06em',
              }}>
                {activeZone.icon} {activeZone.label}
              </span>
            )}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>
              {currentStep.label}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#475569', marginLeft: 'auto' }}>
              Line {currentStep.line}
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
            "{currentStep.narration}"
          </p>
        </div>
      )}

      {/* Controls */}
      <div style={{
        flexShrink: 0, padding: '8px 16px', background: 'rgba(6,6,20,0.97)',
        display: 'flex', flexDirection: 'column', gap: '7px', zIndex: 20,
      }}>
        <div
          style={{ position: 'relative', height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', cursor: 'pointer' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            setCurrentStepIdx(Math.round(((e.clientX - rect.left) / rect.width) * (totalSteps - 1)));
          }}
        >
          <div style={{
            height: '100%', width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
            transition: 'width 0.35s ease',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handleReset} title="Reset" style={btnStyle('#64748b')}><RotateCcw size={14} /></button>
            <button onClick={handlePrev} disabled={currentStepIdx === 0} style={btnStyle(currentStepIdx === 0 ? '#232340' : '#94a3b8')}><ChevronLeft size={20} /></button>
            <button onClick={handlePlayPause} style={{
              padding: '6px 20px', borderRadius: '20px', fontWeight: 700, fontSize: '0.78rem',
              color: '#fff', background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer',
            }}>
              {isPlaying ? <><Pause size={13} /> Pause</> : <><Play size={13} fill="currentColor" /> Play</>}
            </button>
            <button onClick={handleNext} disabled={currentStepIdx >= totalSteps - 1} style={btnStyle(currentStepIdx >= totalSteps - 1 ? '#232340' : '#94a3b8')}><ChevronRight size={20} /></button>
          </div>

          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.08)' }} />
          <button onClick={() => setIsRepeat(r => !r)} title="Loop" style={{
            padding: '5px 8px', borderRadius: '8px', color: isRepeat ? '#a855f7' : '#4b5563',
            background: isRepeat ? 'rgba(168,85,247,0.12)' : 'transparent', border: 'none', cursor: 'pointer',
          }}>
            <Repeat size={15} />
          </button>

          <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,0.04)', padding: '2px', borderRadius: '8px' }}>
            {[0.5, 1, 2, 3].map(s => (
              <button key={s} onClick={() => setSpeed(s)} style={{
                padding: '3px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700,
                color: speed === s ? '#fff' : '#64748b', background: speed === s ? '#6366f1' : 'transparent', border: 'none', cursor: 'pointer',
              }}>
                {s}x
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#475569', marginLeft: 'auto', fontWeight: 700 }}>
            {currentStepIdx + 1} <span style={{ opacity: 0.4 }}>/</span> {totalSteps}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CodeAnimation2D;
