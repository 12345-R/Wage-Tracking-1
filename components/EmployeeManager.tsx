
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Employee } from '../types';
import { Plus, Edit2, Trash2, X, Check, Search, Loader2, User, AlertCircle } from 'lucide-react';

const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ name: '', hourly_rate: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) console.error('Error fetching employees:', error);
    else setEmployees(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Authentication failed. Please log in again.");

      // 2. Prepare payload exactly matching the schema
      const payload = {
        name: formData.name.trim(),
        hourly_rate: parseFloat(formData.hourly_rate),
        user_id: user.id // Tie to the logged-in employer
      };

      if (editingEmployee) {
        // Update existing record
        const { error: dbError } = await supabase
          .from('employees')
          .update(payload)
          .eq('id', editingEmployee.id);
        
        if (dbError) throw dbError;
        setSuccess(`${payload.name} updated successfully.`);
      } else {
        // Insert new record
        const { error: dbError } = await supabase
          .from('employees')
          .insert([payload]);
        
        if (dbError) throw dbError;
        setSuccess(`${payload.name} added to the team.`);
      }

      // 3. Refresh and close
      setTimeout(() => {
        closeModal();
        fetchEmployees();
      }, 1000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all attendance records for this employee.')) {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) alert(error.message);
      else fetchEmployees();
    }
  };

  const openModal = (employee?: Employee) => {
    setError(null);
    setSuccess(null);
    if (employee) {
      setEditingEmployee(employee);
      setFormData({ name: employee.name, hourly_rate: employee.hourly_rate.toString() });
    } else {
      setEditingEmployee(null);
      setFormData({ name: '', hourly_rate: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData({ name: '', hourly_rate: '' });
    setError(null);
    setSuccess(null);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Team Roster</h2>
          <p className="text-gray-500 font-medium">Manage personnel profiles and wage rates in CAD.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-2xl transition-all font-bold shadow-lg shadow-blue-100 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add New Staff
        </button>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/30">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search team members..."
              className="w-full pl-12 pr-4 py-4 bg-white border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-base md:text-sm text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-20 flex justify-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-20 text-center text-gray-400 font-medium">
            {searchTerm ? "No matches found." : "No team members found yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-black tracking-widest border-b border-gray-100">
                  <th className="px-8 py-4">Employee Name</th>
                  <th className="px-8 py-4">CAD Rate / hr</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100 shadow-sm">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                           <div className="font-black text-gray-900">{emp.name}</div>
                           <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">ID: {emp.id.split('-')[0]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <span className="font-black text-gray-900 text-lg">${emp.hourly_rate.toFixed(2)}</span>
                    </td>
                    <td className="px-8 py-5">
                       <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black bg-green-50 text-green-600 border border-green-100 uppercase tracking-widest">Active</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(emp)}
                          className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100 shadow-sm"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(emp.id)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100 shadow-sm"
                          title="Remove Employee"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-md">
          <div className="bg-white rounded-[40px] shadow-2xl max-w-md w-full overflow-hidden animate-slide-in border border-white/20">
            <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">{editingEmployee ? 'Edit Profile' : 'New Staff Member'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-700 text-xs font-bold animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-start gap-3 text-green-700 text-xs font-bold animate-fade-in">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <div className={isSubmitting || success ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Legal Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input 
                    type="text" 
                    required
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-base text-gray-800 transition-all placeholder:text-gray-300"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Jane Smith"
                  />
                </div>
              </div>

              <div className={isSubmitting || success ? 'opacity-50 pointer-events-none' : ''}>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Hourly Rate (CAD)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">$</div>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-[20px] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-base text-gray-800 transition-all"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                    placeholder="20.00"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-4 bg-gray-100 rounded-[20px] font-black text-xs text-gray-500 hover:bg-gray-200 transition-colors uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting || !!success}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-4 rounded-[20px] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : success ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" /> {editingEmployee ? 'Update' : 'Save'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;
