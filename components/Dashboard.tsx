
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

  const MainStat = ({ title, wages, hours, gradient, icon: Icon }: any) => (
    <div className={`relative overflow-hidden rounded-2xl p-4 text-white shadow-lg ${gradient} transition-transform hover:scale-[1.01]`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start">
          <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg">
            <Icon className="w-5 h-5" />
          </div>
          <ArrowUpRight className="w-4 h-4 opacity-50" />
        </div>
        <div className="mt-4">
          <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{title}</p>
          <h3 className="text-2xl font-black mt-0.5">${wages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <div className="flex items-center gap-1 mt-1 text-white/70 text-[11px] font-medium">
            <Clock className="w-3 h-3" />
            <span>{hours.toFixed(1)} Total Hours</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Summary</h1>
          <p className="text-xs text-gray-500 font-medium">Real-time wage metrics (CAD).</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 self-start">
           <div className="flex -space-x-1.5">
             {[1,2,3].map(i => (
               <div key={i} className="w-6 h-6 rounded-full bg-gray-200 border border-white flex items-center justify-center text-[8px] font-bold text-gray-500">U{i}</div>
             ))}
           </div>
           <div className="text-[11px] font-bold pr-2 text-gray-700">
             {stats.totalEmployees} Active Members
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MainStat title="Daily Payroll" wages={stats.daily.totalWages} hours={stats.daily.totalHours} gradient="bg-gradient-to-br from-orange-400 to-rose-500" icon={Calendar} />
        <MainStat title="Weekly Volume" wages={stats.weekly.totalWages} hours={stats.weekly.totalHours} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" icon={TrendingUp} />
        <MainStat title="Monthly Outlook" wages={stats.monthly.totalWages} hours={stats.monthly.totalHours} gradient="bg-gradient-to-br from-emerald-400 to-teal-600" icon={DollarSign} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">Top Earners</h2>
            <button className="text-blue-600 text-[11px] font-bold flex items-center hover:underline">View Analytics</button>
          </div>
          <div className="space-y-4">
            {attendance.length === 0 ? (
               <div className="text-center py-6 text-xs text-gray-400">No shift data available</div>
            ) : (
              Object.values(
                attendance.reduce((acc: any, curr) => {
                  if (!curr.employee) return acc;
                  const id = curr.employee_id;
                  if (!acc[id]) acc[id] = { name: curr.employee.name, hours: 0, wages: 0 };
                  const hrs = calculateHours(curr.date, curr.time_in, curr.time_out);
                  acc[id].hours += hrs;
                  acc[id].wages += hrs * curr.employee.hourly_rate;
                  return acc;
                }, {})
              ).sort((a: any, b: any) => b.wages - a.wages).slice(0, 4).map((e: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-400 border border-gray-100 text-xs">
                    {e.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-gray-900 truncate">{e.name}</h4>
                    <p className="text-[10px] text-gray-500 font-medium">{e.hours.toFixed(1)}h logged</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-gray-900">${e.wages.toFixed(2)}</div>
                    <div className="w-16 h-1 bg-gray-50 rounded-full mt-1 overflow-hidden">
                       <div className="h-full bg-blue-500" style={{width: `${Math.min(100, (e.wages / Math.max(1, stats.monthly.totalWages)) * 100)}%`}}></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-base font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3 flex-1">
            {attendance.slice(0, 5).map((record, i) => (
              <div key={i} className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors border border-transparent">
                <div className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${record.time_out ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`}></div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-gray-900 truncate">{record.employee?.name}</p>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(record.date).toLocaleDateString([], {month: 'short', day: 'numeric', timeZone: 'UTC'})}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    {record.time_out 
                      ? `${record.time_in.slice(0, 5)} - ${record.time_out.slice(0, 5)}` 
                      : `In since ${record.time_in.slice(0, 5)}`}
                  </p>
                </div>
              </div>
            ))}
            {attendance.length === 0 && <p className="text-gray-400 text-center py-6 text-xs font-medium">No recent logs</p>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
