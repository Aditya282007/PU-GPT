import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Users, 
  FileText, 
  Database, 
  Server, 
  Activity,
  Loader2,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { adminApi } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

export function AdminDashboardPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchStatus();
  }, [isAuthenticated, isAdmin]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await adminApi.status();
      setStatus(res.data.system);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
        <h3 className="font-display font-medium text-lg text-chalk mb-2">Access Denied</h3>
        <p className="text-chalk/60">Admin access required</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: status?.users || 0, icon: Users, color: 'text-amber-chalk', bg: 'bg-amber-chalk/10' },
    { label: 'Documents', value: status?.documents || 0, icon: FileText, color: 'text-sage', bg: 'bg-sage/10' },
    { label: 'Vector Collections', value: status?.chroma?.collections || 0, icon: Database, color: 'text-amber-chalk', bg: 'bg-amber-chalk/10' },
    { label: 'Ollama Models', value: status?.ollama?.models?.length || 0, icon: Server, color: 'text-sage', bg: 'bg-sage/10' },
  ];

  const chromaStatus = status?.chroma?.status || 'unknown';
  const ollamaStatus = status?.ollama?.status || 'unknown';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-medium text-2xl text-chalk">System Dashboard</h1>
          <p className="text-chalk/60">System health and overview</p>
        </div>
        <button onClick={fetchStatus} className="btn-secondary" disabled={loading}>
          <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-chalk">{value}</p>
                <p className="text-sm text-chalk/60">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Document Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-chalk" />
              </div>
            ) : status?.documentStatus?.length ? (
              <div className="space-y-3">
                {status.documentStatus.map(item => (
                  <div key={item._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        item._id === 'indexed' ? 'bg-sage' : 
                        item._id === 'processing' ? 'bg-amber-chalk animate-pulse' : 'bg-rust'
                      }`} />
                      <span className="capitalize text-chalk">{item._id}</span>
                    </div>
                    <span className="font-mono text-chalk/70">{item.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-chalk/60 text-center py-8">No document data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-rule-line/30">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${chromaStatus === 'healthy' ? 'bg-sage' : 'bg-rust'}`} />
                  <span className="font-medium text-chalk">Chroma Vector Store</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${chromaStatus === 'healthy' ? 'bg-sage/20 text-sage' : 'bg-rust/20 text-rust'}`}>
                  {chromaStatus}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rule-line/30">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${ollamaStatus === 'healthy' ? 'bg-sage' : 'bg-rust'}`} />
                  <span className="font-medium text-chalk">Ollama LLM Server</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${ollamaStatus === 'healthy' ? 'bg-sage/20 text-sage' : 'bg-rust/20 text-rust'}`}>
                  {ollamaStatus}
                </span>
              </div>
              {ollamaStatus === 'healthy' && status?.ollama?.models && (
                <div className="pt-2">
                  <p className="text-sm text-chalk/60 mb-2">Available Models:</p>
                  <div className="flex flex-wrap gap-2">
                    {status.ollama.models.map(model => (
                      <span key={model} className="px-2 py-1 text-xs bg-rule-line/30 text-chalk/70 rounded font-mono">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button className="btn-secondary text-left p-4 hover:bg-rule-line/50 transition-colors">
              <div className="w-10 h-10 bg-amber-chalk/10 rounded-lg flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-amber-chalk" />
              </div>
              <p className="font-medium text-chalk">Manage Users</p>
              <p className="text-sm text-chalk/60">View and edit user accounts</p>
            </button>
            <button className="btn-secondary text-left p-4 hover:bg-rule-line/50 transition-colors">
              <div className="w-10 h-10 bg-sage/10 rounded-lg flex items-center justify-center mb-2">
                <Database className="w-5 h-5 text-sage" />
              </div>
              <p className="font-medium text-chalk">Departments</p>
              <p className="text-sm text-chalk/60">Configure department structure</p>
            </button>
            <button className="btn-secondary text-left p-4 hover:bg-rule-line/50 transition-colors">
              <div className="w-10 h-10 bg-rust/10 rounded-lg flex items-center justify-center mb-2">
                <FileText className="w-5 h-5 text-rust" />
              </div>
              <p className="font-medium text-chalk">View All Documents</p>
              <p className="text-sm text-chalk/60">Browse all uploaded content</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



