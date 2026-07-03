import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { ModuleId, MODULES } from './useRolePermissions';

export interface UserPermissionOverride {
  id: string;
  user_id: string;
  module: string;
  can_view: boolean | null;
  can_create: boolean | null;
  can_edit: boolean | null;
  can_delete: boolean | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

type PermCol = 'can_view' | 'can_create' | 'can_edit' | 'can_delete';

export function useUserPermissionOverrides(userId: string | null) {
  return useQuery({
    queryKey: ['user_permission_overrides', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('*')
        .eq('user_id', userId)
        .order('module');
      if (error) throw error;
      return data as UserPermissionOverride[];
    },
    enabled: !!userId,
  });
}

async function logActivity(action: string, actorId: string | undefined, targetUserId: string, details: any) {
  if (!actorId) return;
  try {
    await (supabase as any).rpc('log_role_activity', {
      p_action: action,
      p_actor_id: actorId,
      p_target_user_id: targetUserId,
      p_role: null,
      p_details: details,
    });
  } catch {
    // non-fatal
  }
}

export function useUpsertUserPermissionOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      userId,
      module,
      permission,
      value,
    }: {
      userId: string;
      module: string;
      permission: PermCol;
      value: boolean | null;
    }) => {
      const { data: existing } = await supabase
        .from('user_permission_overrides')
        .select('id')
        .eq('user_id', userId)
        .eq('module', module)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('user_permission_overrides')
          .update({ [permission]: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_permission_overrides')
          .insert({ user_id: userId, module, [permission]: value })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user_overrides_summary'] });
      logActivity('override_updated', user?.id, variables.userId, {
        module: variables.module,
        permission: variables.permission,
        value: variables.value,
      });
    },
    onError: (error) => {
      toast({ title: 'Error updating permission', description: error.message, variant: 'destructive' });
    },
  });
}

export function useResetUserPermissionOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, module }: { userId: string; module: string }) => {
      const { error } = await supabase
        .from('user_permission_overrides')
        .delete()
        .eq('user_id', userId)
        .eq('module', module);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['user_overrides_summary'] });
      logActivity('override_reset', user?.id, variables.userId, { module: variables.module });
      toast({ title: 'Permission reset', description: 'Permission override removed. Using role defaults.' });
    },
    onError: (error) => {
      toast({ title: 'Error resetting permission', description: error.message, variant: 'destructive' });
    },
  });
}

/** Reset every override for a user (used for bulk reset across all modules). */
export function useResetAllUserPermissionOverrides() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase.from('user_permission_overrides').delete().eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['user_overrides_summary'] });
      logActivity('override_reset_all', user?.id, v.userId, {});
      toast({ title: 'All overrides cleared', description: 'User now uses role defaults across all modules.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

/** Update expires_at for one module's override row. Creates the row if missing. */
export function useSetOverrideExpiry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      userId,
      module,
      expiresAt,
    }: {
      userId: string;
      module: string;
      expiresAt: string | null;
    }) => {
      const { data: existing } = await supabase
        .from('user_permission_overrides')
        .select('id')
        .eq('user_id', userId)
        .eq('module', module)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permission_overrides')
          .insert({ user_id: userId, module, expires_at: expiresAt });
        if (error) throw error;
      }
      return true;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', v.userId] });
      logActivity('override_expiry_set', user?.id, v.userId, { module: v.module, expires_at: v.expiresAt });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

