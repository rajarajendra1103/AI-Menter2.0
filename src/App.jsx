import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import EditorPage from './pages/Editor';
import AiLearning from './pages/AiLearning';
import ResourceHub from './pages/ResourceHub';
import TestZone from './pages/TestZone';
import StandaloneAnimation from './pages/StandaloneAnimation';
import StandaloneViz from './pages/StandaloneViz';


// Placeholder pages for setup
const Settings = () => <div><h2>Settings</h2></div>;

function App() {
  return (
    <Router>
      <Routes>
        {/* Fullscreen standalone routes bypass the MainLayout */}
        <Route path="/animation" element={<StandaloneAnimation />} />
        <Route path="/standalone-viz" element={<StandaloneViz />} />
        
        {/* All other routes are wrapped in MainLayout */}

        <Route path="*" element={
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/learning" element={<AiLearning type="lesson" />} /> {/* Unified learning route */}
          <Route path="/notes" element={<AiLearning type="notes" />} />
          <Route path="/keywords" element={<AiLearning type="keywords" />} />
          <Route path="/videos" element={<ResourceHub type="videos" />} />
          <Route path="/docs" element={<ResourceHub type="docs" />} />
          <Route path="/tests" element={<TestZone />} />
          <Route path="/settings" element={<Settings />} />
          {/* Redirect old or broken learning links to the new canonical route */}
          <Route path="/ai-learning" element={<Navigate to="/learning" replace />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
