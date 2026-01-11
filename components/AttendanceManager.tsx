
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
  
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    time_in: '',
    time_out: ''
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
      setFormData({ ...formData, employee_id: '', time_in: '', time_out: '' });
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
      time_in: '',
      time_out: ''
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Create Form */}
      {!editingRecord && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight text-sm">
            <Clock className="w-5 h-5 text-blue-600" /> Log New Shift
          </h2>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Employee</label>
              <select 
                required
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                value={formData.employee_id}
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
              <input 
                type="date"
                required
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Time In</label>
              <input 
                type="time"
                required
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                value={formData.time_in}
                onChange={(e) => setFormData({...formData, time_in: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Time Out</label>
              <input 
                type="time"
                className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-semibold"
                value={formData.time_out}
                onChange={(e) => setFormData({...formData, time_out: e.target.value})}
              />
            </div>
            <button 
              type="submit"
              disabled={isLogging || !formData.employee_id}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 h-[42px] shadow-lg shadow-blue-100"
            >
              {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Save Record
            </button>
          </form>
        </div>
      )}

      {/* Editing Modal Overlay */}
      {editingRecord && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 animate-slide-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Edit Attendance Record</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Employee</label>
                <select 
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Date</label>
                  <input 
                    type="date"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">In Time</label>
                  <input 
                    type="time"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                    value={formData.time_in}
                    onChange={(e) => setFormData({...formData, time_in: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Out Time (Optional)</label>
                <input 
                  type="time"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                  value={formData.time_out}
                  onChange={(e) => setFormData({...formData, time_out: e.target.value})}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                   <Check className="w-5 h-5" /> Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Attendance Activity</h3>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Last 50 Records</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Shift Details</th>
                  <th className="px-6 py-4">Total Hours</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No shift data found.</td>
                  </tr>
                ) : (
                  attendance.map((record) => {
                    const hours = calculateHours(record.time_in, record.time_out);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{record.employee?.name || 'Deleted'}</div>
                          <div className="text-[10px] font-bold text-gray-400">${record.employee?.hourly_rate.toFixed(2)}/hr</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <CalendarIcon className="w-4 h-4 text-gray-300" />
                            {new Date(record.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-medium text-gray-600">
                            {new Date(record.time_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                            {' - '}
                            {record.time_out ? new Date(record.time_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : <span className="text-orange-500 font-bold uppercase tracking-tighter">On-Clock</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-gray-900 text-lg">{hours.toFixed(1)} <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Hrs</span></span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEdit(record)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              title="Edit Record"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(record.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
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
