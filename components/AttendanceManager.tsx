
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Attendance } from '../types';
import { Plus, Clock, Trash2, Loader2, Edit2, X, Check } from 'lucide-react';

const AttendanceManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  
  // Set default times: 2:30 PM (14:30) and 11:00 PM (23:00)
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

  // Increased font-size to 16px (text-base) for inputs on mobile to prevent auto-zoom
  const inputClasses = "w-full h-14 px-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 outline-none text-base md:text-sm font-bold appearance-none transition-all";
  const labelClasses = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="space-y-6 animate-fade-in">
      {!editingRecord && (
        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
          <h2 className="text-sm font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-widest">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            Log Shift
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelClasses}>Employee</label>
              <select 
                required
                className={inputClasses}
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
              >
                <option value="">Select Employee...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClasses}>Shift Date</label>
              <input 
                type="date"
                required
                className={inputClasses}
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLogging || !formData.employee_id}
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm shadow-xl shadow-blue-100 active:scale-95"
              >
                {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                LOG SHIFT
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Editing Modal Overlay */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 animate-slide-in shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Edit Shift</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className={labelClasses}>Date</label>
                <input type="date" required className={inputClasses} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClasses}>In Time</label>
                  <input type="time" required className={inputClasses} value={formData.time_in} onChange={(e) => setFormData({...formData, time_in: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>Out Time</label>
                  <input type="time" className={inputClasses} value={formData.time_out} onChange={(e) => setFormData({...formData, time_out: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 h-12 bg-gray-100 text-gray-600 font-bold rounded-2xl text-xs hover:bg-gray-200 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 h-12 bg-blue-600 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-50">
                   <Check className="w-4 h-4" /> UPDATE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/20">
          <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Shift Logs</h3>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
                  <th className="px-6 py-4">Staff</th>
                  <th className="px-6 py-4 text-center">Date</th>
                  <th className="px-6 py-4 text-center">Hours</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-xs font-bold">No records found.</td></tr>
                ) : (
                  attendance.map((record) => {
                    const hours = calculateHours(record.time_in, record.time_out);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="text-sm font-black text-gray-900 truncate max-w-[120px] md:max-w-none">{record.employee?.name || '---'}</div>
                          <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">${record.employee?.hourly_rate}/h</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-[11px] font-bold text-gray-600">{new Date(record.date).toLocaleDateString([], {month: 'short', day: 'numeric'})}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-gray-900">{hours.toFixed(1)}h</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => openEdit(record)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors" title="Edit Shift"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(record.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Delete Shift"><Trash2 className="w-4 h-4" /></button>
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
