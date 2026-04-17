import React from 'react';
import { 
  Play, 
  CheckCircle, 
  Clock, 
  Trophy, 
  BookOpen, 
  TrendingUp,
  ArrowRight,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard = () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const progressCards = [
    { title: 'Python Mastery', level: 'Intermediate', total: 42, completed: 28, score: 85, color: '#6366f1' },
    { title: 'DSA with Java', level: 'Beginner', total: 60, completed: 12, score: 92, color: '#a855f7' }
  ];

  const currentLessons = [
    { name: "Variables & Data Types", status: 'in-progress', time: '15 min read', icon: <Play size={16} /> },
    { name: "Writing your first script", status: 'completed', time: 'Completed', icon: <CheckCircle size={16} /> },
    { name: "Introduction to Python", status: 'completed', time: 'Completed', icon: <CheckCircle size={16} /> }
  ];


  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ padding: '1rem 0' }}
    >
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>
          Welcome back, <span className="text-gradient">Thilak</span>
        </h2>
        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> {dateStr}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} /> {timeStr}
          </div>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', 
        gap: '24px',
        marginBottom: '40px' 
      }}>
        {/* Main Progress Card */}
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                 <div style={{ 
                    width: '56px', height: '56px', borderRadius: '16px', 
                    background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                 }}>
                    <BookOpen size={28} color="var(--primary)" />
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>DSA with Python</h3>
                    <span style={{ 
                       fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px', 
                       borderRadius: '6px', background: 'var(--primary)', color: 'white' 
                    }}>
                       INTERMEDIATE
                    </span>
                 </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
                 <StatsBox label="LESSONS" value="24/48" />
                 <StatsBox label="XP GAINED" value="760" />
                 <StatsBox label="TESTS" value="12" />
              </div>

              <div>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>Overall Progress</span>
                    <span style={{ color: 'var(--text-muted)' }}>50%</span>
                 </div>
                 <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', overflow: 'hidden' }}>
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '50%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '20px' }}
                    />
                 </div>
              </div>
           </div>
        </div>

        {/* Performance Metrics */}
        <div className="glass-card">
           <h3 style={{ fontSize: '1.25rem', marginBottom: '32px' }}>Performance Metrics</h3>
           <div style={{ display: 'flex', justifyContent: 'space-around', gap: '16px' }}>
              <Gauge label="QUIZ SCORE" value={82} color="var(--primary)" />
              <Gauge label="LOGIC SCORE" value={65} color="var(--secondary)" />
              <Gauge label="CONSISTENCY" value={94} color="var(--accent)" />
           </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
         <h3 style={{ fontSize: '1.5rem', marginBottom: '32px' }}>Daily Learning Path</h3>
         <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ 
               position: 'absolute', left: '27px', top: '10px', bottom: '10px', 
               width: '2px', background: 'rgba(255,255,255,0.1)' 
            }} />
            
            <PathItem 
               title="Linked Lists Foundation" 
               status="completed" 
               time="Completed 2 hours ago" 
               icon={<CheckCircle size={18} />} 
            />
            <PathItem 
               title="Visualizing Pointer Swaps" 
               status="completed" 
               time="Completed 30 mins ago" 
               icon={<CheckCircle size={18} />} 
            />
            <PathItem 
               title="Doubly Linked List Implementation" 
               status="active" 
               time="Next topic in your smart plan" 
               icon={<Play size={18} />} 
            />
         </div>
      </div>

      <footer style={{ 
        padding: '24px 0', 
        borderTop: '1px solid var(--border-color)', 
        color: 'var(--text-dim)', 
        fontSize: '0.875rem',
        display: 'flex',
        justifyContent: 'center',
        marginTop: '60px'
      }}>
        © 2026 AIMenter
      </footer>
    </motion.div>
  );
};

const StatsBox = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{value}</span>
    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>{label}</span>
  </div>
);

const Gauge = ({ label, value, color }) => (
  <div style={{ textAlign: 'center' }}>
     <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 16px' }}>
        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
           <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
           <motion.path 
             initial={{ strokeDasharray: "0, 100" }}
             animate={{ strokeDasharray: `${value}, 100` }}
             transition={{ duration: 1.5, delay: 0.5 }}
             d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
             fill="none" 
             stroke={color} 
             strokeWidth="3" 
           />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{value}</span>
        </div>
     </div>
     <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</p>
  </div>
);

const PathItem = ({ title, status, time, icon }) => (
  <div style={{ 
     display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 24px', 
     borderRadius: '16px', background: status === 'active' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(255,255,255,0.02)',
     border: status === 'active' ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid transparent',
     transition: 'var(--transition)'
  }} className="hover-lift">
     <div style={{ 
        width: '56px', height: '56px', borderRadius: '50%', 
        background: status === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)',
        border: status === 'completed' ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(99, 102, 241, 0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem',
        color: status === 'completed' ? '#22c55e' : 'var(--primary)',
        zIndex: 1
     }}>
        {icon}
     </div>
     <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '1.125rem', color: status === 'active' ? 'white' : 'var(--text-muted)' }}>{title}</h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{time}</p>
     </div>
     {status === 'active' && (
        <button className="bg-gradient" style={{ 
           padding: '10px 24px', borderRadius: '10px', color: 'white', fontWeight: 700, fontSize: '0.875rem' 
        }}>
           Get Started
        </button>
     )}
  </div>
);

export default Dashboard;
