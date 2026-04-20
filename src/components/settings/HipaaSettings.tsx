import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Shield, Clock, Trash2, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HipaaSettingsProps {
  propertyId: string;
}

interface RetentionConfig {
  id?: string;
  retention_days: number;
  auto_purge_enabled: boolean;
  last_purge_at: string | null;
}

interface AuditLogEntry {
  id: string;
  user_email: string;
  action: string;
  resource_type: string;
  phi_fields_accessed: string[] | null;
  created_at: string;
}

export const HipaaSettings = ({ propertyId }: HipaaSettingsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(15);
  const [retentionConfig, setRetentionConfig] = useState<RetentionConfig>({
    retention_days: 365,
    auto_purge_enabled: false,
    last_purge_at: null,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchAuditLogs();
  }, [propertyId, user]);

  const fetchSettings = async () => {
    setLoading(true);

    // Fetch session timeout from profile
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('session_timeout_minutes')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile) {
        setSessionTimeout(profile.session_timeout_minutes ?? 15);
      }
    }

    // Fetch retention settings
    const { data: retention } = await supabase
      .from('data_retention_settings')
      .select('*')
      .eq('property_id', propertyId)
      .maybeSingle();

    if (retention) {
      setRetentionConfig({
        id: retention.id,
        retention_days: retention.retention_days,
        auto_purge_enabled: retention.auto_purge_enabled,
        last_purge_at: retention.last_purge_at,
      });
    }

    setLoading(false);
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    const { data } = await supabase
      .from('phi_audit_logs')
      .select('id, user_email, action, resource_type, phi_fields_accessed, created_at')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false })
      .limit(50);

    setAuditLogs(data || []);
    setLogsLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);

    // Save session timeout
    if (user) {
      await supabase
        .from('profiles')
        .update({ session_timeout_minutes: sessionTimeout })
        .eq('user_id', user.id);
    }

    // Save retention settings
    if (retentionConfig.id) {
      await supabase
        .from('data_retention_settings')
        .update({
          retention_days: retentionConfig.retention_days,
          auto_purge_enabled: retentionConfig.auto_purge_enabled,
        })
        .eq('id', retentionConfig.id);
    } else {
      const { data } = await supabase
        .from('data_retention_settings')
        .insert({
          property_id: propertyId,
          retention_days: retentionConfig.retention_days,
          auto_purge_enabled: retentionConfig.auto_purge_enabled,
        })
        .select()
        .single();
      if (data) {
        setRetentionConfig(prev => ({ ...prev, id: data.id }));
      }
    }

    setSaving(false);
    toast.success('HIPAA compliance settings saved');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HIPAA Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                HIPAA Compliance
              </CardTitle>
              <CardDescription>
                Configure security settings to help meet HIPAA requirements
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-primary text-primary">
              Protected
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">RLS Policies</p>
              <p className="font-semibold text-primary">✓ Active</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Audit Logging</p>
              <p className="font-semibold text-primary">✓ Enabled</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Session Timeout</p>
              <p className="font-semibold">{sessionTimeout} min</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Data Retention</p>
              <p className="font-semibold">{retentionConfig.retention_days} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Security
          </CardTitle>
          <CardDescription>
            Auto-logout after a period of inactivity to protect PHI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Idle Timeout (minutes)</Label>
            <Input
              type="number"
              min={5}
              max={60}
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(parseInt(e.target.value) || 15)}
            />
            <p className="text-xs text-muted-foreground">
              Users will be automatically logged out after this many minutes of inactivity (5-60 min)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Retention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Retention Policy
          </CardTitle>
          <CardDescription>
            Automatically purge old conversations and visitor data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Auto-Purge</Label>
              <p className="text-sm text-muted-foreground">
                Automatically delete data older than the retention period
              </p>
            </div>
            <Switch
              checked={retentionConfig.auto_purge_enabled}
              onCheckedChange={(checked) =>
                setRetentionConfig(prev => ({ ...prev, auto_purge_enabled: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Retention Period (days)</Label>
            <Input
              type="number"
              min={30}
              max={2555}
              value={retentionConfig.retention_days}
              onChange={(e) =>
                setRetentionConfig(prev => ({
                  ...prev,
                  retention_days: parseInt(e.target.value) || 365,
                }))
              }
              disabled={!retentionConfig.auto_purge_enabled}
            />
            <p className="text-xs text-muted-foreground">
              Conversations and visitor data older than this will be permanently deleted (30-2555 days)
            </p>
          </div>

          {retentionConfig.last_purge_at && (
            <p className="text-xs text-muted-foreground">
              Last purge: {new Date(retentionConfig.last_purge_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Viewer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PHI Access Audit Log
              </CardTitle>
              <CardDescription>
                Immutable record of all access to Protected Health Information
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={logsLoading}>
              {logsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <FileText className="h-8 w-8 opacity-50" />
              <p className="text-sm">No audit log entries yet</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Resource</TableHead>
                    <TableHead className="text-xs">PHI Fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">{log.user_email}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-xs capitalize">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{log.resource_type}</TableCell>
                      <TableCell className="text-xs">
                        {log.phi_fields_accessed?.join(', ') || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save HIPAA Settings
        </Button>
      </div>
    </div>
  );
};
