import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, Globe, MessageSquare, BarChart3, Phone, UserCheck, AlertTriangle } from 'lucide-react';

interface PlatformStats {
  totalClients: number;
  totalAgents: number;
  totalConversations: number;
  totalProperties: number;
  activeConversations: number;
  totalPhones: number;
  totalLeads: number;
  openComplaints: number;
}

export function AdminStatsCards({ stats }: { stats: PlatformStats }) {
  const cards = [
    { title: 'Total Clients', value: stats.totalClients, sub: 'Website owners', icon: Building2 },
    { title: 'Total Agents', value: stats.totalAgents, sub: 'Chat representatives', icon: Users },
    { title: 'Properties', value: stats.totalProperties, sub: 'Websites with widget', icon: Globe },
    { title: 'Conversations', value: stats.totalConversations, sub: 'All time', icon: MessageSquare },
    { title: 'Active Chats', value: stats.activeConversations, sub: 'Active & pending', icon: BarChart3, highlight: true },
    { title: 'Phones Captured', value: stats.totalPhones, sub: 'Visitors with phone', icon: Phone },
    { title: 'Total Leads', value: stats.totalLeads, sub: 'Name, email, or phone', icon: UserCheck },
    { title: 'Open Complaints', value: stats.openComplaints, sub: 'Needs attention', icon: AlertTriangle, warn: stats.openComplaints > 0 },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4 mb-8">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{c.title}</CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.highlight ? 'text-green-600' : ''} ${c.warn ? 'text-destructive' : ''}`}>
              {c.value}
            </div>
            <p className="text-xs text-muted-foreground">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
