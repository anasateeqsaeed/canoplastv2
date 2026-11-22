import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { READINESS_KEYS } from '@/hooks/useOrderReadiness';

export type ReceivingStatus = 'pending' | 'received' | 'partial' | 'refused';
export type QcStatus = 'pending' | 'passed' | 'partial' | 'failed' | 'not_required';
export type IssueStatus = 'none' | 'open' | 'resolved';

export interface DeliveryConfirmation {
  dispatch_id: string;
  receiving_status: ReceivingStatus;
  received_date: string | null;
  received_qty: number | null;
  receiver_name: string | null;
  customer_grn_number: string | null;
  pod_url: string | null;
  qc_status: QcStatus;
  qc_date: string | null;
  qc_remarks: string | null;
  bilty_required: boolean;
  bilty_number: string | null;
  bilty_date: string | null;
  bilty_received: boolean;
  bilty_url: string | null;
  issue_status: IssueStatus;
  issue_notes: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Storage bucket for signed-DC / bilty photos. It must exist in Supabase
 * (see supabase/pending/delivery_proofs_bucket.sql) — uploads show a clear
 * error until it does; the rest of the form saves regardless.
 */
export const DELIVERY_PROOF_BUCKET = 'delivery-proofs';

export const RECEIVING_OPTIONS: Array<{ value: ReceivingStatus; en: string; ur: string }> = [
  { value: 'pending', en: 'Pending', ur: 'باقی' },
  { value: 'received', en: 'Received', ur: 'وصول ہو گیا' },
  { value: 'partial', en: 'Partially received', ur: 'کچھ وصول' },
  { value: 'refused', en: 'Refused', ur: 'انکار' },
];

export const QC_OPTIONS: Array<{ value: QcStatus; en: string; ur: string }> = [
  { value: 'pending', en: 'Pending', ur: 'باقی' },
  { value: 'passed', en: 'Passed', ur: 'پاس' },
  { value: 'partial', en: 'Partially passed', ur: 'جزوی پاس' },
  { value: 'failed', en: 'Failed', ur: 'فیل' },
  { value: 'not_required', en: 'Not required', ur: 'ضرورت نہیں' },
];

export const ISSUE_OPTIONS: Array<{ value: IssueStatus; en: string; ur: string }> = [
  { value: 'none', en: 'No issue', ur: 'کوئی مسئلہ نہیں' },
  { value: 'open', en: 'Open issue', ur: 'مسئلہ موجود' },
  { value: 'resolved', en: 'Resolved', ur: 'حل ہو گیا' },
];

export const EMPTY_CONFIRMATION = (dispatchId: string): DeliveryConfirmation => ({
  dispatch_id: dispatchId,
  receiving_status: 'pending',
  received_date: null,
  received_qty: null,
  receiver_name: null,
  customer_grn_number: null,
  pod_url: null,
  qc_status: 'pending',
  qc_date: null,
  qc_remarks: null,
  bilty_required: false,
  bilty_number: null,
  bilty_date: null,
  bilty_received: false,
  bilty_url: null,
  issue_status: 'none',
  issue_notes: null,
});

export function useDeliveryConfirmation(dispatchId: string | undefined) {
  return useQuery({
    queryKey: ['delivery-confirmation', dispatchId],
    enabled: !!dispatchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_delivery_confirmations')
        .select('*')
        .eq('dispatch_id', dispatchId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as DeliveryConfirmation) ?? null;
    },
  });
}

/** Confirmations for a set of dispatches, keyed by dispatch_id (DC list icons). */
export function useDeliveryConfirmationsMap(dispatchIds: string[]) {
  const ids = [...dispatchIds].sort();
  return useQuery({
    queryKey: ['delivery-confirmations', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const out: Record<string, DeliveryConfirmation> = {};
      // Chunk to keep the URL short on long lists.
      for (let i = 0; i < ids.length; i += 150) {
        const { data, error } = await supabase
          .from('dispatch_delivery_confirmations')
          .select('*')
          .in('dispatch_id', ids.slice(i, i + 150));
        if (error) throw error;
        (data || []).forEach((c: any) => { out[c.dispatch_id] = c; });
      }
      return out;
    },
  });
}

export function useUpsertDeliveryConfirmation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: DeliveryConfirmation) => {
      const { data: auth } = await supabase.auth.getUser();
      const { created_at: _c, updated_at: _u, ...rest } = row;
      const payload = { ...rest, updated_by: auth.user?.id ?? null, updated_at: new Date().toISOString() };
      const { error } = await supabase
        .from('dispatch_delivery_confirmations')
        .upsert(payload as any, { onConflict: 'dispatch_id' });
      if (error) throw error;
    },
    onSuccess: (_d, row) => {
      qc.invalidateQueries({ queryKey: ['delivery-confirmation', row.dispatch_id] });
      qc.invalidateQueries({ queryKey: ['delivery-confirmations'] });
      READINESS_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.success('Delivery confirmation saved / محفوظ ہو گیا');
    },
    onError: (e: any) => toast.error(e.message || 'Could not save delivery confirmation'),
  });
}

/** Upload a POD / bilty photo and return its public URL. */
export async function uploadDeliveryProof(dispatchId: string, kind: 'pod' | 'bilty', file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${dispatchId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(DELIVERY_PROOF_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) {
    const msg = /bucket/i.test(error.message)
      ? `Storage bucket "${DELIVERY_PROOF_BUCKET}" is not set up yet — ask admin to create it.`
      : error.message;
    throw new Error(msg);
  }
  return supabase.storage.from(DELIVERY_PROOF_BUCKET).getPublicUrl(path).data.publicUrl;
}
