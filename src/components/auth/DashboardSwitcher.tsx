import Dashboard from '@/pages/Dashboard';

/**
 * Placeholder for the role-aware dashboard system (Executive / Ops / Operator
 * views). Phase 0 renders a single generic dashboard; per-role variants land
 * with Phase 7 (Reports Centre & Dashboards) once there's real data to show.
 */
export function DashboardSwitcher() {
  return <Dashboard />;
}
