import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Plus, 
  Loader2, 
  Database, 
  Edit2, 
  Trash2,
  X,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { adminApi } from '@/utils/api';

export function AdminDepartmentsPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchDepartments();
  }, [isAuthenticated, isAdmin]);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await adminApi.departments();
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;
    setSubmitting(true);
    try {
      await adminApi.createDepartment(formData);
      setShowModal(false);
      setFormData({ name: '', code: '' });
      setEditingDept(null);
      fetchDepartments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    setEditingDept(null);
    setFormData({ name: '', code: '' });
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditingDept(dept);
    setFormData({ name: dept.name || dept, code: dept.code || '' });
    setShowModal(true);
  };

  const handleDelete = async (deptName) => {
    if (!confirm(`Delete department "${deptName}"?`)) return;
    try {
      await adminApi.deleteDepartment(deptName);
      fetchDepartments();
    } catch (err) {
      alert('Failed to delete department');
    }
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
          <h1 className="font-display font-medium text-2xl text-chalk">Departments</h1>
          <p className="text-chalk/60">Manage academic departments</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Department
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-chalk mx-auto mb-2" />
              <p className="text-chalk/60">Loading...</p>
            </div>
          ) : departments.length === 0 ? (
            <div className="p-12 text-center">
              <Database className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
              <h3 className="font-display font-medium text-lg text-chalk mb-2">No departments yet</h3>
              <p className="text-chalk/60 mb-6">Create your first department to get started</p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Add Department
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-rule-line">
              {departments.map((dept) => (
                <div key={dept} className="p-4 flex items-center justify-between hover:bg-rule-line/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-amber-chalk/10 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5 text-amber-chalk" />
                    </div>
                    <div>
                      <p className="font-medium text-chalk">{typeof dept === 'string' ? dept : dept.name}</p>
                      {typeof dept === 'object' && dept.code && (
                        <p className="text-sm text-chalk/50 font-mono">{dept.code}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(dept)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(typeof dept === 'string' ? dept : dept.name)} className="text-rust hover:bg-rust/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in">
          <div className="w-full max-w-md bg-chalkboard border border-rule-line rounded-xl p-6 animate-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-medium text-xl text-chalk">
                {editingDept ? 'Edit Department' : 'Create Department'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingDept(null); }} className="p-1 text-chalk/50 hover:text-chalk">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Department Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Computer Science Engineering"
                required
              />
              <Input
                label="Code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="e.g., CSE"
                maxLength={10}
                required
              />
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditingDept(null); }} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={submitting} className="flex-1">
                  {editingDept ? 'Save Changes' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



