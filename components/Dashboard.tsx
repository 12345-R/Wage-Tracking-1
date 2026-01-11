
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance, WageSummary } from '../types';
import { DollarSign, Clock, Users, Calendar, TrendingUp } from 'lucide-react';

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
    // Fetch last 31 days of attendance for stats
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
      
      // Weekly range (Last 7 days)
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

        // Daily
        if (record.date === todayStr) {
          dHours += hours;
          dWages += wages;
        }

        // Weekly
        if (record.date >= weekStr) {
          wHours += hours;
          wWages += wages;
        }

        // Monthly (already filtered in query)
        mHours += hours;
        mWages += wages;
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

  const StatCard = ({ title, wages, hours, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-500 font-medium text-sm">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="text-2xl font-bold text-gray-900">${wages.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>{hours.toFixed(1)} hours worked</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Real-time metrics for your workforce and payroll.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Daily Total" 
          wages={stats.daily.totalWages} 
          hours={stats.daily.totalHours} 
          icon={Calendar} 
          color="bg-orange-50 text-orange-600"
        />
        <StatCard 
          title="Weekly Total" 
          wages={stats.weekly.totalWages} 
          hours={stats.weekly.totalHours} 
          icon={TrendingUp} 
          color="bg-green-50 text-green-600"
        />
        <StatCard 
          title="Monthly Total" 
          wages={stats.monthly.totalWages} 
          hours={stats.monthly.totalHours} 
          icon={DollarSign} 
          color="bg-blue-50 text-blue-600"
        />
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
              <div className="text-sm text-gray-500">Active Employees</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Employee Performance (Monthly)</h3>
          <div className="space-y-4">
            {attendance.length === 0 ? (
               <p className="text-gray-400 text-sm">No data available for performance tracking.</p>
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
              ).sort((a: any, b: any) => b.wages - a.wages).slice(0, 5).map((e: any) => (
                <div key={e.name} className="flex items-center justify-between group">
                  <div>
                    <div className="font-medium text-gray-900">{e.name}</div>
                    <div className="text-xs text-gray-400">{e.hours.toFixed(1)} hrs worked</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">${e.wages.toFixed(2)}</div>
                    <div className="h-1.5 w-24 bg-gray-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${Math.min(100, (e.wages / stats.monthly.totalWages) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {attendance.slice(0, 5).map((record, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className={`w-2 h-2 rounded-full ${record.time_out ? 'bg-green-400' : 'bg-orange-400'}`}></div>
                <span className="font-medium text-gray-700">{record.employee?.name}</span>
                <span className="text-gray-500">
                  {record.time_out ? 'completed a shift' : 'started shift'}
                </span>
                <span className="ml-auto text-gray-400 text-xs">
                  {new Date(record.time_in).toLocaleDateString()}
                </span>
              </div>
            ))}
            {attendance.length === 0 && <p className="text-gray-400 text-sm">No recent activity.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
