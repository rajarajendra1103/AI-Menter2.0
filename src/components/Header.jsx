import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  Search, 
  User, 
  Settings,
  Palette,
  LayoutGrid
} from 'lucide-react';

const Header = ({ username = "Thilak", collapsed }) => {
  return (
    <header 
      className="glass"
      style={{
        height: 'var(--header-height)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'fixed',
        top: 0,
        right: 0,
        left: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        zIndex: 90,
        transition: 'var(--transition)',
        borderBottom: '1px solid var(--border-color)',
        background: 'rgba(10, 10, 12, 0.8)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        flex: 1
      }}>
        <div style={{
          position: 'relative',
          width: 'min(400px, 40%)',
          marginLeft: '12px'
        }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: 'var(--text-dim)' 
          }} />
          <input 
            type="text" 
            placeholder="Search learning resources..."
            className="glass" 
            style={{
              padding: '12px 16px 12px 48px',
              borderRadius: '14px',
              width: '100%',
              fontSize: '0.875rem',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.05)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <HeaderAction icon={<Palette size={20} />} />
        
        {/* Calendar Icon links to Full Roadmap (Courses) */}
        <Link to="/courses" style={{ textDecoration: 'none' }} title="Full Roadmap">
          <HeaderAction icon={<Calendar size={20} />} active={true} />
        </Link>
        
        <HeaderAction icon={<Bell size={20} />} notification={true} />
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginLeft: '12px',
          padding: '4px 4px 4px 16px',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end'
          }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'white' }}>{username}</p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Premium Dev</p>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--secondary), var(--accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
          }}>
            <User size={20} color="white" />
          </div>
        </div>
      </div>
    </header>
  );
};

const HeaderAction = ({ icon, notification = false, active = false }) => (
  <button 
    className="glass hover-lift"
    style={{
      padding: '10px',
      borderRadius: '12px',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: active ? '#a855f7' : 'rgba(255, 255, 255, 0.4)',
      background: active ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.03)',
      border: active ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
      cursor: 'pointer'
    }}
  >
    {icon}
    {notification && (
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#a855f7',
        boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)'
      }} />
    )}
  </button>
);

export default Header;
