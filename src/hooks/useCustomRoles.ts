import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface CustomRole {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomRolePermission {
  id: string;
  custom_role_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserCustomRoleAssignment {
  id: string;
  user_id: string;
  custom_role_id: string;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) ||
  `role_${Date.now()}`;

export function useCustomRoles() {
  return useQuery({
    queryKey: ['custom_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CustomRole[];
    },
  });
}

export function useCustomRolePermissions(customRoleId: string | null) {
  return useQuery({
    queryKey: ['custom_role_permissions', customRoleId],
    enabled: !!customRoleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_role_permissions' as any)
        .select('*')
        .eq('custom_role_id', customRoleId!);
      if (error) throw error;
      return (data ?? []) as unknown as CustomRolePermission[];
    },
  });
}

export function useAllCustomRolePermissions() {
  return useQuery({
    queryKey: ['custom_role_permissions', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_role_permissions' as any)
        .select('*');
      if (error) throw error;
      return (data ?? []) as unknown as CustomRolePermission[];
    },
  });
}

export function useCreateCustomRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string }) => {
      const code = slugify(input.name);
      const { data, error } = await supabase
        .from('custom_roles' as any)
        .insert({
          code,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (user) {
        await supabase.rpc('log_role_activity', {
          p_action: 'custom_role_created',
          p_actor_id: user.id,
          p_target_user_id: null,
          p_role: code,
          p_details: { name: input.name },
        });
      }
      return data as unknown as CustomRole;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_roles'] });
      qc.invalidateQueries({ queryKey: ['custom_role_permissions'] });
      toast({ title: 'Custom role created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateCustomRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<CustomRole, 'name' | 'description' | 'color' | 'is_active'>> }) => {
      const { data, error } = await supabase
        .from('custom_roles' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CustomRole;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_roles'] });
      toast({ title: 'Custom role updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteCustomRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('custom_roles' as any).delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_roles'] });
      qc.invalidateQueries({ queryKey: ['custom_role_permissions'] });
      qc.invalidateQueries({ queryKey: ['user_custom_roles'] });
      toast({ title: 'Custom role deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateCustomRolePermission() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<CustomRolePermission, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'>> }) => {
      const { data, error } = await supabase
        .from('custom_role_permissions' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom_role_permissions'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUserCustomRoles(userId: string | null) {
  return useQuery({
    queryKey: ['user_custom_roles', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_custom_roles' as any)
        .select('*')
        .eq('user_id', userId!);
      if (error) throw error;
      return (data ?? []) as unknown as UserCustomRoleAssignment[];
    },
  });
}

export function useAssignCustomRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, customRoleId, expiresAt }: { userId: string; customRoleId: string; expiresAt?: string | null }) => {
      const { data, error } = await supabase
        .from('user_custom_roles' as any)
        .insert({
          user_id: userId,
          custom_role_id: customRoleId,
          assigned_by: user?.id ?? null,
          expires_at: expiresAt ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_custom_roles'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useRemoveCustomRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('user_custom_roles' as any).delete().eq('id', assignmentId);
      if (error) throw error;
      return assignmentId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user_custom_roles'] });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
