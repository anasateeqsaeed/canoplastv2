import { useAuth, AppRole } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { hasAnyRole, loading, roles } = useAuth();

  if (loading) {
    return null;
  }

  if (roles.length === 0) {
    return <>{children}</>;
  }

  if (!hasAnyRole(allowedRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-warning" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">
          You don't have permission to access this feature. Please contact your administrator if you believe this is an error.
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Required roles: {allowedRoles.map((r) => r.replace('_', ' ')).join(', ')}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}

interface RoleBasedContentProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export function RoleBasedContent({ children, allowedRoles }: RoleBasedContentProps) {
  const { hasAnyRole, roles } = useAuth();

  if (roles.length === 0) {
    return <>{children}</>;
  }

  if (!hasAnyRole(allowedRoles)) {
    return null;
  }

  return <>{children}</>;
}
