import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface RoleBasedRedirectProps {
  children: React.ReactNode;
}

/**
 * Redirects single-role users straight to their scoped area after authentication.
 * Multi-role / admin users land on the standard dashboard.
 */
export function RoleBasedRedirect({ children }: RoleBasedRedirectProps) {
  const { user, roles, loading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || rolesLoading) return;
    if (!user) return;
    if (location.pathname === '/auth') return;

    // FAIL-CLOSED: if user has no roles, ProtectedRoute shows the "No Role" screen.
    if (roles.length === 0) return;

    const isDataEntryOnly = roles.length === 1 && roles.includes('data_entry');
    const isOperatorOnly = roles.length === 1 && roles.includes('operator');
    const isMixerOperatorOnly = roles.length === 1 && roles.includes('mixer_operator');
    const isMaintenanceOperatorOnly = roles.length === 1 && roles.includes('maintenance_operator');
    const isToolingMaintenanceOnly = roles.length === 1 && roles.includes('tooling_maintenance');
    const isHRManagerOnly = roles.length === 1 && roles.includes('hr_manager');

    if (isDataEntryOnly && location.pathname !== '/production/hourly-entry') {
      navigate('/production/hourly-entry', { replace: true });
      return;
    }

    if (isOperatorOnly && !location.pathname.startsWith('/operator')) {
      navigate('/operator', { replace: true });
      return;
    }

    if (isMixerOperatorOnly && !location.pathname.startsWith('/mixing')) {
      navigate('/mixing/injection', { replace: true });
      return;
    }

    if (isMaintenanceOperatorOnly && !location.pathname.startsWith('/maintenance/daily-checklist')) {
      navigate('/maintenance/daily-checklist', { replace: true });
      return;
    }

    if (
      isToolingMaintenanceOnly &&
      !location.pathname.startsWith('/tooling') &&
      !location.pathname.startsWith('/maintenance')
    ) {
      navigate('/tooling', { replace: true });
      return;
    }

    if (isHRManagerOnly && !location.pathname.startsWith('/hr')) {
      navigate('/hr', { replace: true });
      return;
    }
  }, [user, roles, loading, rolesLoading, navigate, location.pathname]);

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
