
import React, { useState, useEffect } from 'react';
import { supabase, isConfigured } from './lib/supabase';
import Auth from './components/Auth';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import AttendanceManager from './components/AttendanceManager';
import Reports from './components/Reports';
import { Loader2, AlertTriangle, ExternalLink } from 'lucide-react';

export type Tab = 'dashboard' | 'employees' | 'attendance' | 'reports';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

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
          <p className="text-gray-600 mb-8">Supabase variables are missing.</p>
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
      case 'reports':
        return <Reports />;
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
