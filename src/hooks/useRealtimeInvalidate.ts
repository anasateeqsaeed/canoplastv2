import { useEffect, useId } from 'react';
import { useQueryClient, type QueryKey } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to Postgres changes on `tables` and invalidate `queryKeys` when
 * any row changes. Bursts are debounced so a multi-row save triggers one
 * refetch. Tables must be in the `supabase_realtime` publication to emit.
 */
export function useRealtimeInvalidate(tables: string[], queryKeys: QueryKey[], enabled = true) {
  const qc = useQueryClient();
  const uid = useId();
  const tablesKey = tables.join(',');
  const keysKey = JSON.stringify(queryKeys);

  useEffect(() => {
    if (!enabled || tables.length === 0) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        queryKeys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      }, 400);
    };
    let channel = supabase.channel(`rt-${uid}-${tablesKey}`);
    tables.forEach((table) => {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire);
    });
    channel.subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tablesKey, keysKey, qc, uid]);
}

/** Tables whose changes move order readiness / closure numbers. */
export const READINESS_TABLES = [
  'sales_orders',
  'sales_order_items',
  'sales_order_allocations',
  'dispatches',
  'dispatch_items',
  'sales_invoices',
  'sales_invoice_dispatches',
  'dispatch_delivery_confirmations',
  'ar_receipt_allocations',
  'production_jobs',
  'so_readiness_weights',
];
