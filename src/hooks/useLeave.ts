import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeaveType {
  id: string;
  name: string;
  code: string;
  is_paid: boolean;
  annual_quota: number;
  color: string;
  active: boolean;
}

export interface LeaveApplication {
  id: string;
  employee_id: string;
  leave_type_id: string;
  from_date: string;
  to_date: string;
  days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  remarks: string | null;
  created_at: string;
  employee?: { id: string; full_name: string; employee_code: string };
  leave_type?: LeaveType;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  allocated: number;
  used: number;
  carried_forward: number;
  employee?: { id: string; full_name: string; employee_code: string };
  leave_type?: LeaveType;
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave_types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_types' as any)
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return (data || []) as unknown as LeaveType[];
    },
  });
}

export function useLeaveApplications(filters?: { status?: string; employee_id?: string }) {
  return useQuery({
    queryKey: ['leave_applications', filters],
    queryFn: async () => {
      let q: any = supabase
        .from('leave_applications' as any)
        .select(`*, employee:employees(id, full_name, employee_code), leave_type:leave_types(*)`)
        .order('created_at', { ascending: false });
      if (filters?.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters?.employee_id) q = q.eq('employee_id', filters.employee_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as LeaveApplication[];
    },
  });
}

export function useLeaveBalances(year: number) {
  return useQuery({
    queryKey: ['leave_balances', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_balances' as any)
        .select(`*, employee:employees(id, full_name, employee_code), leave_type:leave_types(*)`)
        .eq('year', year);
      if (error) throw error;
      return (data || []) as unknown as LeaveBalance[];
    },
  });
}

export function useCreateLeaveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeaveApplication>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('leave_applications' as any).insert({
        ...input,
        applied_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Leave application submitted');
      qc.invalidateQueries({ queryKey: ['leave_applications'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: string; remarks?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('leave_applications' as any)
        .update({
          status,
          remarks,
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Leave status updated');
      qc.invalidateQueries({ queryKey: ['leave_applications'] });
      qc.invalidateQueries({ queryKey: ['leave_balances'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpsertLeaveBalance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<LeaveBalance>) => {
      const { error } = await supabase
        .from('leave_balances' as any)
        .upsert(input, { onConflict: 'employee_id,leave_type_id,year' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Balance updated');
      qc.invalidateQueries({ queryKey: ['leave_balances'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

// Calculate working days excluding Fridays (Pakistani schedule)
export function calculateLeaveDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const start = new Date(from);
  const end = new Date(to);
  if (end < start) return 0;
  let days = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() !== 5) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}
