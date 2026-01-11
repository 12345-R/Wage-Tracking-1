
import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import AttendanceManager from './components/AttendanceManager';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

type Tab = 'dashboard' | 'employees' | 'attendance';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-orange-100">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-orange-100 rounded-full text-orange-600">
              <AlertTriangle className="w-10 h-10" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configuration Required</h2>
          <p className="text-gray-600 mb-8">
            The Supabase environment variables are missing. Please configure 
            <code className="mx-1 px-2 py-1 bg-gray-100 rounded text-sm text-red-600">NEXT_PUBLIC_SUPABASE_URL</code> 
            and 
            <code className="mx-1 px-2 py-1 bg-gray-100 rounded text-sm text-red-600">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 
            in your environment settings.
          </p>
          <div className="space-y-3">
            <a 
              href="https://supabase.com/dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Get Keys from Supabase <ExternalLink className="w-4 h-4" />
            </a>
            <p className="text-xs text-gray-400">
              Once set, refresh the page to start managing your wages.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500 font-medium">Initializing WageTrack...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'employees':
        return <EmployeeManager />;
      case 'attendance':
        return <AttendanceManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={(tab) => setActiveTab(tab as Tab)} 
      onLogout={handleLogout}
      userName={session.user.email}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
