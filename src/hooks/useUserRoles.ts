import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from './useAuth';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ProfileWithRoles {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  roles: AppRole[];
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      // Combine profiles with their roles
      const profilesWithRoles: ProfileWithRoles[] = (profiles || []).map(profile => ({
        ...profile,
        roles: (roles || [])
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role as AppRole)
      }));

      return profilesWithRoles;
    },
  });
}

export function useUserRoles(userId: string | null) {
  return useQuery({
    queryKey: ['user_roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role, actorId }: { userId: string; role: AppRole; actorId?: string }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role }])
        .select()
        .single();
      
      if (error) throw error;

      // Log the activity
      if (actorId) {
        await supabase.rpc('log_role_activity', {
          p_action: 'role_assigned',
          p_actor_id: actorId,
          p_target_user_id: userId,
          p_role: role,
          p_details: null
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['role_activity_log'] });
      toast({
        title: 'Role assigned',
        description: 'The role has been assigned successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error assigning role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role, actorId }: { userId: string; role: AppRole; actorId?: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      
      if (error) throw error;

      // Log the activity
      if (actorId) {
        await supabase.rpc('log_role_activity', {
          p_action: 'role_removed',
          p_actor_id: actorId,
          p_target_user_id: userId,
          p_role: role,
          p_details: null
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_roles'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['role_activity_log'] });
      toast({
        title: 'Role removed',
        description: 'The role has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error removing role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
