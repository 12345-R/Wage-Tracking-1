
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Attendance } from '../types';
import { Plus, Clock, Trash2, Loader2, Edit2, X, Check, AlertCircle, ArrowLeft, User, Calendar, DollarSign } from 'lucide-react';

const AttendanceManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [filterEmployeeId, setFilterEmployeeId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const defaultTimeIn = "14:30";
  const defaultTimeOut = "23:00";

  const [formData, setFormData] = useState({
    employee_id: '',
    date: getLocalDateString(),
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
        .limit(100)
    ]);
    
    if (empRes.data) setEmployees(empRes.data);
    if (attRes.data) setAttendance(attRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogging) return;
    
    setIsLogging(true);
    setErrorMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("Session expired. Please log in again.");
      setIsLogging(false);
      return;
    }

    const timeIn = formData.time_in;
    const timeOut = formData.time_out || null;

    try {
      // Duplicate check: only flag if it's a DIFFERENT record with the same unique keys
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', formData.employee_id)
        .eq('date', formData.date)
        .eq('time_in', timeIn);

      const isDuplicate = existing?.some(record => !editingRecord || record.id !== editingRecord.id);

      if (isDuplicate) {
        setErrorMessage("A shift with this exact start time already exists for this employee.");
        setIsLogging(false);
        return;
      }

      if (editingRecord) {
        // Explicit UPDATE targeting the specific record ID
        const { error: updateError } = await supabase
          .from('attendance')
          .update({
            employee_id: formData.employee_id,
            date: formData.date,
            time_in: timeIn,
            time_out: timeOut
          })
          .eq('id', editingRecord.id)
          .eq('user_id', user.id);
        
        if (updateError) throw updateError;
        
        await fetchData();
        closeModal();
      } else {
        // Standard INSERT for new records
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([{
            employee_id: formData.employee_id,
            date: formData.date,
            time_in: timeIn,
            time_out: timeOut,
            user_id: user.id
          }]);
        
        if (insertError) throw insertError;
        
        setFormData({ 
          employee_id: '', 
          date: getLocalDateString(),
          time_in: defaultTimeIn, 
          time_out: defaultTimeOut 
        });
        await fetchData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while saving.");
    } finally {
      setIsLogging(false);
    }
  };

  const openEdit = (record: Attendance) => {
    setErrorMessage(null);
    const parseTime = (timeStr: string | null) => {
      if (!timeStr) return '';
      return timeStr.split(':').slice(0, 2).join(':');
    };
    
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      time_in: parseTime(record.time_in),
      time_out: parseTime(record.time_out)
    });
    setEditingRecord(record);
  };

  const closeModal = () => {
    setEditingRecord(null);
    setErrorMessage(null);
    setFormData({
      employee_id: '',
      date: getLocalDateString(),
      time_in: defaultTimeIn,
      time_out: defaultTimeOut
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this shift record?')) {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) alert(error.message);
      else fetchData();
    }
  };

  const calculateHours = (date: string, start: string, end: string | null) => {
    if (!end) return 0;
    const startTime = new Date(`${date}T${start}`);
    const endTime = new Date(`${date}T${end}`);
    let diff = endTime.getTime() - startTime.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;
    return Math.max(0, diff / (1000 * 60 * 60));
  };

  const formatTime = (time: string | null) => {
    if (!time) return '--:--';
    const parts = time.split(':');
    const h = parseInt(parts[0]);
    const m = parts[1];
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m} ${ampm}`;
  };

  const inputClasses = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none text-base font-bold appearance-none transition-all";
  const labelClasses = "block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1";

  const filteredAttendance = filterEmployeeId 
    ? attendance.filter(a => a.employee_id === filterEmployeeId)
    : attendance;

  const filteredEmployeeName = employees.find(e => e.id === filterEmployeeId)?.name;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {!editingRecord && (
        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-200">
          <h2 className="text-[11px] font-black text-gray-900 mb-5 flex items-center gap-2 uppercase tracking-widest">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            Record New Shift
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-start gap-3 text-red-700 text-xs font-bold animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Staff Member</label>
                <div className="relative">
                   <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                   <select 
                    required
                    className={inputClasses}
                    value={formData.employee_id}
                    onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  >
                    <option value="">Select Staff...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>Date</label>
                <div className="relative">
                  <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                  <input 
                    type="date"
                    required
                    className={inputClasses}
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Start Time</label>
                <input 
                  type="time"
                  required
                  className={inputClasses}
                  value={formData.time_in}
                  onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                />
              </div>
              <div>
                <label className={labelClasses}>End Time</label>
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
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm shadow-lg shadow-blue-50 active:scale-95"
              >
                {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {isLogging ? 'LOGGING...' : 'RECORD SHIFT'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[24px] w-full max-w-lg p-6 animate-slide-in shadow-2xl overflow-hidden border border-gray-100">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Modify Record</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex items-start gap-3 text-red-700 text-xs font-bold mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className={labelClasses}>Staff Member</label>
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
                  <label className={labelClasses}>Start Time</label>
                  <input type="time" required className={inputClasses} value={formData.time_in} onChange={(e) => setFormData({...formData, time_in: e.target.value})} />
                </div>
                <div>
                  <label className={labelClasses}>End Time</label>
                  <input type="time" className={inputClasses} value={formData.time_out} onChange={(e) => setFormData({...formData, time_out: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 h-12 bg-gray-100 text-gray-500 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors uppercase tracking-widest">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isLogging}
                  className="flex-1 h-12 bg-blue-600 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-50 disabled:opacity-50 uppercase tracking-widest"
                >
                   {isLogging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} 
                   {isLogging ? 'SAVING...' : 'UPDATE RECORD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/40">
          <div className="flex items-center gap-3">
            {filterEmployeeId && (
              <button 
                onClick={() => setFilterEmployeeId(null)}
                className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-100 transition-all text-blue-600 shadow-sm group"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest leading-none">
                {filterEmployeeId ? `History: ${filteredEmployeeName}` : 'Activity Log'}
              </h3>
            </div>
          </div>
          
          {filterEmployeeId && (
            <button 
              onClick={() => setFilterEmployeeId(null)}
              className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
            >
              Clear Filter <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/70 text-gray-400 text-[9px] uppercase font-black tracking-widest border-b border-gray-200">
                  <th className="px-6 py-3">Staff</th>
                  <th className="px-4 py-3 text-center">Date</th>
                  <th className="px-4 py-3 text-center">In</th>
                  <th className="px-4 py-3 text-center">Out</th>
                  <th className="px-4 py-3 text-center">Hrs</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttendance.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-xs font-bold italic">No records found.</td></tr>
                ) : (
                  filteredAttendance.map((record) => {
                    const hours = calculateHours(record.date, record.time_in, record.time_out);
                    return (
                      <tr key={record.id} className="hover:bg-blue-50/5 transition-colors group">
                        <td className="px-6 py-3">
                          <button 
                            onClick={() => setFilterEmployeeId(record.employee_id)}
                            className="text-left group/name flex flex-col"
                          >
                            <span className="text-sm font-black text-gray-900 group-hover/name:text-blue-600 transition-colors inline-block pb-0.5 border-b border-transparent group-hover/name:border-blue-400">
                              {record.employee?.name || '---'}
                            </span>
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5 flex items-center gap-0.5">
                              <DollarSign className="w-2 h-2" /> {record.employee?.hourly_rate}/h
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-[11px] font-bold text-gray-700 whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                            {new Date(record.date).toLocaleDateString([], {month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC'})}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs font-black text-blue-600 whitespace-nowrap">{formatTime(record.time_in)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs font-black text-gray-500 whitespace-nowrap">{formatTime(record.time_out)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-black text-gray-900 bg-blue-50/50 px-2 py-1 rounded-lg border border-blue-100/50">{hours.toFixed(1)}h</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-1.5 md:opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => openEdit(record)} 
                              className="p-2 bg-white text-blue-500 border border-gray-200 hover:bg-blue-500 hover:text-white rounded-lg transition-all shadow-sm" 
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(record.id)} 
                              className="p-2 bg-white text-red-400 border border-gray-200 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm" 
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
