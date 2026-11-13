import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { NewSubjectPage } from './pages/NewSubjectPage';
import { SubjectDetailPage } from './pages/SubjectDetailPage';
import { TopicWorkspacePage } from './pages/TopicWorkspacePage';
import { RevisionPage } from './pages/RevisionPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/subjects/new" element={<NewSubjectPage />} />
          <Route path="/subjects/:id" element={<SubjectDetailPage />} />
          
          {/* Topic Workspace Routes */}
          <Route path="/topics/:id" element={<TopicWorkspacePage />} />
          <Route path="/topics/:id/notes" element={<TopicWorkspacePage />} />
          <Route path="/topics/:id/memorize" element={<TopicWorkspacePage />} />
          <Route path="/topics/:id/practice" element={<TopicWorkspacePage />} />
          <Route path="/topics/:id/assessment" element={<TopicWorkspacePage />} />
          <Route path="/topics/:id/mcq" element={<TopicWorkspacePage />} />
          <Route path="/topics/:id/qa" element={<TopicWorkspacePage />} />

          <Route path="/revision" element={<RevisionPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
