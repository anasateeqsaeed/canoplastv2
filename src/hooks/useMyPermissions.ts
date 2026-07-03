import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, AppRole } from './useAuth';
import { MODULES, ModuleId } from './useRolePermissions';

export type PermAction = 'view' | 'create' | 'edit' | 'delete';

const ACTION_TO_COL: Record<PermAction, 'can_view' | 'can_create' | 'can_edit' | 'can_delete'> = {
  view: 'can_view',
  create: 'can_create',
  edit: 'can_edit',
  delete: 'can_delete',
};

export interface EffectivePermMap {
  [module: string]: {
    can_view: boolean;
    can_create: boolean;
    can_edit: boolean;
    can_delete: boolean;
  };
}

const FULL = { can_view: true, can_create: true, can_edit: true, can_delete: true };
const EMPTY = { can_view: false, can_create: false, can_edit: false, can_delete: false };

/**
 * Returns the effective permission map for the currently logged-in user.
 *
 * - Admin always gets full access.
 * - Multi-role users get the OR of all their roles' role_permissions rows.
 * - Per-user overrides (user_permission_overrides) replace the role default
 *   per (module, action) when the override is non-null.
 * - Custom roles (custom_role_permissions) are OR'd in on top of built-in roles.
 */
export function useMyPermissions() {
  const { user, roles, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const isAdmin = roles.includes('admin');

  const query = useQuery({
    queryKey: ['my_permissions', userId, [...roles].sort().join(',')],
    enabled: !!userId && !authLoading && !isAdmin,
    queryFn: async (): Promise<EffectivePermMap> => {
      if (!userId) return {};

      const [rolePermsRes, overridesRes, customAssignsRes] = await Promise.all([
        roles.length > 0
          ? supabase.from('role_permissions').select('*').in('role', roles as AppRole[])
          : Promise.resolve({ data: [], error: null }),
        supabase.from('user_permission_overrides').select('*').eq('user_id', userId),
        supabase
          .from('user_custom_roles')
          .select('custom_role_id, expires_at, custom_roles!inner(is_active)')
          .eq('user_id', userId),
      ]);

      if (rolePermsRes.error) throw rolePermsRes.error;
      if (overridesRes.error) throw overridesRes.error;
      if (customAssignsRes.error) throw customAssignsRes.error;

      const rolePerms = rolePermsRes.data ?? [];
      const nowMs = Date.now();
      const overrides = (overridesRes.data ?? []).filter(
        (o) => !o.expires_at || new Date(o.expires_at).getTime() > nowMs,
      );

      const activeCustomRoleIds = (customAssignsRes.data ?? [])
        .filter((a) => a.custom_roles?.is_active && (!a.expires_at || new Date(a.expires_at).getTime() > nowMs))
        .map((a) => a.custom_role_id);

      let customPerms: Array<{ module: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }> = [];
      if (activeCustomRoleIds.length > 0) {
        const { data: cp, error: cpErr } = await supabase
          .from('custom_role_permissions')
          .select('*')
          .in('custom_role_id', activeCustomRoleIds);
        if (cpErr) throw cpErr;
        customPerms = cp ?? [];
      }

      const map: EffectivePermMap = {};
      for (const mod of MODULES) {
        const rowsForModule = [
          ...rolePerms.filter((rp) => rp.module === mod.id),
          ...customPerms.filter((cp) => cp.module === mod.id),
        ];
        const merged = rowsForModule.reduce(
          (acc, rp) => ({
            can_view: acc.can_view || !!rp.can_view,
            can_create: acc.can_create || !!rp.can_create,
            can_edit: acc.can_edit || !!rp.can_edit,
            can_delete: acc.can_delete || !!rp.can_delete,
          }),
          { ...EMPTY },
        );

        const ovr = overrides.find((o) => o.module === mod.id);
        if (ovr) {
          if (ovr.can_view !== null && ovr.can_view !== undefined) merged.can_view = !!ovr.can_view;
          if (ovr.can_create !== null && ovr.can_create !== undefined) merged.can_create = !!ovr.can_create;
          if (ovr.can_edit !== null && ovr.can_edit !== undefined) merged.can_edit = !!ovr.can_edit;
          if (ovr.can_delete !== null && ovr.can_delete !== undefined) merged.can_delete = !!ovr.can_delete;
        }

        map[mod.id] = merged;
      }
      return map;
    },
    staleTime: 60_000,
  });

  const effective: EffectivePermMap = useMemo(() => {
    if (isAdmin) {
      const m: EffectivePermMap = {};
      for (const mod of MODULES) m[mod.id] = { ...FULL };
      return m;
    }
    return query.data ?? {};
  }, [isAdmin, query.data]);

  const can = (module: ModuleId | string, action: PermAction): boolean => {
    if (isAdmin) return true;
    const row = effective[module];
    if (!row) return false;
    return !!row[ACTION_TO_COL[action]];
  };

  const canViewModule = (module: ModuleId | string | null | undefined): boolean => {
    if (!module) return true; // null = bypass (e.g. /operator)
    if (isAdmin) return true;
    return !!effective[module]?.can_view;
  };

  const isLoading = authLoading || (!isAdmin && query.isLoading);

  return {
    effective,
    can,
    canViewModule,
    isAdmin,
    isLoading,
    roles,
  };
}
