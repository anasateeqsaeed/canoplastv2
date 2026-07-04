import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ValidatedRow } from '@/lib/employeeImportExport';

export interface BulkResult {
  created: number;
  updated: number;
  failed: number;
  failedDetails: { rowIndex: number; error: string }[];
}

export function useBulkUpsertEmployees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ValidatedRow[]): Promise<BulkResult> => {
      const { data: { user } } = await supabase.auth.getUser();
      const result: BulkResult = { created: 0, updated: 0, failed: 0, failedDetails: [] };

      const creates = rows.filter(r => r.action === 'create' && r.payload);
      const updates = rows.filter(r => r.action === 'update' && r.payload && r.existingId);

      // Creates: chunk inserts
      const CHUNK = 100;
      for (let i = 0; i < creates.length; i += CHUNK) {
        const slice = creates.slice(i, i + CHUNK);
        const payloads = slice.map(r => {
          const p: any = { ...r.payload, created_by: user?.id };
          if (!p.employee_code) delete p.employee_code;
          return p;
        });
        const { data, error } = await supabase.from('employees').insert(payloads).select('id');
        if (error) {
          // Fallback to per-row insert to capture which rows failed
          for (const r of slice) {
            const p: any = { ...r.payload, created_by: user?.id };
            if (!p.employee_code) delete p.employee_code;
            const { error: e2 } = await supabase.from('employees').insert(p);
            if (e2) {
              result.failed++;
              result.failedDetails.push({ rowIndex: r.rowIndex, error: e2.message });
            } else {
              result.created++;
            }
          }
        } else {
          result.created += data?.length || slice.length;
        }
      }

      // Updates: one by one (small N typically)
      for (const r of updates) {
        const { error } = await supabase
          .from('employees')
          .update(r.payload as any)
          .eq('id', r.existingId!);
        if (error) {
          result.failed++;
          result.failedDetails.push({ rowIndex: r.rowIndex, error: error.message });
        } else {
          result.updated++;
        }
      }

      return result;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      const parts: string[] = [];
      if (res.created) parts.push(`${res.created} created`);
      if (res.updated) parts.push(`${res.updated} updated`);
      if (res.failed) parts.push(`${res.failed} failed`);
      toast.success(`Import complete: ${parts.join(', ') || 'no changes'}`);
    },
    onError: (e: any) => toast.error(e.message || 'Bulk import failed'),
  });
}