/** Set the same expiry on every existing override row for a user. */
export function useSetAllOverridesExpiry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, expiresAt }: { userId: string; expiresAt: string | null }) => {
      const { error } = await supabase
        .from('user_permission_overrides')
        .update({ expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', v.userId] });
      logActivity('override_expiry_set_all', user?.id, v.userId, { expires_at: v.expiresAt });
      toast({ title: 'Expiry updated', description: v.expiresAt ? 'All overrides will auto-expire.' : 'Expiry cleared.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

/** Set every column of one module to a value (true/false), or clear (null). */
export function useBulkModuleOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      userId,
      module,
      value,
    }: {
      userId: string;
      module: string;
      value: boolean | null;
    }) => {
      const payload: any = {
        can_view: value,
        can_create: value,
        can_edit: value,
        can_delete: value,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from('user_permission_overrides')
        .select('id')
        .eq('user_id', userId)
        .eq('module', module)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permission_overrides')
          .insert({ user_id: userId, module, ...payload });
        if (error) throw error;
      }
      return true;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', v.userId] });
      logActivity('override_bulk_module', user?.id, v.userId, { module: v.module, value: v.value });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

/** Set one column (e.g. can_view) to the same value across every module for a user. */
export function useBulkColumnOverride() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      userId,
      column,
      value,
    }: {
      userId: string;
      column: PermCol;
      value: boolean | null;
    }) => {
      const { data: existing } = await supabase
        .from('user_permission_overrides')
        .select('module')
        .eq('user_id', userId);
      const existingModules = new Set((existing ?? []).map((r: any) => r.module));
      const rows = MODULES.map((m) => ({
        user_id: userId,
        module: m.id,
        [column]: value,
      }));
      const toInsert = rows.filter((r) => !existingModules.has(r.module as string));
      const toUpdateModules = rows.filter((r) => existingModules.has(r.module as string)).map((r) => r.module as string);
      if (toInsert.length > 0) {
        const { error } = await supabase.from('user_permission_overrides').insert(toInsert);
        if (error) throw error;
      }
      if (toUpdateModules.length > 0) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .update({ [column]: value, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .in('module', toUpdateModules);
        if (error) throw error;
      }
      return true;
    },
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', v.userId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', v.userId] });
      logActivity('override_bulk_column', user?.id, v.userId, { column: v.column, value: v.value });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

/**
 * Copy effective permissions from a source user to the target user as overrides.
 * Where the source's effective value matches the target's role default, the override
 * is removed; otherwise it's written.
 */
