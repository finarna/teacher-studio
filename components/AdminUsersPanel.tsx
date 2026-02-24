import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Shield, Zap, Search, Eye, Filter } from 'lucide-react';
import { useToast } from './ToastNotification';
import { useAuth } from './AuthProvider';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student';
  subscription_status: 'active' | 'inactive' | 'trial';
  created_at: string;
}

export const AdminUsersPanel: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const { showToast } = useToast();
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile?.role === 'admin') {
      fetchUsers();
    }
  }, [userProfile?.role]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
      showToast('User updated successfully', 'success');
    } catch (err: any) {
      console.error('Failed to update user:', err);
      showToast('Failed to update user', 'error');
    }
  };

  if (userProfile?.role !== 'admin') {
    return <div className="p-8 text-center text-slate-500">Access Denied. Admins only.</div>;
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.email?.toLowerCase().includes(search.toLowerCase()) || '') ||
                          (u.full_name?.toLowerCase().includes(search.toLowerCase()) || '');
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
          <Users size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">User Management</h2>
          <p className="text-xs text-slate-500 font-medium">Manage roles and platform access for all users</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
               type="text"
               placeholder="Search users..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
             />
           </div>
           <select 
             className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none font-bold text-slate-700"
             value={roleFilter}
             onChange={e => setRoleFilter(e.target.value as any)}
           >
             <option value="all">All Roles</option>
             <option value="admin">Admins</option>
             <option value="teacher">Teachers</option>
             <option value="student">Students</option>
           </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
               <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">User</th>
               <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
               <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription</th>
               <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-bold">Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 font-bold">No users found.</td></tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{u.full_name || 'Anonymous User'}</span>
                      <span className="text-xs text-slate-500">{u.email}</span>
                      <span className="text-[9px] text-slate-300 font-mono mt-0.5">{u.id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as any })}
                      className={`text-xs font-bold px-2 py-1 rounded-md outline-none border transition-colors ${
                        u.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-200' :
                        u.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200 focus:ring-slate-200'
                      }`}
                    >
                      <option value="admin">Admin</option>
                      <option value="teacher">Teacher</option>
                      <option value="student">Student</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.subscription_status}
                      onChange={(e) => updateUser(u.id, { subscription_status: e.target.value as any })}
                      className={`text-xs font-bold px-2 py-1 rounded-md outline-none border transition-colors ${
                        u.subscription_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        u.subscription_status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="trial">Trial</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-slate-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
