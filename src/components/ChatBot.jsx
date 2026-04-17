import React, { useState } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Maximize2, 
  Sparkles,
  User,
  Bot,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateOllamaResponse } from '../utils/ollama';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello Thilak! I'm your AI Menter. How can I help you master coding today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    
    try {
      // Primary: deepseek-coder:1.3b
      const response = await generateOllamaResponse(currentInput, "deepseek-coder:1.3b");
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (err) {
      console.warn("Primary Chat model failed, falling back to Llama3 8B:", err);
      try {
        const response = await generateOllamaResponse(currentInput, "llama3:latest");
        setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting to my local models. Please ensure Ollama is running with 'deepseek-coder:1.3b' or 'llama3:latest'." }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-gradient float"
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          boxShadow: '0 10px 30px var(--primary-glow)',
          zIndex: 1000
        }}
      >
        <MessageSquare size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="glass"
            style={{
              position: 'fixed',
              bottom: '100px',
              right: '30px',
              width: '400px',
              height: '550px',
              borderRadius: '24px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              zIndex: 1000,
              overflow: 'hidden',
              border: '1px solid var(--border-glow)'
            }}
          >
            {/* Header */}
            <div className="bg-gradient" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white' }}>
                 <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={18} />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Menter AI</h3>
                    <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>Online • Ready to code</p>
                 </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', color: 'white' }}>
                 <button style={{ padding: '4px' }}><Maximize2 size={16} /></button>
                 <button onClick={() => setIsOpen(false)} style={{ padding: '4px' }}><X size={16} /></button>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  gap: '10px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}>
                  <div style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    background: msg.role === 'user' ? 'var(--secondary)' : 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="white" />}
                  </div>
                  <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: '16px',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    background: msg.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    color: 'white',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-color)',
                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                    borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px'
                  }} className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ position: 'relative' }}>
                <input 
                   disabled={isLoading}
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isLoading ? "AI is thinking..." : "Ask anything about coding..."}
                  style={{
                    width: '100%',
                    padding: '12px 50px 12px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-color)',
                    color: 'white',
                    outline: 'none',
                    fontSize: '0.875rem',
                    opacity: isLoading ? 0.6 : 1
                  }}
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading}
                  style={{ 
                    position: 'absolute', 
                    right: '6px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
