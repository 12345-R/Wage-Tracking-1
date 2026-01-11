
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Attendance } from '../types';
import { Plus, Clock, Trash2, Loader2, Calendar as CalendarIcon, Edit2, X, Check } from 'lucide-react';

const AttendanceManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  
  // Set default times as requested: 2:30 PM (14:30) and 11:00 PM (23:00)
  const defaultTimeIn = "14:30";
  const defaultTimeOut = "23:00";

  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    time_in: defaultTimeIn,
    time_out: defaultTimeOut
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, attRes] = await Promise.all([
      supabase.from('employees').select('*').order('name'),
      supabase.from('attendance')
        .select('*, employee:employees(*)')
        .order('date', { ascending: false })
        .order('time_in', { ascending: false })
        .limit(50)
    ]);
    
    if (empRes.data) setEmployees(empRes.data);
    if (attRes.data) setAttendance(attRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Convert local time strings to ISO format for storage
    const timeIn = new Date(`${formData.date}T${formData.time_in}`).toISOString();
    const timeOut = formData.time_out ? new Date(`${formData.date}T${formData.time_out}`).toISOString() : null;

    if (editingRecord) {
      const { error } = await supabase
        .from('attendance')
        .update({
          employee_id: formData.employee_id,
          date: formData.date,
          time_in: timeIn,
          time_out: timeOut
        })
        .eq('id', editingRecord.id);
      
      if (error) alert(error.message);
      else closeModal();
    } else {
      const { error } = await supabase.from('attendance').insert([{
        user_id: user.id,
        employee_id: formData.employee_id,
        date: formData.date,
        time_in: timeIn,
        time_out: timeOut
      }]);
      
      if (error) alert(error.message);
    }

    if (!editingRecord) {
      // Reset to defaults after successful log
      setFormData({ 
        employee_id: '', 
        date: new Date().toISOString().split('T')[0],
        time_in: defaultTimeIn, 
        time_out: defaultTimeOut 
      });
    }
    fetchData();
    setIsLogging(false);
  };

  const openEdit = (record: Attendance) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      time_in: new Date(record.time_in).toTimeString().slice(0, 5),
      time_out: record.time_out ? new Date(record.time_out).toTimeString().slice(0, 5) : ''
    });
  };

  const closeModal = () => {
    setEditingRecord(null);
    setFormData({
      employee_id: '',
      date: new Date().toISOString().split('T')[0],
      time_in: defaultTimeIn,
      time_out: defaultTimeOut
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this record?')) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const calculateHours = (start: string, end: string | null) => {
    if (!end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, diff / (1000 * 60 * 60));
  };

  const inputClasses = "w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold appearance-none";
  const labelClasses = "block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1";

  return (
    <div className="space-y-5 animate-fade-in">
      {!editingRecord && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-widest">
            <Clock className="w-4 h-4 text-blue-600" /> Log Shift
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="col-span-2 md:col-span-1">
              <label className={labelClasses}>Employee</label>
              <select 
                required
                className={inputClasses}
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
              >
                <option value="">Select...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClasses}>Date</label>
              <input 
                type="date"
                required
                className={inputClasses}
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className={labelClasses}>In (2:30 PM)</label>
              <input 
                type="time"
                required
                className={inputClasses}
                value={formData.time_in}
                onChange={(e) => setFormData({...formData, time_in: e.target.value})}
              />
            </div>
            <div>
              <label className={labelClasses}>Out (11:00 PM)</label>
              <input 
                type="time"
                className={inputClasses}
                value={formData.time_out}
                onChange={(e) => setFormData({...formData, time_out: e.target.value})}
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <button 
                type="submit"
                disabled={isLogging || !formData.employee_id}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs shadow-md shadow-blue-100"
              >
                {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Modal Overlay */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-in shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Edit Shift</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelClasses}>Employee</label>
                <select 
                  required
                  className={inputClasses}
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClasses}>Date</label>
                  <input type="date" required className={inputClasses} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>In Time</label>
                  <input type="time" required className={inputClasses} value={formData.time_in} onChange={(e) => setFormData({...formData, time_in: e.target.value})} />
                </div>
              </div>
              <div>
                <label className={labelClasses}>Out Time (Optional)</label>
                <input type="time" className={inputClasses} value={formData.time_out} onChange={(e) => setFormData({...formData, time_out: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={closeModal} className="flex-1 h-10 bg-gray-100 text-gray-600 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 h-10 bg-blue-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-50">
                   <Check className="w-3 h-3" /> Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/20">
          <h3 className="text-[11px] font-bold text-gray-900 uppercase tracking-widest">History</h3>
        </div>

        {loading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[9px] uppercase font-bold tracking-widest border-b border-gray-100">
                  <th className="px-4 py-2.5">Staff</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Hours</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">No records.</td></tr>
                ) : (
                  attendance.map((record) => {
                    const hours = calculateHours(record.time_in, record.time_out);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-gray-900 truncate max-w-[80px] md:max-w-none">{record.employee?.name || '---'}</div>
                          <div className="text-[9px] text-gray-400 font-medium">${record.employee?.hourly_rate}/h</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-[10px] font-semibold text-gray-600">{new Date(record.date).toLocaleDateString([], {month: 'short', day: 'numeric'})}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-black text-gray-900">{hours.toFixed(1)}h</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-0.5">
                            <button onClick={() => openEdit(record)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Shift"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDelete(record.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete Shift"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceManager;
