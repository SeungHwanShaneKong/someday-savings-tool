import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Users, FileText, Clock, TrendingUp, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Analytics {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalBudgets: number;
  totalPageViews: number;
  avgSessionDuration: number;
  userTrend: { date: string; count: number }[];
  pageViewTrend: { date: string; count: number }[];
  topPages: { page: string; views: number }[];
}

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    if (!adminLoading && !isAdmin) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      fetchAnalytics();
    }
  }, [user, authLoading, isAdmin, adminLoading, navigate]);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const weekAgo = subDays(now, 7);

      // Fetch user stats from profiles
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: newUsersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());

      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      // Fetch budget stats
      const { count: totalBudgets } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true });

      // Fetch page view stats
      const { data: pageViews } = await supabase
        .from('page_views')
        .select('*');

      const totalPageViews = pageViews?.length || 0;
      const avgSessionDuration = pageViews?.length 
        ? Math.round(pageViews.reduce((acc, pv) => acc + (pv.duration_seconds || 0), 0) / pageViews.length)
        : 0;

      // Calculate user trend (last 7 days)
      const { data: userTrendData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', weekAgo.toISOString());

      const userTrend = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        const dateStr = format(date, 'MM/dd');
        const count = userTrendData?.filter(u => {
          const createdDate = new Date(u.created_at);
          return createdDate >= startOfDay(date) && createdDate <= endOfDay(date);
        }).length || 0;
        return { date: dateStr, count };
      });

      // Calculate page view trend
      const pageViewTrend = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(now, 6 - i);
        const dateStr = format(date, 'MM/dd');
        const count = pageViews?.filter(pv => {
          const viewDate = new Date(pv.created_at);
          return viewDate >= startOfDay(date) && viewDate <= endOfDay(date);
        }).length || 0;
        return { date: dateStr, count };
      });

      // Calculate top pages
      const pageCount: Record<string, number> = {};
      pageViews?.forEach(pv => {
        pageCount[pv.page_path] = (pageCount[pv.page_path] || 0) + 1;
      });
      const topPages = Object.entries(pageCount)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      setAnalytics({
        totalUsers: totalUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        totalBudgets: totalBudgets || 0,
        totalPageViews,
        avgSessionDuration,
        userTrend,
        pageViewTrend,
        topPages,
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || adminLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-heading font-semibold">관리자 대시보드</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Key Metrics */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-small">전체 사용자</span>
            </div>
            <p className="text-display font-bold text-primary">{analytics?.totalUsers || 0}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-small">오늘 가입</span>
            </div>
            <p className="text-display font-bold text-green-500">+{analytics?.newUsersToday || 0}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-small">생성된 예산</span>
            </div>
            <p className="text-display font-bold">{analytics?.totalBudgets || 0}</p>
          </Card>

          <Card className="p-6 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-small">평균 체류시간</span>
            </div>
            <p className="text-display font-bold">{analytics?.avgSessionDuration || 0}초</p>
          </Card>
        </section>

        {/* Charts Row */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* User Trend */}
          <Card className="p-6">
            <h2 className="text-body-lg font-semibold mb-4">주간 가입자 추이</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.userTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Page View Trend */}
          <Card className="p-6">
            <h2 className="text-body-lg font-semibold mb-4">주간 페이지뷰 추이</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics?.pageViewTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Top Pages */}
        <Card className="p-6">
          <h2 className="text-body-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            인기 페이지
          </h2>
          <div className="space-y-3">
            {analytics?.topPages?.length ? (
              analytics.topPages.map((page, index) => (
                <div key={page.page} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-small font-semibold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-body">{page.page}</span>
                  </div>
                  <span className="text-body font-semibold">{page.views}회</span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">아직 데이터가 없어요</p>
            )}
          </div>
        </Card>

        {/* Weekly Stats Summary */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h2 className="text-body-lg font-semibold mb-2">이번 주 요약</h2>
          <p className="text-muted-foreground">
            이번 주에 <span className="text-primary font-semibold">{analytics?.newUsersThisWeek || 0}명</span>의 새로운 사용자가 가입했고, 
            총 <span className="text-primary font-semibold">{analytics?.totalPageViews || 0}회</span>의 페이지 조회가 있었어요.
          </p>
        </Card>
      </main>
    </div>
  );
}
