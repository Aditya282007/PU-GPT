import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Loader2, 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2,
  X,
  Check,
  Shield,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { adminApi } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

const ROLE_ICONS = {
  student: GraduationCap,
  teacher: Briefcase,
  admin: Shield,
};

const ROLE_COLORS = {
  student: 'text-sage bg-sage/10',
  teacher: 'text-amber-chalk bg-amber-chalk/10',
  admin: 'text-rust bg-rust/10',
};

export function AdminUsersPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student', department: '', subjects: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchUsers();
  }, [isAuthenticated, isAdmin, pagination.page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.users({ page: pagination.page, limit: pagination.limit, role: roleFilter });
      setUsers(res.data.users);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.createTeacher({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        department: formData.department,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(Boolean),
      });
      setShowCreateModal(false);
      setFormData({ name: '', email: '', password: '', role: 'student', department: '', subjects: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user?')) return;
    try {
      await adminApi.deleteUser(userId);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'teacher', department: '', subjects: '' });
    setShowCreateModal(true);
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center">
        <h3 className="font-display font-medium text-lg text-chalk mb-2">Access Denied</h3>
        <p className="text-chalk/60">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-medium text-2xl text-chalk">User Management</h1>
          <p className="text-chalk/60">Provision and manage user accounts</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="w-4 h-4" />
          Add Teacher
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-rule-line">
          <Select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
            placeholder="All roles"
            options={[
              { value: '', label: 'All roles' },
              { value: 'student', label: 'Students' },
              { value: 'teacher', label: 'Teachers' },
              { value: 'admin', label: 'Admins' },
            ]}
            className="w-48"
          />
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-chalk mx-auto mb-2" />
              <p className="text-chalk/60">Loading users...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
              <h3 className="font-display font-medium text-lg text-chalk mb-2">No users found</h3>
              <p className="text-chalk/60">Add your first teacher to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-rule-line">
              {users.map(u => (
                <div key={u._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-rule-line/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-chalk/20 flex items-center justify-center">
                      <span className="text-amber-chalk font-medium">{u.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-chalk">{u.name}</p>
                      <p className="text-sm text-chalk/50">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 flex-1 sm:flex-none">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${ROLE_COLORS[u.role]}`}>
                      {(() => { const Icon = ROLE_ICONS[u.role]; return <Icon className="w-3 h-3 inline mr-1" /> })()}
                      {u.role}
                    </span>
                    {u.department && <span className="text-sm text-chalk/60 font-mono">{u.department}</span>}
                    {u.subjects?.length && (
                      <span className="text-sm text-chalk/60">{u.subjects.join(', ')}</span>
                    )}
                    <span className="text-xs text-chalk/40">Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className="px-2 py-1 text-sm bg-rule-line/30 border border-rule-line rounded text-chalk focus:outline-none focus:border-amber-chalk"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(u._id)} className="text-rust hover:bg-rust/10" disabled={u._id === user._id}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.pages > 1 && (
            <div className="p-4 border-t border-rule-line flex items-center justify-between">
              <p className="text-sm text-chalk/60">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1 || loading}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.pages || loading}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in">
          <div className="w-full max-w-md bg-chalkboard border border-rule-line rounded-xl p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-medium text-xl text-chalk">Create Teacher Account</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-chalk/50 hover:text-chalk">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Full Name" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Dr. Jane Smith" required />
              <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="teacher@paruluniversity.ac.in" required />
              <Input label="Password" type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} placeholder="Min 8 characters" required />
              <Input label="Department" value={formData.department} onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))} placeholder="Computer Science Engineering" />
              <Input label="Subjects (comma-separated)" value={formData.subjects} onChange={(e) => setFormData(prev => ({ ...prev, subjects: e.target.value }))} placeholder="Data Structures, Algorithms, Database Systems" />
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
                <Button type="submit" loading={submitting} className="flex-1">Create Teacher</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



