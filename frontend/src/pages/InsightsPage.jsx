import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Loader2, 
  TrendingUp, 
  BookOpen, 
  Users,
  AlertCircle,
  Clock,
  BarChart2,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { teacherApi } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

export function InsightsPage() {
  const { user, isAuthenticated, isTeacher, isAdmin } = useAuth();
  const [insights, setInsights] = useState({ topTopics: [], bySubject: [], totalQuestions: 0, periodDays: 7 });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(7);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchInsights();
  }, [isAuthenticated, period]);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await teacherApi.insights({ days: period });
      setInsights(res.data.insights);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isTeacher && !isAdmin) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-16 h-16 text-chalk/30 mx-auto mb-4" />
        <h3 className="font-display font-medium text-lg text-chalk mb-2">Access Denied</h3>
        <p className="text-chalk/60">This page is only available for teachers and administrators</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display font-medium text-2xl text-chalk">Topic Insights</h1>
          <p className="text-chalk/60">What students are asking about this week</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-4 py-2 rounded-lg bg-rule-line/30 border border-rule-line text-chalk focus:outline-none focus:border-amber-chalk"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
          <button onClick={fetchInsights} className="btn-secondary" disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-chalk/10 rounded-lg flex items-center justify-center">
              <BarChart2 className="w-6 h-6 text-amber-chalk" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{insights.totalQuestions}</p>
              <p className="text-sm text-chalk/60">Total Questions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sage/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-sage" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{insights.bySubject.length}</p>
              <p className="text-sm text-chalk/60">Active Subjects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-chalk/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-chalk" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{insights.topTopics.length}</p>
              <p className="text-sm text-chalk/60">Top Topics</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rust/10 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-rust" />
            </div>
            <div>
              <p className="text-2xl font-bold text-chalk">{period}d</p>
              <p className="text-sm text-chalk/60">Analysis Period</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Topics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-chalk" />
              </div>
            ) : insights.topTopics.length === 0 ? (
              <p className="text-chalk/60 text-center py-8">No topics to display</p>
            ) : (
              <div className="space-y-3">
                {insights.topTopics.map((item, index) => (
                  <div key={item.topic} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-medium text-chalk/50">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-chalk capitalize">{item.topic}</p>
                      <div className="h-2 bg-rule-line rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-chalk" 
                          style={{ width: `${Math.min((item.count / (insights.topTopics[0]?.count || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-chalk/50 font-mono">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Questions by Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-chalk" />
              </div>
            ) : insights.bySubject.length === 0 ? (
              <p className="text-chalk/60 text-center py-8">No subject data</p>
            ) : (
              <div className="space-y-3">
                {insights.bySubject.map((item, index) => (
                  <div key={item.subject} className="flex items-center gap-3">
                    <span className="w-6 text-center text-sm font-medium text-chalk/50">{index + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-chalk">{item.subject}</p>
                      <div className="h-2 bg-rule-line rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-sage" 
                          style={{ width: `${Math.min((item.count / (insights.bySubject[0]?.count || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm text-chalk/50 font-mono">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button className="btn-secondary text-left p-4 hover:bg-rule-line/50 transition-colors">
              <div className="w-10 h-10 bg-amber-chalk/10 rounded-lg flex items-center justify-center mb-2">
                <AlertCircle className="w-5 h-5 text-amber-chalk" />
              </div>
              <p className="font-medium text-chalk">Review Flagged</p>
              <p className="text-sm text-chalk/60">Check unanswered questions</p>
            </button>
            <button className="btn-secondary text-left p-4 hover:bg-rule-line/50 transition-colors">
              <div className="w-10 h-10 bg-sage/10 rounded-lg flex items-center justify-center mb-2">
                <BookOpen className="w-5 h-5 text-sage" />
              </div>
              <p className="font-medium text-chalk">Content Gaps</p>
              <p className="text-sm text-chalk/60">Identify missing topics</p>
            </button>
            <button className="btn-secondary text-left p-4 hover:bg-rule-line/50 transition-colors">
              <div className="w-10 h-10 bg-rust/10 rounded-lg flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-rust" />
              </div>
              <p className="font-medium text-chalk">Trending Up</p>
              <p className="text-sm text-chalk/60">Fastest growing topics</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



