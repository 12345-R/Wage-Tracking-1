
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
    { id: 'dashboard' as Tab, label: 'Dash', icon: LayoutDashboard },
    { id: 'employees' as Tab, label: 'Team', icon: Users },
    { id: 'attendance' as Tab, label: 'Log', icon: Clock },
    { id: 'reports' as Tab, label: 'Pay', icon: FileText },
  ];

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
          className={`flex flex-col items-center justify-center flex-1 py-2 px-1 transition-all duration-200 ${
            isActive ? 'text-white scale-110' : 'text-gray-400'
          }`}
        >
          <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
          <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
        </button>
      );
    }

    return (
      <button 
        onClick={() => {
          setActiveTab(item.id);
          setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
          isActive 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="font-bold text-sm">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 pb-20 md:pb-0">
      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-1.5 -ml-1.5 text-gray-500 hover:bg-gray-50 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Calculator className="w-5 h-5 text-blue-600" />
            <span className="font-black text-sm text-gray-900 tracking-tighter">WageTrack</span>
          </div>
        </div>
        <button onClick={onLogout} className="p-1.5 text-gray-400"><LogOut className="w-4 h-4" /></button>
      </header>

      {/* Mobile Overlay Sidebar */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 bg-white shadow-2xl flex flex-col animate-slide-in">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="w-6 h-6 text-blue-600" />
                <span className="font-black text-base tracking-tighter">WageTrack</span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-gray-300"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex-1 p-4 space-y-1.5">
              {navItems.map(item => (
                <NavButton key={item.id} item={item} />
              ))}
            </nav>
            <div className="p-4 border-t border-gray-50 bg-gray-50/30">
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Account</div>
              <div className="px-2 py-1 text-xs text-gray-600 truncate font-bold mb-3">{userName}</div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 bg-white border border-red-50 rounded-xl transition-colors text-xs font-black shadow-sm"
              >
                <LogOut className="w-4 h-4" /> SIGN OUT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-gray-50 flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg">
            <Calculator className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tighter text-gray-900">WageTrack <span className="text-blue-600">Pro</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map(item => (
            <NavButton key={item.id} item={item} />
          ))}
        </nav>

        <div className="p-5 bg-gray-50/50 border-t border-gray-50">
          <div className="mb-4 px-1">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Employer</div>
            <div className="text-xs font-bold text-gray-900 truncate">{userName}</div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-100 text-gray-600 hover:text-red-600 hover:border-red-100 py-2.5 rounded-xl transition-all shadow-sm text-xs font-black"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar - Updated to Sleek Dark Theme */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center px-1 py-1 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] rounded-t-2xl">
        {navItems.map(item => (
          <NavButton key={item.id} item={item} isMobile />
        ))}
      </nav>
    </div>
  );
};

export default Layout;
