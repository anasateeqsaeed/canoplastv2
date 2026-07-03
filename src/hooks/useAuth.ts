import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logUserActivity } from '@/hooks/useUserActivity';

// v1's 13 roles + 2 new roles for the Accounting module.
export type AppRole =
  | 'admin'
  | 'super_user'
  | 'production_manager'
  | 'quality_manager'
  | 'operator'
  | 'assistant'
  | 'data_entry'
  | 'store_incharge'
  | 'mixer_operator'
  | 'tooling_maintenance'
  | 'maintenance_operator'
  | 'hr_manager'
  | 'sales_manager'
  | 'accountant'
  | 'finance_manager';

export interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);

  // Combined loading state - true until both session AND roles are resolved
  const loading = sessionLoading || (user !== null && rolesLoading);

  const fetchUserRoles = async (userId: string) => {
    setRolesLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_roles', { _user_id: userId });
      if (error) throw error;
      setRoles((data as AppRole[]) || []);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setRoles([]);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer role fetching to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          setRoles([]);
          setRolesLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setRolesLoading(false);
      }
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (data?.user) {
      logUserActivity(data.user.id, 'login');
    }

    return { data, error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName || '' },
      },
    });

    if (data?.user) {
      logUserActivity(data.user.id, 'login');
    }

    return { data, error };
  };

  const signOut = async () => {
    if (user) {
      await logUserActivity(user.id, 'logout');
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);
  const hasAnyRole = useCallback((checkRoles: AppRole[]) => checkRoles.some((role) => roles.includes(role)), [roles]);

  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  const isSuperUser = useCallback(() => hasRole('super_user'), [hasRole]);
  const isProductionManager = useCallback(() => hasRole('production_manager'), [hasRole]);
  const isQualityManager = useCallback(() => hasRole('quality_manager'), [hasRole]);
  const isOperator = useCallback(() => hasRole('operator'), [hasRole]);
  const isAssistant = useCallback(() => hasRole('assistant'), [hasRole]);
  const isDataEntry = useCallback(() => hasRole('data_entry'), [hasRole]);
  const isStoreIncharge = useCallback(() => hasRole('store_incharge'), [hasRole]);
  const isMixerOperator = useCallback(() => hasRole('mixer_operator'), [hasRole]);
  const isToolingMaintenance = useCallback(() => hasRole('tooling_maintenance'), [hasRole]);
  const isMaintenanceOperator = useCallback(() => hasRole('maintenance_operator'), [hasRole]);
  const isHRManager = useCallback(() => hasRole('hr_manager'), [hasRole]);
  const isSalesManager = useCallback(() => hasRole('sales_manager'), [hasRole]);
  const isAccountant = useCallback(() => hasRole('accountant'), [hasRole]);
  const isFinanceManager = useCallback(() => hasRole('finance_manager'), [hasRole]);

  return {
    user,
    session,
    loading,
    roles,
    rolesLoading,
    signIn,
    signUp,
    signOut,
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperUser,
    isProductionManager,
    isQualityManager,
    isOperator,
    isAssistant,
    isDataEntry,
    isStoreIncharge,
    isMixerOperator,
    isToolingMaintenance,
    isMaintenanceOperator,
    isHRManager,
    isSalesManager,
    isAccountant,
    isFinanceManager,
  };
}
