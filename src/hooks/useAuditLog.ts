import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type AuditAction = 'view' | 'update' | 'export' | 'delete';
type ResourceType = 'visitor' | 'conversation' | 'message';

interface AuditLogEntry {
  action: AuditAction;
  resource_type: ResourceType;
  resource_id: string;
  property_id?: string;
  phi_fields_accessed?: string[];
  details?: Record<string, unknown>;
}

export function useAuditLog() {
  const { user } = useAuth();

  const logAccess = useCallback(async (entry: AuditLogEntry) => {
    if (!user) return;

    try {
      await supabase.from('phi_audit_logs').insert([{
        user_id: user.id,
        user_email: user.email,
        action: entry.action,
        resource_type: entry.resource_type,
        resource_id: entry.resource_id,
        property_id: entry.property_id,
        phi_fields_accessed: entry.phi_fields_accessed,
        details: entry.details as any,
      }]);
    } catch (error) {
      // Audit logging should never block user actions
      console.error('Audit log failed:', error);
    }
  }, [user]);

  return { logAccess };
}
