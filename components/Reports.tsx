
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance } from '../types';
// Fix: Added missing DollarSign and Clock imports from lucide-react
import { Download, FileText, Calendar, Filter, Loader2, DollarSign, Clock } from 'lucide-react';

const Reports: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  useEffect(() => {
    fetchReport();
  }, [month]);

  const fetchReport = async () => {
    setLoading(true);
    const startOfMonth = `${month}-01`;
    const lastDay = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
    const endOfMonth = `${month}-${lastDay}`;

    const { data, error } = await supabase
      .from('attendance')
      .select('*, employee:employees(*)')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false });

    if (error) console.error(error);
    else setAttendance(data || []);
    setLoading(false);
  };

  const getSummary = () => {
    const summaryMap: Record<string, { name: string, rate: number, hours: number, wages: number, shifts: number }> = {};
    
    attendance.forEach(record => {
      if (!record.employee || !record.time_out) return;
      const id = record.employee_id;
      const diff = new Date(record.time_out).getTime() - new Date(record.time_in).getTime();
      const hrs = Math.max(0, diff / (1000 * 60 * 60));
      const pay = hrs * record.employee.hourly_rate;

      if (!summaryMap[id]) {
        summaryMap[id] = { 
          name: record.employee.name, 
          rate: record.employee.hourly_rate, 
          hours: 0, 
          wages: 0, 
          shifts: 0 
        };
      }
      summaryMap[id].hours += hrs;
      summaryMap[id].wages += pay;
      summaryMap[id].shifts += 1;
    });

    return Object.values(summaryMap).sort((a, b) => b.wages - a.wages);
  };

  const employeeStats = getSummary();
  const totalMonthlyWages = employeeStats.reduce((sum, e) => sum + e.wages, 0);
  const totalMonthlyHours = employeeStats.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" /> Payroll Reports
          </h2>
          <p className="text-gray-500 font-medium">Analyze and export monthly wage data.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
           <Calendar className="w-5 h-5 text-gray-400 ml-2" />
           <input 
             type="month" 
             value={month}
             onChange={(e) => setMonth(e.target.value)}
             className="border-none bg-transparent outline-none font-bold text-gray-700 pr-2"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Period Wages</p>
            <h3 className="text-3xl font-black text-gray-900">${totalMonthlyWages.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Hours</p>
            <h3 className="text-3xl font-black text-gray-900">{totalMonthlyHours.toFixed(1)} hrs</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Per-Employee Summary</h3>
          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-8 py-4">Employee</th>
                  <th className="px-8 py-4 text-center">Rate</th>
                  <th className="px-8 py-4 text-center">Shifts</th>
                  <th className="px-8 py-4 text-center">Hours</th>
                  <th className="px-8 py-4 text-right">Total Wages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeeStats.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-500">No data for this month.</td></tr>
                ) : (
                  employeeStats.map((e, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="font-bold text-gray-900">{e.name}</div>
                      </td>
                      <td className="px-8 py-5 text-center text-sm font-semibold text-gray-600">${e.rate.toFixed(2)}</td>
                      <td className="px-8 py-5 text-center text-sm font-semibold text-gray-600">{e.shifts}</td>
                      <td className="px-8 py-5 text-center text-sm font-semibold text-gray-600">{e.hours.toFixed(1)}h</td>
                      <td className="px-8 py-5 text-right font-black text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                        ${e.wages.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
