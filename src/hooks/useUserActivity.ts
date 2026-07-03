import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserActivityLog {
  id: string;
  user_id: string;
  activity_type: 'login' | 'logout' | 'login_failed';
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useUserActivity(userId?: string) {
  return useQuery({
    queryKey: ['user-activity', userId],
    queryFn: async () => {
      let query = supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserActivityLog[];
    },
  });
}

export function useAllUserActivity() {
  return useQuery({
    queryKey: ['all-user-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data as UserActivityLog[];
    },
  });
}

export async function logUserActivity(userId: string, activityType: 'login' | 'logout' | 'login_failed') {
  try {
    const { error } = await supabase.from('user_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      user_agent: navigator.userAgent,
    });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}
