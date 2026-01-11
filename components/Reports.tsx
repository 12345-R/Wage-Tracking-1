
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance, Employee } from '../types';
import { Download, FileText, Calendar, Loader2, DollarSign, Clock, User, ArrowLeft, Filter } from 'lucide-react';

const Reports: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedEmployeeId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Employees for dropdown
    const { data: empData } = await supabase.from('employees').select('*').order('name');
    if (empData) setEmployees(empData);

    // Fetch Attendance with filters
    let query = supabase
      .from('attendance')
      .select('*, employee:employees(*)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (selectedEmployeeId !== 'all') {
      query = query.eq('employee_id', selectedEmployeeId);
    }

    const { data, error } = await query;

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

  const stats = getSummary();
  const totalWages = stats.reduce((sum, e) => sum + e.wages, 0);
  const totalHours = stats.reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" /> Advanced Reports
          </h2>
          <p className="text-gray-500 font-medium">Custom date ranges and individual summaries.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Employee</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700 appearance-none"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">End Date</label>
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700"
          />
        </div>
        <div className="flex gap-2">
           <button 
             onClick={fetchData}
             className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl hover:bg-blue-700 transition-colors"
           >
             Update
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selected Wages</p>
            <h3 className="text-3xl font-black text-gray-900">${totalWages.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <DollarSign className="w-8 h-8" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Hours</p>
            <h3 className="text-3xl font-black text-gray-900">{totalHours.toFixed(1)} hrs</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Clock className="w-8 h-8" />
          </div>
        </div>
      </div>

      {selectedEmployeeId === 'all' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Payroll Summary (All Staff)</h3>
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
                    <th className="px-8 py-4 text-right">Wages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-500">No data for this period.</td></tr>
                  ) : (
                    stats.map((e, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => {
                        const emp = employees.find(emp => emp.name === e.name);
                        if (emp) setSelectedEmployeeId(emp.id);
                      }}>
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
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <button 
              onClick={() => setSelectedEmployeeId('all')}
              className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to All
            </button>
            <h3 className="font-bold text-gray-900">Individual Shift Details</h3>
          </div>
          {loading ? (
            <div className="p-20 flex justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                    <th className="px-8 py-4">Date</th>
                    <th className="px-8 py-4">Time In</th>
                    <th className="px-8 py-4">Time Out</th>
                    <th className="px-8 py-4 text-center">Hours</th>
                    <th className="px-8 py-4 text-right">Wage Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {attendance.length === 0 ? (
                    <tr><td colSpan={5} className="px-8 py-10 text-center text-gray-500">No shifts found for this criteria.</td></tr>
                  ) : (
                    attendance.map((att, idx) => {
                      const diff = att.time_out ? (new Date(att.time_out).getTime() - new Date(att.time_in).getTime()) : 0;
                      const hrs = Math.max(0, diff / (1000 * 60 * 60));
                      const pay = hrs * (att.employee?.hourly_rate || 0);
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-gray-700">{new Date(att.date).toLocaleDateString()}</td>
                          <td className="px-8 py-4 text-gray-500 text-sm">
                            {new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-8 py-4 text-gray-500 text-sm">
                            {att.time_out ? new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                          </td>
                          <td className="px-8 py-4 text-center font-semibold text-gray-600">{hrs.toFixed(1)}h</td>
                          <td className="px-8 py-4 text-right font-bold text-gray-900">${pay.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
