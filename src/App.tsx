import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import DevLogin from './components/DevLogin';
import PlaceholderDashboard from './components/PlaceholderDashboard';

function MainContent() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Connecting to HostelOps...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <DevLogin />;
  }

  return <PlaceholderDashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
