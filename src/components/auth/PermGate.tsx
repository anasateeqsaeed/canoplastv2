import { ReactNode } from 'react';
import { useMyPermissions, PermAction } from '@/hooks/useMyPermissions';
import type { ModuleId } from '@/hooks/useRolePermissions';

interface PermGateProps {
  module: ModuleId | string;
  action: PermAction;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renders children only when the current user has the specified permission.
 * Use to hide Create / Edit / Delete buttons that should respect the
 * Role Management matrix and per-user overrides.
 */
export function PermGate({ module, action, children, fallback = null }: PermGateProps) {
  const { can, isLoading } = useMyPermissions();
  if (isLoading) return null;
  if (!can(module, action)) return <>{fallback}</>;
  return <>{children}</>;
}
