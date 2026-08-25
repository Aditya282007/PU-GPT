import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  FileText, 
  Loader2, 
  Filter, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Trash2,
  MoreVertical,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { FileUpload } from '@/components/ui/FileUpload';
import { documentApi } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  indexed: { icon: CheckCircle, color: 'text-sage', bg: 'bg-sage/10', label: 'Indexed' },
  processing: { icon: Loader2, color: 'text-amber-chalk', bg: 'bg-amber-chalk/10', label: 'Processing' },
  failed: { icon: AlertCircle, color: 'text-rust', bg: 'bg-rust/10', label: 'Failed' },
};

export function LibraryPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ department: '', subject: '', semester: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [subjects, setSubjects] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [uploadSubject, setUploadSubject] = useState('');

  useEffect(() => {
    fetchDocuments();
    fetchSubjects();
  }, [filters, pagination.page]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentApi.list({ ...filters, page: pagination.page, limit: pagination.limit });
      setDocuments(res.data.documents);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

const fetchSubjects = async () => {
    try {
      const res = await documentApi.subjects();
      setSubjects(res.data.subjects);
      if (res.data.subjects.length > 0 && !uploadSubject) {
        setUploadSubject(res.data.subjects[0]);
      }
    } catch {
      console.error('Failed to fetch subjects');
    }
  };

  const handleUpload = async (formData, onProgress) => {
    setUploading(true);
    try {
      await documentApi.upload(formData);
      fetchDocuments();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    setDeletingId(id);
    try {
      await documentApi.delete(id);
      fetchDocuments();
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setFilters({ department: '', subject: '', semester: '', status: '' });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasFilters = Object.values(filters).some(v => v);

return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-medium text-2xl text-chalk">Content Library</h1>
          <p className="text-chalk/60">Manage your uploaded course materials</p>
        </div>
        <div className="space-y-3">
          <Select
            label="Subject for upload"
            value={uploadSubject}
            onChange={(e) => setUploadSubject(e.target.value)}
            placeholder="Select subject"
            options={subjects.map(s => ({ value: s, label: s }))}
            className="w-full max-w-md"
          />
          <FileUpload 
            onUpload={handleUpload} 
            additionalFields={{ 
              department: user.department || '', 
              subject: uploadSubject,
              semester: filters.semester || '1',
            }}
          />
        </div>
      </div>

      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-chalk/60 bg-amber-chalk/5 border border-amber-chalk/20 rounded-lg px-3 py-2">
          <Filter className="w-4 h-4" />
          Active filters: {Object.entries(filters).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ')}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <Card padding="p-0">
        <CardHeader className="p-4 border-b border-rule-line">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.subject}
                onChange={(e) => { setFilters(prev => ({ ...prev, subject: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                placeholder="All subjects"
                options={[{ value: '', label: 'All subjects' }, ...subjects.map(s => ({ value: s, label: s }))]}
                className="w-48"
              />
              <Select
                value={filters.semester}
                onChange={(e) => { setFilters(prev => ({ ...prev, semester: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                placeholder="All semesters"
                options={['', '1', '2', '3', '4', '5', '6', '7', '8', 'all'].map(s => ({ value: s, label: s || 'All semesters' }))}
                className="w-40"
              />
              <Select
                value={filters.status}
                onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setPagination(prev => ({ ...prev, page: 1 })); }}
                placeholder="All statuses"
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'indexed', label: 'Indexed' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'failed', label: 'Failed' },
                ]}
                className="w-40"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-chalk mx-auto mb-2" />
              <p className="text-chalk/60">Loading documents...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
              <h3 className="font-display font-medium text-lg text-chalk mb-2">Nothing here yet</h3>
              <p className="text-chalk/60 mb-6">Add your first set of notes to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-rule-line">
              {documents.map(doc => (
                <div key={doc.id} className="p-4 hover:bg-rule-line/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-12 h-12 bg-rule-line/50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-chalk/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-chalk truncate">{doc.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_CONFIG[doc.status]?.bg} ${STATUS_CONFIG[doc.status]?.color}`}>
                            {STATUS_CONFIG[doc.status]?.label || doc.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-chalk/60">
                        <span className="font-mono">{doc.subject}</span>
                        <span>Semester {doc.semester}</span>
                        {doc.unit && <span>Unit: {doc.unit}</span>}
                        <span>{doc.chunkCount} chunks</span>
                        <span>{formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true })}</span>
                      </div>
                      {doc.status === 'failed' && doc.errorMessage && (
                        <p className="mt-2 text-sm text-rust flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {doc.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="p-2">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)} disabled={deletingId === doc.id} className="p-2 text-rust hover:bg-rust/10">
                        {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
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
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} 
                  disabled={pagination.page === 1 || loading}
                >
                  Previous
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} 
                  disabled={pagination.page === pagination.pages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



