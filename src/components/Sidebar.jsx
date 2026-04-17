import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  StickyNote, 
  Key, 
  PlaySquare, 
  FileText, 
  BrainCircuit, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Code
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
    { name: 'Courses', icon: <BookOpen size={20} />, path: '/courses' },
    { name: 'Editor', icon: <Code size={20} />, path: '/editor' },
    { 
      type: 'group', 
      label: 'AI NOTES', 
      items: [
        { name: 'Notes', icon: <StickyNote size={20} />, path: '/notes' },
        { name: 'Keywords', icon: <Key size={20} />, path: '/keywords' }
      ]
    },
    { 
      type: 'group', 
      label: 'RESOURCE HUB', 
      items: [
        { name: 'Videos', icon: <PlaySquare size={20} />, path: '/videos' },
        { name: 'Docs', icon: <FileText size={20} />, path: '/docs' }
      ]
    },
    { name: 'Test Zone', icon: <BrainCircuit size={20} />, path: '/tests' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' }
  ];

  return (
    <aside 
      className={`glass sidebar ${collapsed ? 'collapsed' : ''}`}
      style={{
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        transition: 'var(--transition)',
        zIndex: 100,
        padding: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border-color)'
      }}
    >
      <div style={{
        padding: '0 24px',
        marginBottom: '40px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <img 
            src="/src/assets/ChatGPT Image Apr 17, 2026, 06_24_54 PM.png" 
            alt="Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
        {!collapsed && (
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: 800, 
            letterSpacing: '1px',
            fontFamily: 'Outfit'
          }}>
            AI <span style={{ color: 'var(--primary)' }}>MENTER</span>
          </h1>
        )}
      </div>

      <nav style={{ flex: 1, padding: '0 16px' }}>
        {menuItems.map((item, idx) => {
          if (item.type === 'group') {
            return (
              <div key={idx} style={{ marginBottom: '24px' }}>
                {!collapsed && (
                  <p style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: 'var(--text-dim)',
                    marginBottom: '12px',
                    paddingLeft: '12px'
                  }}>
                    {item.label}
                  </p>
                )}
                {item.items.map((sub, sIdx) => (
                  <NavItem key={sIdx} item={sub} collapsed={collapsed} />
                ))}
              </div>
            );
          }
          return <NavItem key={idx} item={item} collapsed={collapsed} />;
        })}
      </nav>

      <button 
        onClick={() => setCollapsed(!collapsed)}
        style={{
          margin: '0 16px',
          padding: '12px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          background: 'rgba(255, 255, 255, 0.05)',
          color: 'var(--text-muted)'
        }}
        className="hover-lift"
      >
        {!collapsed && <span style={{ fontSize: '0.875rem' }}>Collapse</span>}
        {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>
    </aside>
  );
};

const NavItem = ({ item, collapsed }) => (
  <NavLink 
    to={item.path}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px',
      borderRadius: '12px',
      marginBottom: '4px',
      color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
      background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
      border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
      justifyContent: collapsed ? 'center' : 'flex-start',
      position: 'relative',
      overflow: 'hidden'
    })}
    className="hover-lift"
  >
    <div style={{ color: 'inherit' }}>{item.icon}</div>
    {!collapsed && (
      <span style={{ fontSize: '0.925rem', fontWeight: 500 }}>{item.name}</span>
    )}
  </NavLink>
);

export default Sidebar;
