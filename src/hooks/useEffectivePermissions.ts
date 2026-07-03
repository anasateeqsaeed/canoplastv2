import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from './useAuth';
import { MODULES, ModuleId, RolePermission } from './useRolePermissions';

export interface EffectivePermission {
  module: ModuleId;
  moduleLabel: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  // Track if each permission is overridden at user level
  overrides: {
    can_view: boolean | null;
    can_create: boolean | null;
    can_edit: boolean | null;
    can_delete: boolean | null;
  };
  // Track role defaults
  roleDefaults: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
  expiresAt: string | null;
  isExpired: boolean;
}

export function useEffectivePermissions(userId: string | null, userRole: AppRole | null) {
  return useQuery({
    queryKey: ['effective_permissions', userId, userRole],
    queryFn: async (): Promise<EffectivePermission[]> => {
      if (!userId || !userRole) return [];

      // Fetch role permissions
      const { data: rolePerms, error: roleError } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole);
      
      if (roleError) throw roleError;

      // Fetch user overrides
      const { data: userOverrides, error: overrideError } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('user_id', userId);
      
      if (overrideError) throw overrideError;

      const nowMs = Date.now();

      // Build effective permissions for each module
      const effective: EffectivePermission[] = MODULES.map(mod => {
        const rolePerm = rolePerms?.find(rp => rp.module === mod.id);
        const override = userOverrides?.find(uo => uo.module === mod.id) as any;

        const roleDefaults = {
          can_view: rolePerm?.can_view ?? false,
          can_create: rolePerm?.can_create ?? false,
          can_edit: rolePerm?.can_edit ?? false,
          can_delete: rolePerm?.can_delete ?? false,
        };

        const expiresAt = override?.expires_at ?? null;
        const isExpired = !!expiresAt && new Date(expiresAt).getTime() <= nowMs;

        const overrides = isExpired
          ? { can_view: null, can_create: null, can_edit: null, can_delete: null }
          : {
              can_view: override?.can_view ?? null,
              can_create: override?.can_create ?? null,
              can_edit: override?.can_edit ?? null,
              can_delete: override?.can_delete ?? null,
            };

        return {
          module: mod.id as ModuleId,
          moduleLabel: mod.label,
          can_view: overrides.can_view ?? roleDefaults.can_view,
          can_create: overrides.can_create ?? roleDefaults.can_create,
          can_edit: overrides.can_edit ?? roleDefaults.can_edit,
          can_delete: overrides.can_delete ?? roleDefaults.can_delete,
          overrides,
          roleDefaults,
          expiresAt,
          isExpired,
        };
      });

      return effective;
    },
    enabled: !!userId && !!userRole,
  });
}
