import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Loader2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { chatApi } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

export function HistoryPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [deletingId, setDeletingId] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchConversations();
    fetchSubjects();
  }, [isAuthenticated, navigate, pagination.page, subjectFilter]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await chatApi.history({ page: pagination.page, limit: pagination.limit, subject: subjectFilter });
      setConversations(res.data.conversations);
      setPagination(prev => ({ ...prev, ...res.data.pagination }));
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await chatApi.history({ limit: 100 });
      const uniqueSubjects = [...new Set(res.data.conversations.map(c => c.subject))];
      setSubjects(uniqueSubjects);
    } catch {
      console.error('Failed to fetch subjects');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this conversation?')) return;
    setDeletingId(id);
    try {
      await chatApi.deleteConversation(id);
      fetchConversations();
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpen = (id) => {
    navigate(`/ask?conversation=${id}`);
  };

  const filteredConversations = conversations.filter(c => 
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-medium text-2xl text-chalk">History</h1>
        <p className="text-chalk/60">Your past conversations</p>
      </div>

      <Card padding="p-0">
        <CardHeader className="p-4 border-b border-rule-line">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-chalk/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-rule-line/30 border border-rule-line text-chalk placeholder:text-chalk/40 focus:outline-none focus:border-amber-chalk"
              />
            </div>
            <Select
              value={subjectFilter}
              onChange={(e) => { setSubjectFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              placeholder="All subjects"
              options={[{ value: '', label: 'All subjects' }, ...subjects.map(s => ({ value: s, label: s }))]}
              className="w-48"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-chalk mx-auto mb-2" />
              <p className="text-chalk/60">Loading history...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
              <h3 className="font-display font-medium text-lg text-chalk mb-2">No conversations yet</h3>
              <p className="text-chalk/60 mb-6">Start asking questions to build your history</p>
              <Button onClick={() => navigate('/ask')}>
                Ask a question
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-rule-line">
              {filteredConversations.map(conv => (
                <div key={conv.id} className="p-4 hover:bg-rule-line/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-chalk truncate">{conv.title || 'Untitled conversation'}</h4>
                        <span className="text-xs text-chalk/50 whitespace-nowrap">
                          {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-chalk/60">
                        <span className="px-2 py-0.5 bg-amber-chalk/10 text-amber-chalk rounded text-xs font-mono">
                          {conv.subject}
                        </span>
                        <span>{conv.messageCount} messages</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpen(conv.id)}>
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Open</span>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(conv.id)} 
                        disabled={deletingId === conv.id}
                        className="text-rust hover:bg-rust/10"
                      >
                        {deletingId === conv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} 
                  disabled={pagination.page === pagination.pages || loading}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



