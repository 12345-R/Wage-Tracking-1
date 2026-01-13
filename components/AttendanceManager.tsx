
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
      console.error("No active user session found.");
      setErrorMessage("Session expired. Please log in again.");
      setIsLogging(false);
      return;
    }

    const timeIn = formData.time_in;
    const timeOut = formData.time_out || null;

    try {
      // 1. Check for duplicate shifts (same employee, same date, same start time)
      const { data: existing, error: checkError } = await supabase
        .from('attendance')
        .select('id')
        .eq('employee_id', formData.employee_id)
        .eq('date', formData.date)
        .eq('time_in', timeIn);

      if (checkError) throw checkError;

      const isDuplicate = existing?.some(record => !editingRecord || record.id !== editingRecord.id);

      if (isDuplicate) {
        setErrorMessage("A shift with this exact start time already exists for this employee.");
        setIsLogging(false);
        return;
      }

      const updateData = {
        employee_id: formData.employee_id,
        date: formData.date,
        time_in: timeIn,
        time_out: timeOut,
        user_id: user.id
      };

      if (editingRecord) {
        console.log("Attempting to UPDATE record ID:", editingRecord.id);
        console.log("New data payload:", updateData);

        const { data, error: updateError } = await supabase
          .from('attendance')
          .update({
            employee_id: formData.employee_id,
            date: formData.date,
            time_in: timeIn,
            time_out: timeOut
          })
          .eq('id', editingRecord.id)
          .eq('user_id', user.id)
          .select();
        
        if (updateError) {
          console.error("Supabase Update Failed:", updateError);
          throw updateError;
        }

        if (!data || data.length === 0) {
          console.warn("Update command executed but no rows were affected. Check RLS or ID.");
        } else {
          console.log("Update Success. Result:", data[0]);
        }
        
        await fetchData();
        closeModal();
      } else {
        console.log("Performing INSERT for new record...");
        const { error: insertError } = await supabase
          .from('attendance')
          .insert([updateData]);
        
        if (insertError) {
          console.error("Supabase Insert Failed:", insertError);
          throw insertError;
        }
        
        setFormData({ 
          employee_id: '', 
          date: getLocalDateString(),
          time_in: defaultTimeIn, 
          time_out: defaultTimeOut 
        });
        await fetchData();
      }
    } catch (err: any) {
      console.error("Error in handleSubmit:", err);
      setErrorMessage(err.message || "An error occurred while saving.");
    } finally {
      setIsLogging(false);
    }
  };

  const openEdit = (record: Attendance) => {
    setErrorMessage(null);
    console.log("Loading record for edit. Selected ID:", record.id);
    
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
                <label className={labelClasses}>Shift Date</label>
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
              <div>
                <label className={labelClasses}>Time In</label>
                <input 
                  type="time" 
                  required
                  className={inputClasses}
                  value={formData.time_in}
                  onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                />
              </div>
              <div>
                <label className={labelClasses}>Time Out</label>
                <input 
                  type="time" 
                  className={inputClasses}
                  value={formData.time_out || ''}
                  onChange={(e) => setFormData({...formData, time_out: e.target.value})}
                />
              </div>
            </div>
            <button 
              type="submit" 
              disabled={isLogging}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-50"
            >
              {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              {isLogging ? 'Processing...' : 'Save Shift Record'}
            </button>
          </form>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Recent Attendance Logs</h3>
        {filterEmployeeId && (
          <button 
            onClick={() => setFilterEmployeeId(null)}
            className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1 hover:underline"
          >
            <X className="w-3 h-3" /> Clear Filter ({filteredEmployeeName})
          </button>
        )}
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-bold italic">No records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-200">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">In / Out</th>
                  <th className="px-6 py-4 text-center">Hours</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAttendance.map((record) => {
                  const hrs = calculateHours(record.date, record.time_in, record.time_out);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => setFilterEmployeeId(record.employee_id)}
                          className="font-black text-gray-900 hover:text-blue-600 transition-colors text-sm"
                        >
                          {record.employee?.name || 'Unknown'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">
                        {new Date(record.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded border border-green-100">{formatTime(record.time_in)}</span>
                          <span className="text-gray-300">→</span>
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">{formatTime(record.time_out)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-gray-900">{hrs.toFixed(1)}h</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => openEdit(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-100 shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-gray-100 shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full overflow-hidden animate-slide-in border border-white/20">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900">Edit Shift Details</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
               {errorMessage && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-3 text-red-700 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
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
                  <input 
                    type="date" 
                    required
                    className={inputClasses}
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div />
                <div>
                  <label className={labelClasses}>Time In</label>
                  <input 
                    type="time" 
                    required
                    className={inputClasses}
                    value={formData.time_in}
                    onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                  />
                </div>
                <div>
                  <label className={labelClasses}>Time Out</label>
                  <input 
                    type="time" 
                    className={inputClasses}
                    value={formData.time_out || ''}
                    onChange={(e) => setFormData({...formData, time_out: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-4 bg-gray-100 rounded-xl font-black text-xs text-gray-500 uppercase tracking-widest">Cancel</button>
                <button type="submit" disabled={isLogging} className="flex-1 bg-blue-600 text-white font-black px-8 py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-50 transition-all active:scale-95">
                  {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManager;
