import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Loader2, 
  Server, 
  Database, 
  Cpu, 
  HardDrive,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  Users
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/utils/api';

export function AdminStatusPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;
    fetchStatus();
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      const res = await adminApi.status();
      setStatus(res.data.system);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    } finally {
      setLoading(false);
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

  const serviceChecks = [
    { name: 'MongoDB', status: status ? 'healthy' : 'unknown', icon: Database, detail: 'Primary database' },
    { name: 'Chroma', status: status?.chroma?.status || 'unknown', icon: Database, detail: `${status?.chroma?.collections || 0} collections` },
    { name: 'Ollama', status: status?.ollama?.status || 'unknown', icon: Cpu, detail: `${status?.ollama?.models?.length || 0} models loaded` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-medium text-2xl text-chalk">System Status</h1>
          <p className="text-chalk/60">Monitor system health and services</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-chalk/60">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-rule-line text-amber-chalk focus:ring-amber-chalk"
            />
            Auto-refresh (30s)
          </label>
          <Button variant="secondary" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sage/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{status?.users || 0}</p>
              <p className="text-sm text-chalk/60">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-chalk/10 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-amber-chalk" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{status?.documents || 0}</p>
              <p className="text-sm text-chalk/60">Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sage/10 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{status?.chroma?.collections || 0}</p>
              <p className="text-sm text-chalk/60">Vector Collections</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-chalk/10 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-amber-chalk" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{status?.ollama?.models?.length || 0}</p>
              <p className="text-sm text-chalk/60">LLM Models</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Service Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-chalk" />
              </div>
            ) : (
              <div className="space-y-3">
                {serviceChecks.map(svc => {
                  const Icon = svc.icon;
                  const healthy = svc.status === 'healthy';
                  return (
                    <div key={svc.name} className="flex items-center justify-between p-3 rounded-lg bg-rule-line/30">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${healthy ? 'bg-sage/10' : 'bg-rust/10'}`}>
                          <Icon className={`w-5 h-5 ${healthy ? 'text-sage' : 'text-rust'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-chalk">{svc.name}</p>
                          <p className="text-sm text-chalk/50">{svc.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${healthy ? 'bg-sage' : 'bg-rust'}`} />
                        <span className={`text-sm font-medium ${healthy ? 'text-sage' : 'text-rust'}`}>
                          {healthy ? 'Healthy' : 'Unhealthy'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Ollama Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-chalk" />
              </div>
            ) : status?.ollama?.models?.length ? (
              <div className="space-y-3">
                {status.ollama.models.map(model => (
                  <div key={model} className="flex items-center justify-between p-3 rounded-lg bg-rule-line/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-chalk/10 rounded-lg flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-amber-chalk" />
                      </div>
                      <p className="font-mono text-sm text-chalk">{model}</p>
                    </div>
                    <span className="px-2 py-1 text-xs bg-sage/10 text-sage rounded">Loaded</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-chalk/60">
                <WifiOff className="w-8 h-8 mb-2" />
                <p>No models loaded in Ollama</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Document Processing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-amber-chalk" />
            </div>
          ) : status?.documentStatus?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-rule-line">
                    <th className="text-left p-3 font-medium text-chalk/60">Status</th>
                    <th className="text-right p-3 font-medium text-chalk/60">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {status.documentStatus.map(item => (
                    <tr key={item._id} className="border-b border-rule-line/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            item._id === 'indexed' ? 'bg-sage' : 
                            item._id === 'processing' ? 'bg-amber-chalk animate-pulse' : 'bg-rust'
                          }`} />
                          <span className="capitalize text-chalk">{item._id}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-chalk">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-chalk/60 text-center py-8">No document data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



