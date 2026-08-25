import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  MessageSquare,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { chatApi, teacherApi } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

const STATUS_CONFIG = {
  open: { icon: Clock, color: 'text-amber-chalk', bg: 'bg-amber-chalk/10', label: 'Open' },
  answered: { icon: CheckCircle, color: 'text-sage', bg: 'bg-sage/10', label: 'Answered' },
};

export function FlaggedPage() {
  const { user, isAuthenticated, isTeacher, isAdmin } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [convertToContent, setConvertToContent] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchQuestions();
  }, [isAuthenticated]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const apiCall = (isTeacher || isAdmin) ? teacherApi.flagged : chatApi.flagged;
      const res = await apiCall({});
      setQuestions(res.data.flaggedQuestions || []);
    } catch (err) {
      console.error('Failed to fetch flagged questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (questionId) => {
    if (!responseText.trim()) return;
    try {
      await teacherApi.respond(questionId, responseText, convertToContent);
      setRespondingTo(null);
      setResponseText('');
      setConvertToContent(false);
      fetchQuestions();
    } catch (err) {
      console.error('Failed to respond:', err);
      alert('Failed to submit response');
    }
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-chalk mx-auto mb-2" />
        <p className="text-chalk/60">Loading...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-12 text-center">
        <MessageSquare className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
        <h3 className="font-display font-medium text-lg text-chalk mb-2">
          {isTeacher || isAdmin ? 'No flagged questions' : 'No escalated questions'}
        </h3>
        <p className="text-chalk/60">
          {isTeacher || isAdmin 
            ? 'Questions the system couldn\'t answer will appear here' 
            : 'Your escalated questions will appear here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display font-medium text-2xl text-chalk">
          {isTeacher || isAdmin ? 'Flagged Questions' : 'My Escalated Questions'}
        </h1>
        <p className="text-chalk/60">
          {isTeacher || isAdmin 
            ? 'Questions the system couldn\'t answer confidently' 
            : 'Questions that were passed to your instructor'}
        </p>
      </div>

      <div className="space-y-4">
        {questions.map(q => {
          const config = STATUS_CONFIG[q.status];
          const Icon = config?.icon;
          const isExpanded = expanded[q._id];

          return (
            <Card key={q._id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${config?.bg}`}>
                    <Icon className={`w-5 h-5 ${config?.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-chalk mb-1">{q.question}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-chalk/60">
                          <span className="font-mono">{q.subject}</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded ${config?.bg} ${config?.color}`}>
                            {config?.label || q.status}
                          </span>
                          <span>{formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleExpand(q._id)}
                        className="p-1 text-chalk/40 hover:text-chalk transition-colors"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <ArrowRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-rule-line animate-in space-y-4">
                        {q.teacherResponse && (
                          <div className="bg-sage/10 border border-sage/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-sage" />
                              <span className="font-medium text-sage">Teacher Response</span>
                              {q.answeredBy?.name && (
                                <span className="text-xs text-chalk/50">by {q.answeredBy.name}</span>
                              )}
                              {q.answeredAt && (
                                <span className="text-xs text-chalk/50">
                                  {formatDistanceToNow(new Date(q.answeredAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <p className="text-chalk/80 whitespace-pre-wrap">{q.teacherResponse}</p>
                          </div>
                        )}

                        {q.reason && (
                          <div className="flex items-center gap-2 text-sm text-chalk/60">
                            <AlertCircle className="w-4 h-4 text-amber-chalk" />
                            <span>Reason: {q.reason.replace('_', ' ')}</span>
                          </div>
                        )}

                        {(isTeacher || isAdmin) && q.status === 'open' && (
                          <div className="border-t border-rule-line pt-4">
                            {respondingTo === q._id ? (
                              <div className="space-y-3">
                                <textarea
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  placeholder="Write your response..."
                                  className="w-full min-h-[100px] px-4 py-3 rounded-lg bg-rule-line/30 border border-rule-line text-chalk placeholder:text-chalk/40 focus:outline-none focus:border-amber-chalk resize-none"
                                  rows={4}
                                />
                                <label className="flex items-center gap-2 text-sm text-chalk/60">
                                  <input
                                    type="checkbox"
                                    checked={convertToContent}
                                    onChange={(e) => setConvertToContent(e.target.checked)}
                                    className="w-4 h-4 rounded border-rule-line text-amber-chalk focus:ring-amber-chalk"
                                  />
                                  Convert to indexed content
                                </label>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRespond(q._id)}
                                    className="btn-primary"
                                    disabled={!responseText.trim()}
                                  >
                                    Submit Response
                                  </button>
                                  <button
                                    onClick={() => setRespondingTo(null)}
                                    className="btn-secondary"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setRespondingTo(q._id)}
                                className="btn-primary"
                              >
                                <MessageSquare className="w-4 h-4" />
                                Respond
                              </button>
                            )}
                          </div>
                        )}

                        {(!isTeacher && !isAdmin) && q.status === 'open' && (
                          <div className="flex items-center gap-2 text-sm text-chalk/60">
                            <Clock className="w-4 h-4 text-amber-chalk" />
                            <span>Waiting for instructor response...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}



