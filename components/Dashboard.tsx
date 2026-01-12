
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance } from '../types';
import { DollarSign, Clock, Users, Calendar, TrendingUp, ArrowUpRight, Award, PieChart } from 'lucide-react';

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
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Monthly Performance</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest mt-1">Snapshot for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm self-start">
           <div className="p-2 bg-blue-50 rounded-xl">
             <Users className="w-5 h-5 text-blue-600" />
           </div>
           <div>
             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Staff</div>
             <div className="text-xl font-black text-gray-900 leading-none mt-1">{stats.totalEmployees}</div>
           </div>
        </div>
      </div>

      {/* Primary KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[32px] border border-gray-300 shadow-sm group hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-green-50 rounded-[20px] border border-green-100 group-hover:bg-green-100 transition-colors">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
            <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest border border-green-100">Monthly Payroll</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
              ${stats.monthly.totalWages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-gray-400 font-bold text-sm">Total estimated spend this month</p>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Est. Growth: +4.2%
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-300" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[32px] border border-gray-300 shadow-sm group hover:border-blue-300 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-blue-50 rounded-[20px] border border-blue-100 group-hover:bg-blue-100 transition-colors">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest border border-blue-100">Monthly Hours</span>
          </div>
          <div className="space-y-1">
            <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
              {stats.monthly.totalHours.toFixed(1)} <span className="text-xl text-gray-400 font-black">hrs</span>
            </h3>
            <p className="text-gray-400 font-bold text-sm">Collective work time logged</p>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
              <PieChart className="w-4 h-4 text-blue-500" />
              Efficiency: High
            </div>
            <ArrowUpRight className="w-5 h-5 text-gray-300" />
          </div>
        </div>
      </div>

      {/* Secondary Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Daily Wages</p>
          <p className="text-lg font-black text-gray-800">${stats.daily.totalWages.toFixed(2)}</p>
        </div>
        <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Daily Hours</p>
          <p className="text-lg font-black text-gray-800">{stats.daily.totalHours.toFixed(1)}h</p>
        </div>
        <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Weekly Wages</p>
          <p className="text-lg font-black text-gray-800">${stats.weekly.totalWages.toFixed(2)}</p>
        </div>
        <div className="bg-gray-100/50 p-4 rounded-2xl border border-gray-200">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Weekly Hours</p>
          <p className="text-lg font-black text-gray-800">{stats.weekly.totalHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Top Earners Section */}
      <div className="bg-white rounded-[40px] border border-gray-300 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-500" />
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Top Earners <span className="text-gray-400 font-bold ml-1">· This Month</span></h2>
          </div>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sorted by Gross Pay</div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {attendance.length === 0 ? (
             <div className="p-16 text-center text-gray-400 font-bold italic">No shift data found for this month yet.</div>
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
              <div key={idx} className="px-8 py-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-gray-100 flex items-center justify-center font-black text-gray-400 text-xl shadow-sm group-hover:scale-105 transition-transform">
                      {e.name.charAt(0)}
                    </div>
                    {idx < 3 && (
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm ${
                        idx === 0 ? 'bg-yellow-400 text-yellow-900' : 
                        idx === 1 ? 'bg-gray-300 text-gray-700' : 
                        'bg-amber-600 text-amber-50'
                      }`}>
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-gray-900">{e.name}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {e.hours.toFixed(1)} Hours
                      </span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> ${e.rate}/hr
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-black text-gray-900">${e.wages.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div className="mt-2 w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${Math.min(100, (e.wages / Math.max(1, stats.monthly.totalWages)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {attendance.length > 0 && (
          <div className="p-4 bg-gray-50/30 text-center">
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors">
              Download Full Analytics Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
