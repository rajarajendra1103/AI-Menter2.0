import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import ChatBot from '../components/ChatBot';

const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout" style={{ 
      display: 'flex', 
      minHeight: '100vh',
      background: 'var(--bg-base)',
      color: 'var(--text-main)'
    }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div 
        className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}
        style={{
          flex: 1,
          marginLeft: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
          paddingTop: 'var(--header-height)',
          transition: 'var(--transition)',
          position: 'relative'
        }}
      >
        <Header collapsed={collapsed} />
        <main className="container" style={{
          minHeight: 'calc(100vh - var(--header-height))',
          padding: '2rem 24px'
        }}>
          {children}
        </main>
        <ChatBot />
      </div>
    </div>
  );
};

export default MainLayout;
