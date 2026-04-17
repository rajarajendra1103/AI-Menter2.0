import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Fira Code',
  flowchart: {
    htmlLabels: true,
    curve: 'basis'
  }
});

const MermaidChart = ({ chartCode }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chartCode) {
      // Clear previous content
      ref.current.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; opacity: 0.5;">Rendering Flowchart...</div>';
      
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      
      // Clean up chart code
      let cleanCode = chartCode
        .replace(/```mermaid/g, '')
        .replace(/```/g, '')
        .trim();

      // Step 1: Replace all internal double quotes with single quotes to prevent nesting conflicts
      // We do this globally first because Mermaid node labels should be wrapped in " anyway.
      cleanCode = cleanCode.replace(/"/g, "'");

      // Step 2: Wrap all node labels in double quotes to handle special characters (brackets, etc.)
      const lines = cleanCode.split('\n');
      const fixedLines = lines.map(line => {
        // ID[Label], ID{Label}, ID(Label), etc.
        // We match ID + Opening Bracket + Content + Closing Bracket
        // The closing bracket must be followed by a link (-->), end of line, or another structural element.
        return line.replace(/(\w+)(\[|\[\[|\[\/|\[\\|\(|\(\(|\(\[|\{)(.+?)(?=\]|\]\]|\/\]|\\\]|\)|\)\)|\)\]|\})(?:\]|\]\]|\/\]|\\\]|\)|\)\)|\)\]|\})(?=\s*(?:$|-->|-.->|==>|\||;))/g, (match, nodeId, open, label) => {
          const close = match.slice(nodeId.length + open.length + label.length);
          return `${nodeId}${open}"${label.trim()}"${close}`;
        });
      });
      
      cleanCode = fixedLines.join('\n');

      // Ensure graph TD or similar header exists if AI forgot it
      if (!cleanCode.startsWith('graph ') && !cleanCode.startsWith('flowchart ')) {
        cleanCode = 'graph TD\n' + cleanCode;
      }

      mermaid.render(id, cleanCode).then(({ svg }) => {
        if (ref.current) {
          ref.current.innerHTML = svg;
          // Apply some styling to the generated SVG for better fit
          const svgElement = ref.current.querySelector('svg');
          if (svgElement) {
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
          }
        }
      }).catch(err => {
        console.error("Mermaid Render Error:", err);
        if (ref.current) {
          ref.current.innerHTML = `
            <div style="color: #fca5a5; font-size: 0.8rem; padding: 20px; text-align: center; background: rgba(239, 68, 68, 0.05); border-radius: 12px; border: 1px dashed rgba(248, 113, 113, 0.2);">
              <p style="font-weight: 700; margin-bottom: 8px;">Flowchart Render Error</p>
              <p style="opacity: 0.7; font-size: 0.75rem;">The logic is too complex or contains invalid syntax.</p>
            </div>
          `;
        }
      });
    }
  }, [chartCode]);

  return <div ref={ref} className="mermaid-viz" style={{ minHeight: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} />;
};

export default MermaidChart;
