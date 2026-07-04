import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { calculatePayrollLine, type EmployeeForCalc } from './usePayrollCalc';
import { format } from 'date-fns';

export interface PayrollRun {
  id: string;
  run_code: string;
  period_month: string;          // 'YYYY-MM-01'
  working_days: number;
  status: 'draft' | 'finalized' | 'paid';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  finalized_at: string | null;
  paid_at: string | null;
  updated_at: string;
}

export interface PayrollItem {
  id: string;
  run_id: string;
  employee_id: string;
  days_present: number;
  days_absent: number;
  days_leave: number;
  days_half: number;
  days_off: number;
  days_holiday: number;
  days_late: number;
  payable_days: number;
  daily_wage: number;
  earned_basic: number;
  allowances_amount: number;
  ot_hours: number;
  ot_rate: number;
  ot_amount: number;
  gross_pay: number;
  advance_deduction: number;
  other_deduction: number;
  net_pay: number;
  payment_mode: 'cash' | 'bank';
  payment_status: 'pending' | 'paid';
  paid_on: string | null;
  payment_ref: string | null;
  remarks: string | null;
  employee?: {
    id: string;
    employee_code: string;
    full_name: string;
    employee_type: string;
    department_id: string | null;
    bank_name: string | null;
    bank_account: string | null;
    departments?: { id: string; name: string } | null;
  } | null;
}

// ===== Runs =====

export function usePayrollRuns() {
  return useQuery({
    queryKey: ['payroll-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs' as any)
        .select('*')
        .order('period_month', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PayrollRun[];
    },
  });
}

export function usePayrollRun(runId?: string) {
  return useQuery({
    queryKey: ['payroll-runs', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_runs' as any)
        .select('*')
        .eq('id', runId!)
        .single();
      if (error) throw error;
      return data as unknown as PayrollRun;
    },
  });
}

export function usePayrollItems(runId?: string) {
  return useQuery({
    queryKey: ['payroll-items', runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_items' as any)
        .select(
          `*,
           employee:employees(id, employee_code, full_name, employee_type, employee_type_id, department_id, bank_name, bank_account,
             departments(id, name))`,
        )
        .eq('run_id', runId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as PayrollItem[];
    },
  });
}

// ===== Generate run =====

export interface GenerateRunInput {
  periodMonth: string;          // YYYY-MM-01
  workingDays: number;
  notes?: string;
}

export function useGeneratePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateRunInput) => {
      const monthStart = input.periodMonth;
      const startDate = monthStart;
      // last day of month
      const d = new Date(monthStart + 'T00:00:00');
      const endDateObj = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const endDate = format(endDateObj, 'yyyy-MM-dd');

      // 1. Create the run
      const { data: runData, error: runErr } = await supabase
        .from('payroll_runs' as any)
        .insert({
          period_month: monthStart,
          working_days: input.workingDays,
          notes: input.notes ?? null,
          run_code: `PR-${format(d, 'yyyyMM')}`,
        } as any)
        .select('*')
        .single();
      if (runErr) throw runErr;
      const run = runData as unknown as PayrollRun;

      // 2. Active employees
      const { data: emps, error: empErr } = await supabase
        .from('employees')
        .select('id, salary_type, basic_salary, allowances, overtime_rate')
        .eq('is_active', true);
      if (empErr) throw empErr;
      const employees = (emps || []) as unknown as EmployeeForCalc[];
      if (employees.length === 0) return run;
      const empIds = employees.map((e) => e.id);

      // 3. Attendance for the month, keyed directly on employees.id
      const attMap = new Map<string, { status: string }[]>();
      const { data: att } = await supabase
        .from('attendance_records')
        .select('person_id, status, attendance_date')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .in('person_id', empIds);
      (att || []).forEach((r: any) => {
        const arr = attMap.get(r.person_id) || [];
        arr.push({ status: r.status });
        attMap.set(r.person_id, arr);
      });

      // 4. Build items
      // Advance auto-recovery reconnects in Phase 6 (Operational Finance);
      // until then advance_deduction starts at 0 and is edited manually.
      const lines = employees.map((emp) => {
        const line = calculatePayrollLine({
          employee: emp,
          attendance: attMap.get(emp.id) || [],
          workingDays: input.workingDays,
          outstandingAdvance: 0,
        });
        return {
          run_id: run.id,
          employee_id: emp.id,
          ...line,
        };
      });

      // strip employee_id duplicate from spread
      const itemsToInsert = lines.map(({ employee_id, ...rest }) => ({
        ...rest,
        employee_id,
      }));

      const { error: itemErr } = await supabase
        .from('payroll_items' as any)
        .insert(itemsToInsert as any);
      if (itemErr) throw itemErr;

      // 6. Update totals on the run
      await recalcRunTotals(run.id);

      return run;
    },
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-items', run.id] });
      toast.success(`Payroll run ${run.run_code} generated`);
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to generate payroll run'),
  });
}

// ===== Update item (inline edits) =====

export function useUpdatePayrollItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; runId: string; patch: Partial<PayrollItem> }) => {
      const { error } = await supabase
        .from('payroll_items' as any)
        .update(input.patch as any)
        .eq('id', input.id);
      if (error) throw error;
      await recalcRunTotals(input.runId);
      return input;
    },
    onSuccess: (input) => {
      qc.invalidateQueries({ queryKey: ['payroll-items', input.runId] });
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to update payroll item'),
  });
}

// ===== Finalize =====

export function useFinalizePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      // Advance auto-recovery reconnects in Phase 6 (Operational Finance).
      const { error: upErr } = await supabase
        .from('payroll_runs' as any)
        .update({ status: 'finalized', finalized_at: new Date().toISOString() } as any)
        .eq('id', runId);
      if (upErr) throw upErr;

      return runId;
    },
    onSuccess: (runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-items', runId] });
      toast.success('Payroll finalized');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to finalize payroll'),
  });
}

// ===== Delete (admin only via RLS) =====
export function useDeletePayrollRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase.from('payroll_runs' as any).delete().eq('id', runId);
      if (error) throw error;
      return runId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      toast.success('Payroll run deleted');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to delete payroll run'),
  });
}

// ===== Mark all paid =====
export function useMarkRunPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (runId: string) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error: e1 } = await supabase
        .from('payroll_items' as any)
        .update({ payment_status: 'paid', paid_on: today } as any)
        .eq('run_id', runId);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('payroll_runs' as any)
        .update({ status: 'paid', paid_at: new Date().toISOString() } as any)
        .eq('id', runId);
      if (e2) throw e2;
      return runId;
    },
    onSuccess: (runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] });
      qc.invalidateQueries({ queryKey: ['payroll-items', runId] });
      toast.success('All payslips marked paid');
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to mark paid'),
  });
}

// Internal: recompute totals on the run record
async function recalcRunTotals(runId: string) {
  const { data } = await supabase
    .from('payroll_items' as any)
    .select('gross_pay, advance_deduction, other_deduction, net_pay')
    .eq('run_id', runId);
  const items = (data || []) as any[];
  const total_gross = items.reduce((s, i) => s + Number(i.gross_pay || 0), 0);
  const total_deductions = items.reduce(
    (s, i) => s + Number(i.advance_deduction || 0) + Number(i.other_deduction || 0),
    0,
  );
  const total_net = items.reduce((s, i) => s + Number(i.net_pay || 0), 0);
  await supabase
    .from('payroll_runs' as any)
    .update({ total_gross, total_deductions, total_net } as any)
    .eq('id', runId);
}
