import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserDepartment {
  id: string;
  user_id: string;
  department_id: string;
  created_at: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
}

// Fetch user's assigned departments
export function useUserDepartments(userId?: string) {
  return useQuery({
    queryKey: ['user-departments', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('user_departments')
        .select(`
          id,
          user_id,
          department_id,
          created_at,
          departments:department_id (
            id,
            name,
            code
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      
      // Transform the nested data
      return (data || []).map(item => ({
        ...item,
        department: Array.isArray(item.departments) ? item.departments[0] : item.departments,
      })) as UserDepartment[];
    },
    enabled: !!userId,
  });
}

// Fetch all user department assignments (for admin)
export function useAllUserDepartments() {
  return useQuery({
    queryKey: ['all-user-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_departments')
        .select(`
          id,
          user_id,
          department_id,
          created_at,
          departments:department_id (
            id,
            name,
            code
          )
        `);

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        department: Array.isArray(item.departments) ? item.departments[0] : item.departments,
      })) as UserDepartment[];
    },
  });
}

// Assign department to user
export function useAssignDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, departmentId }: { userId: string; departmentId: string }) => {
      const { data, error } = await supabase
        .from('user_departments')
        .insert({ user_id: userId, department_id: departmentId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-departments', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-departments'] });
      toast.success('Department assigned successfully');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Department already assigned to this user');
      } else {
        toast.error('Failed to assign department');
      }
    },
  });
}

// Remove department from user
export function useRemoveDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, departmentId }: { userId: string; departmentId: string }) => {
      const { error } = await supabase
        .from('user_departments')
        .delete()
        .eq('user_id', userId)
        .eq('department_id', departmentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-departments', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['all-user-departments'] });
      toast.success('Department removed successfully');
    },
    onError: () => {
      toast.error('Failed to remove department');
    },
  });
}
