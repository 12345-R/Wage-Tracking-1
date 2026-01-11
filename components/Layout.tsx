
import React, { useState } from 'react';
import { 
  LogOut, 
  Users, 
  Clock, 
  LayoutDashboard, 
  Calculator, 
  Menu, 
  X, 
  FileText 
} from 'lucide-react';
import { Tab } from '../App';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void;
  userName?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, onLogout, userName }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees' as Tab, label: 'Employees', icon: Users },
    { id: 'attendance' as Tab, label: 'Attendance', icon: Clock },
    { id: 'reports' as Tab, label: 'Reports', icon: FileText },
  ];

  // Fix: Explicitly typing as React.FC to handle standard React props like 'key' in list rendering
  const NavButton: React.FC<{ item: typeof navItems[0], isMobile?: boolean }> = ({ item, isMobile = false }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    
    if (isMobile) {
      return (
        <button 
          onClick={() => {
            setActiveTab(item.id);
            setIsSidebarOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-colors ${
            isActive ? 'text-blue-600' : 'text-gray-400'
          }`}
        >
          <Icon className="w-6 h-6" />
          <span className="text-[10px] font-medium mt-1 uppercase tracking-tighter">{item.label}</span>
        </button>
      );
    }

    return (
      <button 
        onClick={() => {
          setActiveTab(item.id);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          isActive 
            ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 pb-20 md:pb-0">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1">
            <Calculator className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-gray-900 tracking-tight">WageTrack</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-gray-400 hover:text-red-600"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile Overlay Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-7 h-7 text-blue-600" />
                <span className="font-bold text-lg">WageTrack</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400"><X className="w-6 h-6" /></button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map(item => (
                <NavButton key={item.id} item={item} />
              ))}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-3 px-4">Account</div>
              <div className="px-4 py-2 text-sm text-gray-600 truncate">{userName}</div>
              <button 
                onClick={onLogout}
                className="w-full mt-2 flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-gray-50 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">WageTrack <span className="text-blue-600">Pro</span></h1>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          {navItems.map(item => (
            <NavButton key={item.id} item={item} />
          ))}
        </nav>

        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <div className="mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Signed in as</div>
            <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 hover:text-red-600 hover:border-red-100 hover:bg-red-50 py-3 rounded-xl transition-all shadow-sm font-semibold"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-10 md:py-10">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-2 py-1 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map(item => (
          <NavButton key={item.id} item={item} isMobile />
        ))}
      </nav>
    </div>
  );
};

export default Layout;
