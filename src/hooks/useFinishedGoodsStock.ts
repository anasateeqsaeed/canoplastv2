import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Phase 3: FG stock is derived purely from the stock_transactions ledger.
// Production lot inflows reconnect in Phase 5; until then opening balances and
// corrections are posted as manual adjustment entries so dispatch stays usable.

export interface StockTransaction {
  id: string;
  product_id: string;
  transaction_type: string;
  quantity: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  remarks: string | null;
  created_at: string;
}

export interface FinishedGoodsStockSummary {
  product_id: string;
  product_code: string;
  product_name: string;
  client_id: string | null;
  client_name: string | null;
  balance: number;
  txn_count: number;
  last_txn_at: string | null;
}

/** Sum a product's ledger to get its current FG balance (server-side helper). */
export async function fetchProductBalance(productId: string): Promise<number> {
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('quantity')
    .eq('product_id', productId);
  if (error) throw error;
  return (data || []).reduce((s, r: any) => s + Number(r.quantity || 0), 0);
}

/** Map of product_id -> current FG balance from the ledger. */
export function useProductStockBalances() {
  return useQuery({
    queryKey: ['fg-stock-balances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('product_id, quantity');
      if (error) throw error;
      const map = new Map<string, number>();
      (data || []).forEach((r: any) => {
        map.set(r.product_id, (map.get(r.product_id) || 0) + Number(r.quantity || 0));
      });
      return map;
    },
  });
}

export function useFinishedGoodsStock() {
  return useQuery({
    queryKey: ['finished-goods-stock'],
    queryFn: async () => {
      const [{ data: txns, error: te }, { data: products, error: pe }] = await Promise.all([
        supabase.from('stock_transactions').select('product_id, quantity, created_at'),
        supabase.from('products').select('id, code, name, client_id, client:clients(name)'),
      ]);
      if (te) throw te;
      if (pe) throw pe;

      const agg = new Map<string, { balance: number; count: number; last: string | null }>();
      (txns || []).forEach((t: any) => {
        const cur = agg.get(t.product_id) || { balance: 0, count: 0, last: null };
        cur.balance += Number(t.quantity || 0);
        cur.count += 1;
        if (!cur.last || t.created_at > cur.last) cur.last = t.created_at;
        agg.set(t.product_id, cur);
      });

      const rows: FinishedGoodsStockSummary[] = [];
      (products || []).forEach((p: any) => {
        const a = agg.get(p.id);
        if (!a) return; // only products with ledger activity
        rows.push({
          product_id: p.id,
          product_code: p.code,
          product_name: p.name,
          client_id: p.client_id || null,
          client_name: p.client?.name || null,
          balance: a.balance,
          txn_count: a.count,
          last_txn_at: a.last,
        });
      });

      return rows.sort((a, b) => {
        const clientCompare = (a.client_name || '').localeCompare(b.client_name || '');
        if (clientCompare !== 0) return clientCompare;
        return a.product_name.localeCompare(b.product_name);
      });
    },
  });
}

/** Recent ledger entries for one product (expanded row view). */
export function useProductStockTransactions(productId: string | null) {
  return useQuery({
    queryKey: ['fg-stock-txns', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_transactions')
        .select('*')
        .eq('product_id', productId!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as StockTransaction[];
    },
  });
}

/** Post a manual opening-balance / adjustment entry into the FG ledger. */
export function useCreateStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      product_id: string;
      mode: 'set' | 'delta';
      value: number; // new closing qty (set) or +/- change (delta)
      type?: 'adjustment' | 'opening_balance';
      remarks?: string;
    }) => {
      const current = await fetchProductBalance(payload.product_id);
      const delta = payload.mode === 'set' ? payload.value - current : payload.value;
      if (delta === 0) throw new Error('No change — quantity is already ' + current);
      const balanceAfter = current + delta;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('stock_transactions').insert({
        product_id: payload.product_id,
        transaction_type: payload.type || 'adjustment',
        quantity: delta,
        balance_after: balanceAfter,
        reference_type: 'manual_adjustment',
        performed_by: user?.id || null,
        remarks: payload.remarks || null,
      });
      if (error) throw error;
      return balanceAfter;
    },
    onSuccess: (bal) => {
      qc.invalidateQueries({ queryKey: ['finished-goods-stock'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-balances'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-txns'] });
      toast.success(`Stock adjusted — new balance ${bal.toLocaleString()}`);
    },
    onError: (e: any) => toast.error(e.message || 'Adjustment failed'),
  });
}
