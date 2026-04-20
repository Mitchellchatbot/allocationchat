import { TrendingUp, ExternalLink, Users, MessageSquare, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePageAnalytics, TimeRange } from '@/hooks/usePageAnalytics';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'all', label: 'All Time' },
];

const DUMMY_ANALYTICS_DATA = [
  { url: 'https://yoursite.com/admissions', page_title: 'Admissions Page', chat_opens: 24, human_escalations: 6, conversion_rate: 25.0 },
  { url: 'https://yoursite.com/about', page_title: 'About Us', chat_opens: 18, human_escalations: 3, conversion_rate: 16.7 },
  { url: 'https://yoursite.com/contact', page_title: 'Contact', chat_opens: 12, human_escalations: 4, conversion_rate: 33.3 },
];

const DUMMY_TOTALS = { total_chat_opens: 54, total_human_escalations: 13, avg_conversion_rate: 24.1 };

const DUMMY_DAILY_TRENDS = [
  { date: '2026-02-10', chat_opens: 6, human_escalations: 1 },
  { date: '2026-02-11', chat_opens: 9, human_escalations: 2 },
  { date: '2026-02-12', chat_opens: 7, human_escalations: 1 },
  { date: '2026-02-13', chat_opens: 11, human_escalations: 3 },
  { date: '2026-02-14', chat_opens: 8, human_escalations: 2 },
  { date: '2026-02-15', chat_opens: 5, human_escalations: 2 },
  { date: '2026-02-16', chat_opens: 8, human_escalations: 2 },
];

const CHART_COLORS = {
  primary: 'hsl(24, 95%, 53%)',
  secondary: 'hsl(220, 70%, 55%)',
  muted: 'hsl(220, 14%, 80%)',
};

const PIE_COLORS = [
  'hsl(24, 95%, 53%)',
  'hsl(220, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(45, 90%, 50%)',
];

interface BlogAnalyticsProps {
  propertyId?: string;
}

export const BlogAnalytics = ({ propertyId }: BlogAnalyticsProps) => {
  const [searchParams] = useSearchParams();
  const isTourActive = searchParams.get('tour') === '1';
  const { data: realData, dailyTrends: realTrends, totals: realTotals, loading, error, timeRange, setTimeRange } = usePageAnalytics(propertyId);

  const data = isTourActive && realData.length === 0 ? DUMMY_ANALYTICS_DATA : realData;
  const totals = isTourActive && realData.length === 0 ? DUMMY_TOTALS : realTotals;
  const dailyTrends = isTourActive && realTrends.length === 0 ? DUMMY_DAILY_TRENDS : realTrends;

  const topPages = data.slice(0, 5);

  // Prepare bar chart data (short labels)
  const barData = topPages.map(p => ({
    name: (p.page_title || p.url.split('/').pop() || 'Home').slice(0, 18),
    'Chat Opens': p.chat_opens,
    'Escalations': p.human_escalations,
  }));

  // Prepare pie data
  const pieData = topPages.map(p => ({
    name: (p.page_title || 'Untitled').slice(0, 15),
    value: p.chat_opens,
  }));

  // Format date labels
  const trendData = dailyTrends.map(d => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-destructive text-center">{error}</p>
      </Card>
    );
  }

  const hasData = data.length > 0 || dailyTrends.length > 0;

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex justify-center">
        <div className="flex items-center gap-1 p-1.5 bg-background/60 backdrop-blur-md border border-border/50 rounded-full shadow-sm">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={cn(
                'px-5 py-2 text-sm font-medium rounded-full transition-all duration-200',
                timeRange === option.value
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3" data-tour="analytics-stats">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Chat Opens</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totals.total_chat_opens.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm text-muted-foreground">Escalations</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : totals.total_human_escalations}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Conv Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${totals.avg_conversion_rate.toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !hasData ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No analytics data yet.</p>
          <p className="text-sm mt-1">Data will appear once visitors start using the chat widget.</p>
        </div>
      ) : (
        <>
          {/* Daily Trend Chart */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Daily Activity Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chatGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="escGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '13px' }} />
                      <Area
                        type="monotone"
                        dataKey="chat_opens"
                        name="Chat Opens"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        fill="url(#chatGradient)"
                      />
                      <Area
                        type="monotone"
                        dataKey="human_escalations"
                        name="Escalations"
                        stroke={CHART_COLORS.secondary}
                        strokeWidth={2}
                        fill="url(#escGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Top Performing Pages Table */}
          <Card data-tour="analytics-top-pages">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Top 5 Performing Pages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topPages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No analytics data yet.</p>
                  <p className="text-sm mt-1">Data will appear once visitors start using the chat widget.</p>
                </div>
              ) : (
                topPages.map((page, index) => (
                  <div
                    key={page.url}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm text-foreground truncate">
                            {page.page_title || 'Untitled Page'}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {page.url}
                          </p>
                        </div>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {page.chat_opens.toLocaleString()} opens
                        </Badge>
                        <Badge variant="default" className="text-xs bg-primary/90">
                          {page.human_escalations} escalations
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {page.conversion_rate.toFixed(1)}% conv
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
