import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolve auth user ids → display names via the profiles table.
 * Returns a map { user_id: "Full Name" or "email" }.
 */
export function useUserNames(ids: (string | null | undefined)[]) {
  const cleanIds = Array.from(new Set((ids || []).filter((x): x is string => !!x))).sort();
  const key = cleanIds.join(',');

  return useQuery({
    queryKey: ['user-names', key],
    enabled: cleanIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', cleanIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data || []) {
        map[p.user_id] = p.full_name?.trim() || p.email || p.user_id.slice(0, 8);
      }
      return map;
    },
  });
}
