import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Shield, Zap, Search, Eye, Filter, UserPlus, X, Key, Calendar, CreditCard, Loader2 } from 'lucide-react';
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
  const { userProfile } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
    plan_id: '9cc415e2-81c8-4f65-8ded-fd13e3e8903e',
    status: 'active' as any,
    validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invite: true
  });

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const { showToast } = useToast();

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newUser)
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Provisioning failed');

      showToast(`Identity Provisioned: ${newUser.email}`, 'success');
      setShowCreateModal(false);
      setNewUser({
        email: '', password: '', full_name: '', role: 'student',
        plan_id: 'trial', status: 'trial', validity_date: '', invite: true
      });
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

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
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              <UserPlus size={16} />
              Provision User
            </button>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
               <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                 <UserPlus size={18} className="text-indigo-600" />
                 Provision New Identity
               </h3>
               <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                 <X size={20} />
               </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Identity / Email</label>
                    <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="john@doe.com" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Display Name</label>
                    <input required type="text" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="John Doe" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Clearance Role</label>
                    <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold">
                       <option value="student">Student</option>
                       <option value="teacher">Teacher</option>
                       <option value="admin">Admin</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Service Plan</label>
                    <select value={newUser.plan_id} onChange={e => setNewUser({...newUser, plan_id: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold">
                       <option value="9cc415e2-81c8-4f65-8ded-fd13e3e8903e">Free (Direct Access)</option>
                       <option value="ad70663e-00b0-4af8-aa0d-1e0f70c2fa67">KCET+PUC Aspirant</option>
                       <option value="128d9ff9-d918-4c7c-a653-1a3fdc614386">NEET Achiever</option>
                       <option value="182781e2-fc19-4ffe-aea7-3d132a6484da">JEE Champion</option>
                       <option value="36f6f079-859e-409a-b7c2-92bdd82746da">Ultimate Scholar</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Subscription Status</label>
                    <select value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value as any})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold">
                       <option value="active">Active</option>
                       <option value="trial">Trial</option>
                       <option value="inactive">Inactive</option>
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Validity Date (Expiry)</label>
                    <input type="date" value={newUser.validity_date} onChange={e => setNewUser({...newUser, validity_date: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                 </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <input type="checkbox" checked={newUser.invite} onChange={e => setNewUser({...newUser, invite: e.target.checked})} className="w-4 h-4" />
                       <span className="text-[11px] font-bold text-slate-700">Send Supabase Invitation email</span>
                    </div>
                 </div>
                 {!newUser.invite && (
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-slate-400 uppercase">Manual Node Password</label>
                       <div className="relative">
                          <input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold" placeholder="Leave blank for random" />
                          <Key size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                       </div>
                    </div>
                 )}
              </div>

              <div className="flex gap-2 pt-4">
                 <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase">Cancel</button>
                 <button type="submit" disabled={isCreating} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                    {isCreating ? <Loader2 className="animate-spin" size={16} /> : 'Create/Onboard Identity'}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
