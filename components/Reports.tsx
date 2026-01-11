
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance, Employee } from '../types';
import { Download, FileText, Calendar, Loader2, DollarSign, Clock, User, ArrowLeft, Filter } from 'lucide-react';

const Reports: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedEmployeeId]);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData } = await supabase.from('employees').select('*').order('name');
    if (empData) setEmployees(empData);

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
        summaryMap[id] = { name: record.employee.name, rate: record.employee.hourly_rate, hours: 0, wages: 0, shifts: 0 };
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

  const filterInputClasses = "w-full h-10 px-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-xs text-gray-700 appearance-none";
  const filterLabelClasses = "block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" /> Payroll Analytics
          </h2>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
        <div className="col-span-2 md:col-span-1">
          <label className={filterLabelClasses}>Staff Member</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <select 
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={`${filterInputClasses} pl-9`}
            >
              <option value="all">Everyone</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={filterLabelClasses}>From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={filterInputClasses} />
        </div>
        <div>
          <label className={filterLabelClasses}>To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={filterInputClasses} />
        </div>
        <div className="col-span-2 md:col-span-1">
           <button onClick={fetchData} className="w-full h-10 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-50">
             REFRESH
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Pay</p>
            <h3 className="text-lg font-black text-gray-900">${totalWages.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <DollarSign className="w-5 h-5 text-blue-600 opacity-20" />
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hours</p>
            <h3 className="text-lg font-black text-gray-900">{totalHours.toFixed(1)}h</h3>
          </div>
          <Clock className="w-5 h-5 text-indigo-600 opacity-20" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[9px] uppercase font-bold tracking-widest border-b border-gray-100">
                  <th className="px-5 py-3">{selectedEmployeeId === 'all' ? 'Name' : 'Date'}</th>
                  <th className="px-5 py-3 text-center">Shifts</th>
                  <th className="px-5 py-3 text-center">Hours</th>
                  <th className="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {selectedEmployeeId === 'all' ? (
                  stats.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs font-medium">No results found.</td></tr>
                  ) : (
                    stats.map((e, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => {
                        const emp = employees.find(emp => emp.name === e.name);
                        if (emp) setSelectedEmployeeId(emp.id);
                      }}>
                        <td className="px-5 py-3 font-bold text-xs text-gray-900">{e.name}</td>
                        <td className="px-5 py-3 text-center text-[10px] font-semibold text-gray-500">{e.shifts}</td>
                        <td className="px-5 py-3 text-center text-xs font-bold text-gray-600">{e.hours.toFixed(1)}h</td>
                        <td className="px-5 py-3 text-right font-black text-sm text-gray-900">${e.wages.toFixed(2)}</td>
                      </tr>
                    ))
                  )
                ) : (
                  attendance.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-xs font-medium">No shifts recorded.</td></tr>
                  ) : (
                    attendance.map((att, idx) => {
                      const diff = att.time_out ? (new Date(att.time_out).getTime() - new Date(att.time_in).getTime()) : 0;
                      const hrs = Math.max(0, diff / (1000 * 60 * 60));
                      const pay = hrs * (att.employee?.hourly_rate || 0);
                      return (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3 text-xs font-bold text-gray-700">{new Date(att.date).toLocaleDateString([], {month: 'short', day: 'numeric'})}</td>
                          <td className="px-5 py-3 text-center text-[9px] text-gray-400 uppercase font-bold">Shift</td>
                          <td className="px-5 py-3 text-center text-xs font-bold text-gray-600">{hrs.toFixed(1)}h</td>
                          <td className="px-5 py-3 text-right font-black text-sm text-gray-900">${pay.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )
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
