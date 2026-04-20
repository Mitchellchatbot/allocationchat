import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TimeRange = 'week' | 'month' | 'all';

interface PageAnalyticsData {
  url: string;
  page_title: string | null;
  chat_opens: number;
  human_escalations: number;
  conversion_rate: number;
}

interface DailyTrendData {
  date: string;
  chat_opens: number;
  human_escalations: number;
}

interface UsePageAnalyticsResult {
  data: PageAnalyticsData[];
  dailyTrends: DailyTrendData[];
  totals: {
    total_chat_opens: number;
    total_human_escalations: number;
    avg_conversion_rate: number;
  };
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
}

export const usePageAnalytics = (propertyId?: string): UsePageAnalyticsResult => {
  const [rawEvents, setRawEvents] = useState<{ url: string; page_title: string | null; event_type: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('page_analytics_events')
          .select('url, page_title, event_type, created_at')
          .order('created_at', { ascending: false });

        // Add property filter if provided
        if (propertyId) {
          query = query.eq('property_id', propertyId);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        setRawEvents(data || []);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [propertyId]);

  // Filter and aggregate data based on time range
  const { data, totals, dailyTrends } = useMemo(() => {
    const now = new Date();
    let cutoffDate: Date | null = null;

    if (timeRange === 'week') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'month') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Filter events by time range
    const filteredEvents = cutoffDate
      ? rawEvents.filter(e => new Date(e.created_at) >= cutoffDate)
      : rawEvents;

    // Aggregate by URL
    const urlMap = new Map<string, { page_title: string | null; chat_opens: number; human_escalations: number }>();
    // Aggregate by day
    const dayMap = new Map<string, { chat_opens: number; human_escalations: number }>();

    for (const event of filteredEvents) {
      // URL aggregation
      const existing = urlMap.get(event.url) || { page_title: event.page_title, chat_opens: 0, human_escalations: 0 };
      if (event.event_type === 'chat_open') existing.chat_opens++;
      else if (event.event_type === 'human_escalation') existing.human_escalations++;
      if (event.page_title && !existing.page_title) existing.page_title = event.page_title;
      urlMap.set(event.url, existing);

      // Daily aggregation
      const day = event.created_at.slice(0, 10); // YYYY-MM-DD
      const dayEntry = dayMap.get(day) || { chat_opens: 0, human_escalations: 0 };
      if (event.event_type === 'chat_open') dayEntry.chat_opens++;
      else if (event.event_type === 'human_escalation') dayEntry.human_escalations++;
      dayMap.set(day, dayEntry);
    }

    // Convert to array and calculate conversion rates
    const aggregatedData: PageAnalyticsData[] = Array.from(urlMap.entries())
      .map(([url, stats]) => ({
        url,
        page_title: stats.page_title,
        chat_opens: stats.chat_opens,
        human_escalations: stats.human_escalations,
        conversion_rate: stats.chat_opens > 0 
          ? (stats.human_escalations / stats.chat_opens) * 100 
          : 0,
      }))
      .sort((a, b) => b.human_escalations - a.human_escalations);

    // Daily trends sorted by date
    const dailyTrends: DailyTrendData[] = Array.from(dayMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate totals
    const total_chat_opens = aggregatedData.reduce((sum, d) => sum + d.chat_opens, 0);
    const total_human_escalations = aggregatedData.reduce((sum, d) => sum + d.human_escalations, 0);
    const avg_conversion_rate = total_chat_opens > 0 
      ? (total_human_escalations / total_chat_opens) * 100 
      : 0;

    return {
      data: aggregatedData,
      dailyTrends,
      totals: {
        total_chat_opens,
        total_human_escalations,
        avg_conversion_rate,
      },
    };
  }, [rawEvents, timeRange]);

  return {
    data,
    dailyTrends,
    totals,
    loading,
    error,
    timeRange,
    setTimeRange,
  };
};
