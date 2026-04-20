import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Loader2, TrendingUp } from 'lucide-react';

interface DayData {
  day: string;
  new_conversations: number;
  leads_captured: number;
  phones_captured: number;
}

export function AdminActivityChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: rows, error } = await supabase.rpc('admin_daily_stats', { p_days: 30 });
      if (!error && rows) {
        setData((rows as any[]).map(r => ({
          day: new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          new_conversations: Number(r.new_conversations),
          leads_captured: Number(r.leads_captured),
          phones_captured: Number(r.phones_captured),
        })));
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const totalConvos = data.reduce((s, d) => s + d.new_conversations, 0);
  const totalLeads = data.reduce((s, d) => s + d.leads_captured, 0);
  const totalPhones = data.reduce((s, d) => s + d.phones_captured, 0);

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Platform Activity — Last 30 Days
            </CardTitle>
            <CardDescription>Daily conversations, leads, and phone captures across all clients</CardDescription>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalConvos}</p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{totalPhones}</p>
              <p className="text-xs text-muted-foreground">Phones</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading chart...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorConvos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPhones" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} className="text-muted-foreground" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area type="monotone" dataKey="new_conversations" name="Conversations" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorConvos)" strokeWidth={2} />
              <Area type="monotone" dataKey="leads_captured" name="Leads" stroke="#22c55e" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={2} />
              <Area type="monotone" dataKey="phones_captured" name="Phones" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPhones)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