export function useCopyPermissionsFromUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      sourceUserId,
      targetUserId,
      targetRole,
    }: {
      sourceUserId: string;
      targetUserId: string;
      targetRole: string;
    }) => {
      // Fetch source: their roles + custom roles + overrides
      const [sourceRolesRes, srcOverridesRes, srcCustomAssignsRes, targetRolePermsRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', sourceUserId),
        supabase.from('user_permission_overrides').select('*').eq('user_id', sourceUserId),
        supabase
          .from('user_custom_roles')
          .select('custom_role_id, expires_at, custom_roles!inner(is_active)')
          .eq('user_id', sourceUserId),
        supabase.from('role_permissions').select('*').eq('role', targetRole as any),
      ]);
      if (sourceRolesRes.error) throw sourceRolesRes.error;
      if (srcOverridesRes.error) throw srcOverridesRes.error;
      if (srcCustomAssignsRes.error) throw srcCustomAssignsRes.error;
      if (targetRolePermsRes.error) throw targetRolePermsRes.error;

      const srcRoles = (sourceRolesRes.data ?? []).map((r: any) => r.role);
      const isSrcAdmin = srcRoles.includes('admin');

      let srcRolePerms: any[] = [];
      if (srcRoles.length > 0) {
        const { data, error } = await supabase
          .from('role_permissions')
          .select('*')
          .in('role', srcRoles as any);
        if (error) throw error;
        srcRolePerms = data ?? [];
      }

      const now = Date.now();
      const activeCustomRoleIds = (srcCustomAssignsRes.data ?? [])
        .filter((a: any) => a.custom_roles?.is_active && (!a.expires_at || new Date(a.expires_at).getTime() > now))
        .map((a: any) => a.custom_role_id);
      let srcCustomPerms: any[] = [];
      if (activeCustomRoleIds.length > 0) {
        const { data, error } = await supabase
          .from('custom_role_permissions')
          .select('*')
          .in('custom_role_id', activeCustomRoleIds);
        if (error) throw error;
        srcCustomPerms = data ?? [];
      }

      const srcOverrides = srcOverridesRes.data ?? [];
      const targetRolePerms = targetRolePermsRes.data ?? [];

      // Compute target role defaults and source effective per module
      const cols: PermCol[] = ['can_view', 'can_create', 'can_edit', 'can_delete'];
      const upserts: any[] = [];
      const deleteModules: string[] = [];

      for (const mod of MODULES) {
        const tgtDef: Record<PermCol, boolean> = {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
        const tRow = targetRolePerms.find((r: any) => r.module === mod.id);
        if (tRow) cols.forEach((c) => (tgtDef[c] = !!tRow[c]));

        // Source effective
        let srcEff: Record<PermCol, boolean> = {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };
        if (isSrcAdmin) {
          srcEff = { can_view: true, can_create: true, can_edit: true, can_delete: true };
        } else {
          for (const rp of srcRolePerms.filter((r: any) => r.module === mod.id)) {
            cols.forEach((c) => (srcEff[c] = srcEff[c] || !!rp[c]));
          }
          for (const cp of srcCustomPerms.filter((r: any) => r.module === mod.id)) {
            cols.forEach((c) => (srcEff[c] = srcEff[c] || !!cp[c]));
          }
          const ovr = srcOverrides.find((o: any) => o.module === mod.id);
          if (ovr) {
            const notExpired = !ovr.expires_at || new Date(ovr.expires_at).getTime() > now;
            if (notExpired) {
              cols.forEach((c) => {
                if (ovr[c] !== null && ovr[c] !== undefined) srcEff[c] = !!ovr[c];
              });
            }
          }
        }

        // Build override row for target: null where matches role default, else explicit
        const row: any = { user_id: targetUserId, module: mod.id };
        let anyDiff = false;
        for (const c of cols) {
          if (srcEff[c] === tgtDef[c]) {
            row[c] = null;
          } else {
            row[c] = srcEff[c];
            anyDiff = true;
          }
        }
        if (anyDiff) upserts.push(row);
        else deleteModules.push(mod.id);
      }

      // Delete overrides for modules that fully match role default
      if (deleteModules.length > 0) {
        const { error } = await supabase
          .from('user_permission_overrides')
          .delete()
          .eq('user_id', targetUserId)
          .in('module', deleteModules);
        if (error) throw error;
      }

      // Upsert all the diff modules. We delete-then-insert per module to avoid composite unique conflicts.
      if (upserts.length > 0) {
        const mods = upserts.map((u) => u.module);
        const { error: delErr } = await supabase
          .from('user_permission_overrides')
          .delete()
          .eq('user_id', targetUserId)
          .in('module', mods);
        if (delErr) throw delErr;
        const { error: insErr } = await supabase.from('user_permission_overrides').insert(upserts);
        if (insErr) throw insErr;
      }

      return { applied: upserts.length, cleared: deleteModules.length };
    },
    onSuccess: (res, v) => {
      queryClient.invalidateQueries({ queryKey: ['user_permission_overrides', v.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['effective_permissions', v.targetUserId] });
      queryClient.invalidateQueries({ queryKey: ['user_overrides_summary'] });
      logActivity('override_copied_from_user', user?.id, v.targetUserId, { source_user_id: v.sourceUserId, ...res });
      toast({
        title: 'Permissions copied',
        description: `${res.applied} module(s) overridden, ${res.cleared} reverted to role defaults.`,
      });
    },
    onError: (e: any) =>
      toast({ title: 'Error copying permissions', description: e.message, variant: 'destructive' }),
  });
}

/** Lightweight summary of which users have any non-expired overrides — used by the user list. */
export function useUserOverridesSummary() {
  return useQuery({
    queryKey: ['user_overrides_summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permission_overrides')
        .select('user_id, module, expires_at, can_view, can_create, can_edit, can_delete');
      if (error) throw error;
      const now = Date.now();
      const map = new Map<string, { modules: string[]; nextExpiry: string | null }>();
      for (const row of data ?? []) {
        const expired = row.expires_at && new Date(row.expires_at).getTime() <= now;
        if (expired) continue;
        const hasAny =
          row.can_view !== null || row.can_create !== null || row.can_edit !== null || row.can_delete !== null;
        if (!hasAny) continue;
        const cur = map.get(row.user_id) ?? { modules: [], nextExpiry: null as string | null };
        if (!cur.modules.includes(row.module)) cur.modules.push(row.module);
        if (row.expires_at) {
          if (!cur.nextExpiry || new Date(row.expires_at).getTime() < new Date(cur.nextExpiry).getTime()) {
            cur.nextExpiry = row.expires_at;
          }
        }
        map.set(row.user_id, cur);
      }
      return map;
    },
    staleTime: 30_000,
  });
}
