import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Download, Info } from 'lucide-react';

// ─── Color map for node types ───────────────────────────────────────────────
const COLORS = {
  function:   { fill: '#4c1d95', stroke: '#7c3aed', text: '#c4b5fd', label: 'Function' },
  loop:       { fill: '#78350f', stroke: '#d97706', text: '#fcd34d', label: 'Loop' },
  condition:  { fill: '#831843', stroke: '#db2777', text: '#fbcfe8', label: 'Branch' },
  data:       { fill: '#064e3b', stroke: '#10b981', text: '#6ee7b7', label: 'Data' },
  return:     { fill: '#1e1b4b', stroke: '#6366f1', text: '#a5b4fc', label: 'Return' },
  default:    { fill: '#1e293b', stroke: '#475569', text: '#cbd5e1', label: 'Node' },
};

const getColor = (type) => COLORS[type] || COLORS.default;

// Truncate long text for display inside nodes
const truncate = (str = '', maxLen = 20) =>
  str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;

const NODE_W = 170;
const NODE_H = 52;
const V_GAP  = 90;   // vertical gap between levels
const H_GAP  = 20;   // horizontal gap between siblings

const CallGraphD3 = ({ data }) => {
  const svgRef      = useRef(null);
  const wrapRef     = useRef(null);
  const [inspector, setInspector] = useState(null);  // hovered node
  const [dims, setDims]   = useState({ w: 900, h: 600 });

  // ── Dynamically track container size ──────────────────────────────────────
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: Math.max(width, 400), h: Math.max(height, 400) });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Main D3 render ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!data?.nodes?.length || !svgRef.current) return;

    const { w: svgW, h: svgH } = dims;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // ── 1. Build adjacency map → find root ──────────────────────────────────
    const nodeMap = new Map();
    data.nodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));

    // Build children lists
    const childSet = new Set();
    data.links.forEach(({ source, target }) => {
      const s = nodeMap.get(source);
      const t = nodeMap.get(target);
      if (s && t) {
        s.children.push(t);
        childSet.add(target);
      }
    });

    // Root = node with no incoming edges
    const candidates = data.nodes.filter(n => !childSet.has(n.id));
    const rootData   = candidates[0] || data.nodes[0];
    const root       = d3.hierarchy(nodeMap.get(rootData.id));

    // ── 2. Tree layout ───────────────────────────────────────────────────────
    const treeW = svgW - 80;
    const treeH = svgH - 80;

    const treeLayout = d3.tree()
      .nodeSize([NODE_W + H_GAP, NODE_H + V_GAP])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.8));

    treeLayout(root);

    // Re-center: shift so tree is centered in view
    let minX = Infinity, maxX = -Infinity;
    root.each(d => { minX = Math.min(minX, d.x); maxX = Math.max(maxX, d.x); });
    const treeSpan  = maxX - minX;
    const offsetX   = svgW / 2 - treeSpan / 2 - minX;
    const offsetY   = 60;

    // ── 3. SVG setup: defs, gradients, arrowhead ─────────────────────────────
    const defs = svg.append('defs');

    // Arrowhead
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    // Drop shadow filter
    const shadow = defs.append('filter').attr('id', 'shadow');
    shadow.append('feDropShadow')
      .attr('dx', 0).attr('dy', 4)
      .attr('stdDeviation', 6)
      .attr('flood-color', 'rgba(0,0,0,0.5)');

    // Per-type gradients
    Object.entries(COLORS).forEach(([type, c]) => {
      const g = defs.append('linearGradient')
        .attr('id', `cg-grad-${type}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');
      g.append('stop').attr('offset', '0%').attr('stop-color', c.stroke).attr('stop-opacity', 0.85);
      g.append('stop').attr('offset', '100%').attr('stop-color', c.fill);
    });

    // ── 4. Zoom / pan container ───────────────────────────────────────────────
    const g = svg.append('g');
    svg.call(
      d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', e => g.attr('transform', e.transform))
    ).on('dblclick.zoom', null);

    g.attr('transform', `translate(${offsetX}, ${offsetY})`);

    // ── 5. Links (curved paths like Flowchart) ────────────────────────────────
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#334155')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d =>
        d.source.data.type === 'condition' ? '6,3' : null)
      .attr('marker-end', 'url(#arrow)')
      .attr('d', d3.linkVertical()
        .x(d => d.x)
        .y(d => d.y + NODE_H / 2));   // offset so arrow starts below node

    // ── 6. Nodes ──────────────────────────────────────────────────────────────
    const nodeGroup = g.selectAll('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x - NODE_W / 2}, ${d.y})`)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setInspector(d.data))
      .on('mouseleave', ()    => setInspector(null));

    // Background card
    nodeGroup.append('rect')
      .attr('width', NODE_W)
      .attr('height', NODE_H)
      .attr('rx', 14)
      .attr('ry', 14)
      .attr('fill', d => `url(#cg-grad-${d.data.type || 'default'})`)
      .attr('stroke', d => getColor(d.data.type).stroke)
      .attr('stroke-width', 1.5)
      .style('filter', 'url(#shadow)');

    // Type badge dot
    nodeGroup.append('circle')
      .attr('cx', 16)
      .attr('cy', NODE_H / 2)
      .attr('r', 5)
      .attr('fill', d => getColor(d.data.type).stroke);

    // Main label
    nodeGroup.append('text')
      .attr('x', NODE_W / 2)
      .attr('y', NODE_H / 2 - 6)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .attr('font-family', "'JetBrains Mono', monospace")
      .text(d => truncate(d.data.label, 22));

    // Sub-label: params / condition / value
    nodeGroup.append('text')
      .attr('x', NODE_W / 2)
      .attr('y', NODE_H / 2 + 11)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', d => getColor(d.data.type).text)
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('font-family', "'JetBrains Mono', monospace")
      .text(d => {
        const m = d.data.meta || {};
        if (m.params)    return truncate(`(${m.params})`, 24);
        if (m.condition) return truncate(m.condition, 24);
        if (m.value)     return truncate(`→ ${m.value}`, 24);
        return '';
      });

  }, [data, dims]);

  // ── Download ────────────────────────────────────────────────────────────────
  const downloadImage = () => {
    const svg  = svgRef.current;
    const data = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const scale  = 2;
    canvas.width  = dims.w * scale;
    canvas.height = dims.h * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, dims.w, dims.h);
      ctx.drawImage(img, 0, 0, dims.w, dims.h);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.href     = canvas.toDataURL('image/png');
      a.download = `call-tree-${Date.now()}.png`;
      a.click();
    };
    img.src = url;
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '500px',
        background: 'rgba(2,8,23,0.85)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}
    >
      {/* ── SVG canvas ── */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{ display: 'block' }}
      />

      {/* ── Top-right: Save button ── */}
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 20 }}>
        <button
          onClick={downloadImage}
          style={{
            padding: '8px 14px',
            background: 'rgba(99,102,241,0.18)',
            border: '1px solid rgba(99,102,241,0.35)',
            borderRadius: '10px',
            color: '#a5b4fc',
            fontWeight: 600,
            fontSize: '0.8rem',
            display: 'flex', alignItems: 'center', gap: '7px',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Download size={14} /> Save as Image
        </button>
      </div>

      {/* ── Top-left: Legend ── */}
      <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
          <Info size={13} /> Hover a node to inspect • Scroll to zoom • Drag to pan
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
          {Object.entries(COLORS).filter(([k]) => k !== 'default').map(([type, c]) => (
            <span key={type} style={{ fontSize: '0.7rem', color: c.stroke, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.stroke, display: 'inline-block' }} />
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Bottom-left: Node Inspector Panel (on hover) ── */}
      {inspector && (
        <div
          style={{
            position: 'absolute', bottom: 20, left: 20, zIndex: 50,
            width: 280,
            padding: '16px 18px',
            background: 'rgba(2,8,23,0.97)',
            border: `1px solid ${getColor(inspector.type).stroke}44`,
            borderRadius: '16px',
            boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 0 1px ${getColor(inspector.type).stroke}22`,
            backdropFilter: 'blur(16px)',
            animation: 'fadeInUp 0.15s ease',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: getColor(inspector.type).stroke, flexShrink: 0 }} />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>{inspector.label}</span>
            <span style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              background: `${getColor(inspector.type).stroke}22`,
              border: `1px solid ${getColor(inspector.type).stroke}44`,
              borderRadius: '20px',
              fontSize: '0.68rem',
              color: getColor(inspector.type).text,
              fontWeight: 600,
              textTransform: 'uppercase',
            }}>
              {inspector.type || 'node'}
            </span>
          </div>

          {/* Details */}
          <div style={{ fontSize: '0.78rem', lineHeight: 1.7, color: '#94a3b8' }}>
            {inspector.meta?.params && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#64748b', minWidth: 80 }}>Parameters</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{inspector.meta.params}</span>
              </div>
            )}
            {inspector.meta?.condition && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#64748b', minWidth: 80 }}>Condition</span>
                <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{inspector.meta.condition}</span>
              </div>
            )}
            {inspector.meta?.value && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ color: '#64748b', minWidth: 80 }}>Return</span>
                <span style={{ color: '#6ee7b7', fontFamily: 'monospace' }}>{inspector.meta.value}</span>
              </div>
            )}
            {inspector.meta?.variables && Object.keys(inspector.meta.variables).length > 0 && (
              <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Local Variables</div>
                {Object.entries(inspector.meta.variables).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '2px 0' }}>
                    <span style={{ color: '#818cf8' }}>{k}</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CallGraphD3;
