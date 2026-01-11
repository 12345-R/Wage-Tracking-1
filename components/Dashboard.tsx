
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance } from '../types';
import { DollarSign, Clock, Users, Calendar, TrendingUp, ArrowUpRight, ChevronRight } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    daily: { totalHours: 0, totalWages: 0 },
    weekly: { totalHours: 0, totalWages: 0 },
    monthly: { totalHours: 0, totalWages: 0 },
    totalEmployees: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 31);

    const [attRes, empRes] = await Promise.all([
      supabase.from('attendance')
        .select('*, employee:employees(*)')
        .gte('date', monthAgo.toISOString().split('T')[0]),
      supabase.from('employees').select('id', { count: 'exact' })
    ]);

    if (attRes.data) {
      const data = attRes.data as Attendance[];
      setAttendance(data);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];

      let dHours = 0, dWages = 0;
      let wHours = 0, wWages = 0;
      let mHours = 0, mWages = 0;

      data.forEach(record => {
        if (!record.time_out || !record.employee) return;
        const diff = new Date(record.time_out).getTime() - new Date(record.time_in).getTime();
        const hours = Math.max(0, diff / (1000 * 60 * 60));
        const wages = hours * record.employee.hourly_rate;

        if (record.date === todayStr) { dHours += hours; dWages += wages; }
        if (record.date >= weekStr) { wHours += hours; wWages += wages; }
        mHours += hours; mWages += wages;
      });

      setStats({
        daily: { totalHours: dHours, totalWages: dWages },
        weekly: { totalHours: wHours, totalWages: wWages },
        monthly: { totalHours: mHours, totalWages: mWages },
        totalEmployees: empRes.count || 0
      });
    }
    setLoading(false);
  };

  const MainStat = ({ title, wages, hours, gradient, icon: Icon }: any) => (
    <div className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl ${gradient} transition-transform hover:scale-[1.02]`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
            <Icon className="w-6 h-6" />
          </div>
          <ArrowUpRight className="w-5 h-5 opacity-50" />
        </div>
        <div className="mt-8">
          <p className="text-white/80 text-sm font-medium uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-bold mt-1">${wages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-1 mt-2 text-white/70 text-sm">
            <Clock className="w-4 h-4" />
            <span>{hours.toFixed(1)} Total Hours</span>
          </div>
        </div>
      </div>
      {/* Abstract Background Element */}
      <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Executive Summary</h1>
          <p className="text-gray-500 font-medium">Overview of wages and productivity metrics.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
           <div className="flex -space-x-2">
             {[1,2,3].map(i => (
               <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">U{i}</div>
             ))}
           </div>
           <div className="text-sm font-semibold pr-4">
             {stats.totalEmployees} Team Members
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MainStat 
          title="Daily Payroll" 
          wages={stats.daily.totalWages} 
          hours={stats.daily.totalHours} 
          gradient="bg-gradient-to-br from-orange-400 to-rose-500" 
          icon={Calendar} 
        />
        <MainStat 
          title="Weekly Volume" 
          wages={stats.weekly.totalWages} 
          hours={stats.weekly.totalHours} 
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600" 
          icon={TrendingUp} 
        />
        <MainStat 
          title="Monthly Outlook" 
          wages={stats.monthly.totalWages} 
          hours={stats.monthly.totalHours} 
          gradient="bg-gradient-to-br from-emerald-400 to-teal-600" 
          icon={DollarSign} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-gray-900">Top Earners</h2>
            <button className="text-blue-600 text-sm font-bold flex items-center hover:underline">View All <ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="space-y-6">
            {attendance.length === 0 ? (
               <div className="text-center py-10 text-gray-400">No shift data found</div>
            ) : (
              Object.values(
                attendance.reduce((acc: any, curr) => {
                  if (!curr.employee) return acc;
                  const id = curr.employee_id;
                  if (!acc[id]) acc[id] = { name: curr.employee.name, hours: 0, wages: 0 };
                  const diff = curr.time_out ? (new Date(curr.time_out).getTime() - new Date(curr.time_in).getTime()) : 0;
                  const hrs = Math.max(0, diff / (1000 * 60 * 60));
                  acc[id].hours += hrs;
                  acc[id].wages += hrs * curr.employee.hourly_rate;
                  return acc;
                }, {})
              ).sort((a: any, b: any) => b.wages - a.wages).slice(0, 4).map((e: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center font-bold text-gray-400 border border-gray-100">
                    {e.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{e.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{e.hours.toFixed(1)}h logged</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-gray-900">${e.wages.toFixed(2)}</div>
                    <div className="w-24 h-1.5 bg-gray-50 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-blue-500" style={{width: `${Math.min(100, (e.wages / stats.monthly.totalWages) * 100)}%`}}></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h2>
          <div className="space-y-4 flex-1">
            {attendance.slice(0, 6).map((record, i) => (
              <div key={i} className="flex items-start gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${record.time_out ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-orange-500 shadow-sm shadow-orange-200 animate-pulse'}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-gray-900">{record.employee?.name}</p>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(record.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {record.time_out 
                      ? `Completed shift: ${new Date(record.time_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - ${new Date(record.time_out).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}` 
                      : `Currently clocked in since ${new Date(record.time_in).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}
                  </p>
                </div>
              </div>
            ))}
            {attendance.length === 0 && <p className="text-gray-400 text-center py-10">No recent logs</p>}
          </div>
          <button className="mt-6 w-full py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-colors">View All Logs</button>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
