import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface HRDashboardStats {
  totalActive: number;
  operatorsActive: number;
  staffActive: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayMarkedTotal: number;
  attendancePct: number;
  pendingPayrollRuns: number;
  outstandingAdvancesCount: number;
  outstandingAdvancesAmount: number;
}

export function useHRDashboardStats() {
  return useQuery({
    queryKey: ['hr_dashboard_stats'],
    queryFn: async (): Promise<HRDashboardStats> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd');

      // Employees — match /hr/employees logic exactly (is_active + employee_types.category)
      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id, employee_type, is_active, employee_types(category)');
      if (empErr) throw empErr;

      const active = (emp ?? []).filter((e: any) => e.is_active);
      const isFactory = (e: any) =>
        (e.employee_types?.category ?? (e.employee_type === 'operator' ? 'factory' : 'office')) === 'factory';
      const operatorsActive = active.filter(isFactory).length;
      const staffActive = active.length - operatorsActive;

      // Today's attendance
      const { data: att } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('attendance_date', today);
      const todayPresent = (att ?? []).filter((r: any) => r.status === 'P').length;
      const todayAbsent = (att ?? []).filter((r: any) => r.status === 'A').length;
      const todayLate = (att ?? []).filter((r: any) => r.status === 'L' || r.status === 'LATE').length;
      const todayMarkedTotal = (att ?? []).length;
      const attendancePct = active.length > 0 ? Math.round(((todayPresent + todayLate) / active.length) * 100) : 0;

      // Pending payroll runs this month
      const { data: runs } = await supabase
        .from('payroll_runs')
        .select('id, status, period_month')
        .gte('period_month', monthStart);
      const pendingPayrollRuns = (runs ?? []).filter((r: any) => r.status !== 'paid' && r.status !== 'closed').length;

      // Advance tracking reconnects in Phase 6 (Operational Finance).
      const outstandingAdvancesCount = 0;
      const outstandingAdvancesAmount = 0;

      return {
        totalActive: active.length,
        operatorsActive,
        staffActive,
        todayPresent,
        todayAbsent,
        todayLate,
        todayMarkedTotal,
        attendancePct,
        pendingPayrollRuns,
        outstandingAdvancesCount,
        outstandingAdvancesAmount,
      };
    },
  });
}
