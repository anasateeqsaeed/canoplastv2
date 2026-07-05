import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useClientConsignees(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client_consignees", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("client_consignees")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });
}

export function useCreateClientConsignee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ client_id, name }: { client_id: string; name: string }) => {
      const { data, error } = await supabase
        .from("client_consignees")
        .insert({ client_id, name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client_consignees", variables.client_id] });
    },
  });
}
