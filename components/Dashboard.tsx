
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance } from '../types';
import { DollarSign, Clock, Users, TrendingUp, Award, PieChart, CalendarDays } from 'lucide-react';

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

  const calculateHours = (date: string, start: string, end: string | null) => {
    if (!end) return 0;
    const startTime = new Date(`${date}T${start}`);
    const endTime = new Date(`${date}T${end}`);
    let diff = endTime.getTime() - startTime.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    return Math.max(0, diff / (1000 * 60 * 60));
  };

  const fetchStats = async () => {
    setLoading(true);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [attRes, empRes] = await Promise.all([
      supabase.from('attendance')
        .select('*, employee:employees(*)')
        .gte('date', startOfMonth.toISOString().split('T')[0]),
      supabase.from('employees').select('id', { count: 'exact' })
    ]);

    if (attRes.data) {
      const data = attRes.data as Attendance[];
      setAttendance(data);

      const todayStr = now.toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];

      let dHours = 0, dWages = 0;
      let wHours = 0, wWages = 0;
      let mHours = 0, mWages = 0;

      data.forEach(record => {
        if (!record.time_out || !record.employee) return;
        const hours = calculateHours(record.date, record.time_in, record.time_out);
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      {/* Mini Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Analytics</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
            Snapshot: {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-black text-gray-900">{stats.totalEmployees} Active Staff</span>
        </div>
      </div>

      {/* Primary KPI Section - Smaller & Colored */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-200 shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-4">
            <div className="p-2.5 bg-white rounded-lg shadow-sm border border-emerald-100">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-2 py-0.5 rounded-full">Monthly Pay</span>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
              ${stats.monthly.totalWages.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-emerald-700/60 font-bold text-[11px] uppercase tracking-tight">Est. Gross Payroll Expense</p>
          </div>
        </div>

        <div className="bg-sky-50 p-6 rounded-[24px] border border-sky-200 shadow-sm group hover:shadow-md transition-all">
          <div className="flex justify-between items-center mb-4">
            <div className="p-2.5 bg-white rounded-lg shadow-sm border border-sky-100">
              <Clock className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest bg-sky-100/50 px-2 py-0.5 rounded-full">Monthly Time</span>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter">
              {stats.monthly.totalHours.toFixed(1)} <span className="text-lg text-sky-700/50">hrs</span>
            </h3>
            <p className="text-sky-700/60 font-bold text-[11px] uppercase tracking-tight">Total Work Time Tracked</p>
          </div>
        </div>
      </div>

      {/* Multi-Colored Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
             <TrendingUp className="w-3 h-3 text-violet-500" />
             <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Daily Pay</span>
          </div>
          <p className="text-lg font-black text-gray-900">${stats.daily.totalWages.toFixed(2)}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
             <Clock className="w-3 h-3 text-rose-500" />
             <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Daily Hrs</span>
          </div>
          <p className="text-lg font-black text-gray-900">{stats.daily.totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
             <PieChart className="w-3 h-3 text-amber-500" />
             <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Weekly Pay</span>
          </div>
          <p className="text-lg font-black text-gray-900">${stats.weekly.totalWages.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
             <CalendarDays className="w-3 h-3 text-indigo-500" />
             <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Weekly Hrs</span>
          </div>
          <p className="text-lg font-black text-gray-900">{stats.weekly.totalHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Top Earners - Refined & Colorful */}
      <div className="bg-white rounded-[32px] border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Top Performance Leaders</h2>
          </div>
          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Monthly Standings</div>
        </div>
        
        <div className="divide-y divide-gray-50">
          {attendance.length === 0 ? (
             <div className="p-12 text-center text-gray-400 font-bold italic text-sm">No data recorded for this month.</div>
          ) : (
            Object.values(
              attendance.reduce((acc: any, curr) => {
                if (!curr.employee) return acc;
                const id = curr.employee_id;
                if (!acc[id]) acc[id] = { name: curr.employee.name, hours: 0, wages: 0, rate: curr.employee.hourly_rate };
                const hrs = calculateHours(curr.date, curr.time_in, curr.time_out);
                acc[id].hours += hrs;
                acc[id].wages += hrs * curr.employee.hourly_rate;
                return acc;
              }, {})
            ).sort((a: any, b: any) => b.wages - a.wages).slice(0, 5).map((e: any, idx: number) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-black text-gray-400 text-lg shadow-sm group-hover:border-blue-200 transition-colors">
                      {e.name.charAt(0)}
                    </div>
                    {idx < 3 && (
                      <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border border-white shadow-sm ${
                        idx === 0 ? 'bg-amber-400 text-amber-900' : 
                        idx === 1 ? 'bg-slate-300 text-slate-700' : 
                        'bg-orange-700 text-orange-50'
                      }`}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-gray-900 leading-tight">{e.name}</h4>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {e.hours.toFixed(1)} hrs
                      </span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <DollarSign className="w-2.5 h-2.5" /> ${e.rate}/h
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-black text-gray-900 tracking-tight">${e.wages.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="mt-1.5 w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx === 0 ? 'bg-emerald-500' : 
                        idx === 1 ? 'bg-blue-500' : 
                        'bg-indigo-400'
                      }`} 
                      style={{ width: `${Math.min(100, (e.wages / Math.max(1, stats.monthly.totalWages)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
