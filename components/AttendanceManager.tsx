
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee, Attendance } from '../types';
import { Plus, Clock, Trash2, Loader2, Calendar as CalendarIcon } from 'lucide-react';

const AttendanceManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  
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

  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLogging(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Construct full timestamps
    const timeIn = new Date(`${formData.date}T${formData.time_in}`).toISOString();
    const timeOut = formData.time_out ? new Date(`${formData.date}T${formData.time_out}`).toISOString() : null;

    const { error } = await supabase.from('attendance').insert([{
      user_id: user.id,
      employee_id: formData.employee_id,
      date: formData.date,
      time_in: timeIn,
      time_out: timeOut
    }]);

    if (error) {
      alert(error.message);
    } else {
      setFormData({ ...formData, employee_id: '', time_in: '', time_out: '' });
      fetchData();
    }
    setIsLogging(false);
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
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-600" /> Log Shift
        </h2>
        
        <form onSubmit={handleLogAttendance} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select 
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time In</label>
            <input 
              type="time"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.time_in}
              onChange={(e) => setFormData({...formData, time_in: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Out</label>
            <input 
              type="time"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={formData.time_out}
              onChange={(e) => setFormData({...formData, time_out: e.target.value})}
            />
          </div>
          <button 
            type="submit"
            disabled={isLogging || !formData.employee_id}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 h-[42px]"
          >
            {isLogging ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Save Record
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Records</h3>
          <span className="text-xs text-gray-400">Showing last 50 entries</span>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Employee</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Shift</th>
                  <th className="px-6 py-4 font-semibold">Hours</th>
                  <th className="px-6 py-4 font-semibold text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No shifts logged yet.</td>
                  </tr>
                ) : (
                  attendance.map((record) => {
                    const hours = calculateHours(record.time_in, record.time_out);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{record.employee?.name || 'Deleted'}</div>
                          <div className="text-xs text-gray-400">Rate: ${record.employee?.hourly_rate.toFixed(2)}/hr</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-gray-400" />
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-sm">
                          {new Date(record.time_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                          {' - '}
                          {record.time_out ? new Date(record.time_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-700">
                          {hours.toFixed(2)} hrs
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleDelete(record.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
