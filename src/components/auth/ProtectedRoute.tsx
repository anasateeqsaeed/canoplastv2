import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { pathToModule, moduleToDefaultPath } from '@/lib/routeModuleMap';
import { MODULES, ModuleId } from '@/hooks/useRolePermissions';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, roles, loading, rolesLoading, signOut } = useAuth();
  const location = useLocation();

  if (loading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // FAIL-CLOSED: If user has no roles assigned, block access entirely
  if (roles.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Role Assigned</h2>
        <p className="text-muted-foreground mb-4 text-center max-w-md">
          Your account does not have any roles assigned. Please contact an administrator to get access.
        </p>
        <Button onClick={() => signOut()} variant="outline">
          Sign Out
        </Button>
      </div>
    );
  }

  const isDataEntryOnly = roles.length === 1 && roles.includes('data_entry');
  if (isDataEntryOnly) {
    const allowedPaths = ['/production/hourly-entry', '/maintenance/daily-checklist'];
    const isAllowed = allowedPaths.some((p) => location.pathname.startsWith(p));
    if (!isAllowed) {
      return <Navigate to="/production/hourly-entry" replace />;
    }
  }

  const isMaintenanceOperatorOnly = roles.length === 1 && roles.includes('maintenance_operator');
  if (isMaintenanceOperatorOnly && !location.pathname.startsWith('/maintenance/daily-checklist')) {
    return <Navigate to="/maintenance/daily-checklist" replace />;
  }

  const isOperatorOnly = roles.length === 1 && roles.includes('operator');
  if (isOperatorOnly && !location.pathname.startsWith('/operator')) {
    return <Navigate to="/operator" replace />;
  }

  const isStoreInchargeOnly = roles.length === 1 && roles.includes('store_incharge');
  if (isStoreInchargeOnly) {
    const allowedPaths = ['/inventory', '/production/jobs', '/purchase/orders'];
    const isAllowed = allowedPaths.some((p) => location.pathname.startsWith(p));
    if (!isAllowed) {
      return <Navigate to="/inventory" replace />;
    }
  }

  const isMixerOperatorOnly = roles.length === 1 && roles.includes('mixer_operator');
  if (isMixerOperatorOnly && !location.pathname.startsWith('/mixing')) {
    return <Navigate to="/mixing/injection" replace />;
  }

  const isToolingMaintenanceOnly = roles.length === 1 && roles.includes('tooling_maintenance');
  if (isToolingMaintenanceOnly) {
    const allowedPaths = ['/tooling', '/maintenance'];
    const isAllowed = allowedPaths.some((p) => location.pathname.startsWith(p));
    if (!isAllowed) {
      return <Navigate to="/tooling" replace />;
    }
  }

  return <PermissionGate>{children}</PermissionGate>;
}

function PermissionGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { canViewModule, effective, isAdmin, isLoading } = useMyPermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin) return <>{children}</>;

  const module = pathToModule(location.pathname);
  if (module === null) return <>{children}</>;

  if (canViewModule(module)) return <>{children}</>;

  const firstAllowed = MODULES.find((m) => effective[m.id]?.can_view) as { id: ModuleId } | undefined;
  if (firstAllowed) {
    return <Navigate to={moduleToDefaultPath(firstAllowed.id)} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        You don't have permission to view any module. Please contact your administrator.
      </p>
    </div>
  );
}
