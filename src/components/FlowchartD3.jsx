import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const FlowchartD3 = ({ data }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 500 });
  const [draggedNode, setDraggedNode] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width || 800, h: entry.contentRect.height || 500 });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!data || !data.nodes || !data.links || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = dims.w;
    const height = dims.h;

    // Deep copy data to avoid D3 mutating the original props
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(60));

    // Defs for arrows and drop shadows
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'fc-arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28) // Offset to not overlap node boxes
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#818cf8');

    // Zoom layer
    const g = svg.append('g');
    svg.call(d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (e) => g.attr('transform', e.transform))
    ).on("dblclick.zoom", null);

    // Draw Links
    const linkGroup = g.append('g').selectAll('.link')
      .data(links)
      .join('g')
      .attr('class', 'link-group');

    const linkPath = linkGroup.append('line')
      .attr('stroke', '#4f46e5')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#fc-arrow)');

    const linkLabels = linkGroup.filter(d => d.label).append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#c7d2fe')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('dy', -5)
      .text(d => d.label);

    // Draw Nodes
    const nodeGroup = g.append('g').selectAll('.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', (e, d) => {
          if (!e.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
          setDraggedNode(d.label);
        })
        .on('drag', (e, d) => {
          d.fx = e.x; d.fy = e.y;
        })
        .on('end', (e, d) => {
          if (!e.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
          setDraggedNode(null);
        }));

    // Soft glassmorphism boxes based on type or just beautiful styling
    nodeGroup.append('rect')
      .attr('width', 120)
      .attr('height', 40)
      .attr('x', -60)
      .attr('y', -20)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', d => d.type === 'condition' ? 'rgba(219, 39, 119, 0.2)' : 'rgba(79, 70, 229, 0.2)')
      .attr('stroke', d => d.type === 'condition' ? '#ec4899' : '#818cf8')
      .attr('stroke-width', 1.5)
      .style('backdrop-filter', 'blur(10px)');

    // Text labels inside nodes
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => d.label?.length > 18 ? d.label.substring(0, 16) + '...' : d.label);
    
    // Subtext for meta info if exists
    nodeGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 14)
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .text(d => d.type ? d.type.toUpperCase() : '');

    // Physics ticks
    simulation.on('tick', () => {
      linkPath
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
      linkLabels
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);

      nodeGroup.attr('transform', (d) => `translate(${d.x},${d.y})`);
    });

  }, [data, dims]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column' }} ref={containerRef}>
      {(!data || !data.nodes || data.nodes.length === 0) ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
          No D3 mapped data available.
        </div>
      ) : (
        <svg ref={svgRef} width="100%" height="100%" style={{ cursor: 'grab', background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }} />
      )}
      {draggedNode && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, color: '#a855f7', fontSize: '11px', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px' }}>
          Dragging: {draggedNode}
        </div>
      )}
    </div>
  );
};

export default FlowchartD3;
