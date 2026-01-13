
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance, Employee } from '../types';
import { Download, FileText, Loader2, DollarSign, Clock, User, ArrowLeft } from 'lucide-react';

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
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: false });

    if (selectedEmployeeId !== 'all') {
      query = query.eq('employee_id', selectedEmployeeId);
    }

    const { data, error } = await query;
    if (error) console.error(error);
    else setAttendance(data || []);
    setLoading(false);
  };

  const calculateHours = (workDate: string, start: string, end: string | null) => {
    if (!end) return 0;
    const startTime = new Date(`${workDate}T${start}`);
    const endTime = new Date(`${workDate}T${end}`);
    let diff = endTime.getTime() - startTime.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    return Math.max(0, diff / (1000 * 60 * 60));
  };

  const getSummary = () => {
    const summaryMap: Record<string, { id: string, name: string, rate: number, hours: number, wages: number, shifts: number }> = {};
    attendance.forEach(record => {
      if (!record.employee) return;
      const id = record.employee_id;
      const hrs = calculateHours(record.work_date, record.time_in, record.time_out);
      const pay = hrs * record.employee.hourly_rate;

      if (!summaryMap[id]) {
        summaryMap[id] = { id, name: record.employee.name, rate: record.employee.hourly_rate, hours: 0, wages: 0, shifts: 0 };
      }
      summaryMap[id].hours += hrs;
      summaryMap[id].wages += pay;
      summaryMap[id].shifts += 1;
    });
    return Object.values(summaryMap).sort((a, b) => b.wages - a.wages);
  };

  const downloadReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (selectedEmployeeId === 'all') {
      csvContent += "Employee Name,Total Shifts,Total Hours,Total Pay (CAD)\n";
      stats.forEach(e => {
        csvContent += `${e.name},${e.shifts},${e.hours.toFixed(2)},${e.wages.toFixed(2)}\n`;
      });
    } else {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      csvContent += `Report for: ${emp?.name || 'Unknown'}\n`;
      csvContent += "Date,In,Out,Hours,Pay (CAD)\n";
      attendance.forEach(att => {
        const hrs = calculateHours(att.work_date, att.time_in, att.time_out);
        const pay = hrs * (att.employee?.hourly_rate || 0);
        csvContent += `${att.work_date},${att.time_in},${att.time_out || '--'},${hrs.toFixed(2)},${pay.toFixed(2)}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WageTrack_Report_${selectedEmployeeId === 'all' ? 'All' : employees.find(e => e.id === selectedEmployeeId)?.name}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = getSummary();
  const totalWages = stats.reduce((sum, e) => sum + e.wages, 0);
  const totalHours = stats.reduce((sum, e) => sum + e.hours, 0);

  const filterInputClasses = "w-full h-12 px-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-base md:text-sm text-gray-700 appearance-none transition-all";
  const filterLabelClasses = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  const currentEmployeeName = employees.find(e => e.id === selectedEmployeeId)?.name;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {selectedEmployeeId !== 'all' && (
            <button 
              onClick={() => setSelectedEmployeeId('all')}
              className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-gray-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> 
              {selectedEmployeeId === 'all' ? 'Payroll Analytics (CAD)' : `Report: ${currentEmployeeName}`}
            </h2>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
        <div className="col-span-2 md:col-span-1">
          <label className={filterLabelClasses}>Staff Member</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className={`${filterInputClasses} pl-9`}>
              <option value="all">Everyone (Summary)</option>
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
           <button onClick={fetchData} className="w-full h-12 bg-blue-600 text-white text-[12px] font-black rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-50 tracking-wider">
             REFRESH
           </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Pay</p>
            <h3 className="text-xl font-black text-gray-900">${totalWages.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hours</p>
            <h3 className="text-xl font-black text-gray-900">{totalHours.toFixed(1)}h</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-200">
                    <th className="px-6 py-4">{selectedEmployeeId === 'all' ? 'Name' : 'Date'}</th>
                    <th className="px-6 py-4 text-center">Shifts</th>
                    <th className="px-6 py-4 text-center">Hours</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedEmployeeId === 'all' ? (
                    stats.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm font-bold">No results found for this period.</td></tr>
                    ) : (
                      stats.map((e, idx) => (
                        <tr 
                          key={idx} 
                          className="hover:bg-blue-50/30 transition-colors group cursor-pointer" 
                          onClick={() => setSelectedEmployeeId(e.id)}
                        >
                          <td className="px-6 py-4">
                             <div className="font-black text-sm text-gray-900 group-hover:text-blue-700 transition-colors">{e.name}</div>
                             <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Click to view details</div>
                          </td>
                          <td className="px-6 py-4 text-center text-[11px] font-bold text-gray-500">{e.shifts}</td>
                          <td className="px-6 py-4 text-center text-sm font-bold text-gray-600">{e.hours.toFixed(1)}h</td>
                          <td className="px-6 py-4 text-right font-black text-base text-gray-900">${e.wages.toFixed(2)}</td>
                        </tr>
                      ))
                    )
                  ) : (
                    attendance.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm font-bold">No shifts recorded.</td></tr>
                    ) : (
                      attendance.map((att, idx) => {
                        const hrs = calculateHours(att.work_date, att.time_in, att.time_out);
                        const pay = hrs * (att.employee?.hourly_rate || 0);
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-black text-gray-800">{new Date(att.work_date).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'})}</td>
                            <td className="px-6 py-4 text-center text-[10px] text-gray-400 uppercase font-black">Logged</td>
                            <td className="px-6 py-4 text-center text-sm font-bold text-gray-600">{hrs.toFixed(1)}h</td>
                            <td className="px-6 py-4 text-right font-black text-base text-gray-900">${pay.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-200 flex justify-center">
              <button onClick={downloadReport} className="flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-2xl text-sm font-black transition-all shadow-xl shadow-gray-200 active:scale-95">
                <Download className="w-5 h-5" /> DOWNLOAD CSV REPORT
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
