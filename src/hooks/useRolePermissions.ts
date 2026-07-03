import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth, AppRole } from './useAuth';

export interface RolePermission {
  id: string;
  role: AppRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'masters', label: 'Master Data' },
  { id: 'hr', label: 'HR & Payroll' },
  { id: 'purchase', label: 'Purchase' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'sales', label: 'Sales' },
  { id: 'accounting', label: 'Accounting' },
  { id: 'production', label: 'Production' },
  { id: 'quality', label: 'Quality' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'mixing', label: 'Mixing' },
  { id: 'tooling', label: 'Tooling Shop' },
  { id: 'finance', label: 'Operational Finance' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
] as const;

export type ModuleId = typeof MODULES[number]['id'];

export function useRolePermissions() {
  return useQuery({
    queryKey: ['role_permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('module');

      if (error) throw error;
      return data as RolePermission[];
    },
  });
}

export function useRolePermissionsByRole(role: AppRole | null) {
  return useQuery({
    queryKey: ['role_permissions', role],
    queryFn: async () => {
      if (!role) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role)
        .order('module');

      if (error) throw error;
      return data as RolePermission[];
    },
    enabled: !!role,
  });
}

export function useUpdateRolePermission() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      role,
      module,
    }: {
      id: string;
      updates: Partial<Pick<RolePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>>;
      role: string;
      module: string;
    }) => {
      const { data, error } = await supabase
        .from('role_permissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (user) {
        await supabase.rpc('log_role_activity', {
          p_action: 'permission_updated',
          p_actor_id: user.id,
          p_target_user_id: null,
          p_role: role,
          p_details: { module, updates },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role_permissions'] });
      toast({ title: 'Permission updated', description: 'The role permission has been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating permission', description: error.message, variant: 'destructive' });
    },
  });
}

export function useBulkUpdateRolePermissions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      role,
      permissions,
    }: {
      role: AppRole;
      permissions: Array<{
        module: string;
        can_view: boolean;
        can_create: boolean;
        can_edit: boolean;
        can_delete: boolean;
      }>;
    }) => {
      for (const perm of permissions) {
        const { error } = await supabase
          .from('role_permissions')
          .update({
            can_view: perm.can_view,
            can_create: perm.can_create,
            can_edit: perm.can_edit,
            can_delete: perm.can_delete,
          })
          .eq('role', role)
          .eq('module', perm.module);

        if (error) throw error;
      }

      if (user) {
        await supabase.rpc('log_role_activity', {
          p_action: 'permissions_bulk_updated',
          p_actor_id: user.id,
          p_target_user_id: null,
          p_role: role,
          p_details: { permissions },
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role_permissions'] });
      toast({ title: 'Permissions updated', description: 'All permissions have been updated successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating permissions', description: error.message, variant: 'destructive' });
    },
  });
}
