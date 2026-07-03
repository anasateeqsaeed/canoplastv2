import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RoleActivityLog {
  id: string;
  action: string;
  actor_id: string | null;
  target_user_id: string | null;
  role: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor_email?: string;
  target_user_email?: string;
}

export function useRoleActivityLog(filters?: {
  role?: string;
  action?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['role_activity_log', filters],
    queryFn: async () => {
      let query = supabase
        .from('role_activity_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }
      if (filters?.action) {
        query = query.eq('action', filters.action);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Fetch profile emails for actor and target users
      const actorIds = [...new Set(data.map(d => d.actor_id).filter(Boolean))];
      const targetIds = [...new Set(data.map(d => d.target_user_id).filter(Boolean))];
      const allUserIds = [...new Set([...actorIds, ...targetIds])];

      let profilesMap: Record<string, string> = {};
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email')
          .in('user_id', allUserIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            if (p.user_id && p.email) {
              acc[p.user_id] = p.email;
            }
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return data.map(log => ({
        ...log,
        actor_email: log.actor_id ? profilesMap[log.actor_id] : undefined,
        target_user_email: log.target_user_id ? profilesMap[log.target_user_id] : undefined,
      })) as RoleActivityLog[];
    },
  });
}

export const ACTION_LABELS: Record<string, string> = {
  role_assigned: 'Role Assigned',
  role_removed: 'Role Removed',
  permission_updated: 'Permission Updated',
  permissions_bulk_updated: 'Permissions Bulk Updated',
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deactivated: 'User Deactivated',
};
