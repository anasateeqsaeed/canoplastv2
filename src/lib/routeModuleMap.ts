import type { ModuleId } from '@/hooks/useRolePermissions';

/**
 * Maps a route pathname to a permission module id.
 * Returns null for routes that should bypass the permission matrix
 * (e.g. /auth, /operator/*, fallbacks handled elsewhere).
 */
export function pathToModule(pathname: string): ModuleId | null {
  if (!pathname) return null;
  const p = pathname.toLowerCase();

  if (p === '/auth' || p.startsWith('/auth/')) return null;
  if (p.startsWith('/operator')) return null;

  if (p === '/' || p.startsWith('/dashboard')) return 'dashboard';
  if (p.startsWith('/masters') || p.startsWith('/tools')) return 'masters';
  if (p.startsWith('/hr')) return 'hr';
  if (p.startsWith('/purchase')) return 'purchase';
  if (p.startsWith('/inventory')) return 'inventory';
  if (p.startsWith('/sales')) return 'sales';
  if (p.startsWith('/accounting')) return 'accounting';
  if (p.startsWith('/production')) return 'production';
  if (p.startsWith('/quality')) return 'quality';
  if (p.startsWith('/maintenance')) return 'maintenance';
  if (p.startsWith('/mixing')) return 'mixing';
  if (p.startsWith('/tooling')) return 'tooling';
  if (p.startsWith('/finance')) return 'finance';
  if (p.startsWith('/performance') || p.startsWith('/reports')) return 'reports';
  if (p.startsWith('/settings')) return 'settings';

  return null;
}

/**
 * Default landing path for a module — used when redirecting after a denied page.
 */
export function moduleToDefaultPath(module: ModuleId): string {
  switch (module) {
    case 'dashboard': return '/';
    case 'masters': return '/masters';
    case 'hr': return '/hr';
    case 'purchase': return '/purchase/orders';
    case 'inventory': return '/inventory';
    case 'sales': return '/sales';
    case 'accounting': return '/accounting';
    case 'production': return '/production';
    case 'quality': return '/quality/inspections';
    case 'maintenance': return '/maintenance';
    case 'mixing': return '/mixing/injection';
    case 'tooling': return '/tooling';
    case 'finance': return '/finance';
    case 'reports': return '/reports';
    case 'settings': return '/settings';
    default: return '/';
  }
}
