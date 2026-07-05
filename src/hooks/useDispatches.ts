import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchProductBalance } from '@/hooks/useFinishedGoodsStock';

// Shared verbose error reporter for Dispatch mutations.
// Logs the FULL error to the console and shows a long-lived toast that
// includes Postgres code/details/hint so we can quickly tell whether a
// failure is RLS (42501), NOT NULL (23502), check constraint (23514),
// FK (23503), unique (23505), etc.
function reportDispatchError(stage: string, e: any) {
  // eslint-disable-next-line no-console
  console.error(`[Dispatch] ${stage} failed`, {
    message: e?.message,
    code: e?.code,
    details: e?.details,
    hint: e?.hint,
    status: e?.status,
    name: e?.name,
    raw: e,
  });
  const code = e?.code ? `[${e.code}] ` : '';
  const parts = [
    `${code}${e?.message ?? 'Unknown error'}`,
    e?.details ? `Details: ${e.details}` : null,
    e?.hint ? `Hint: ${e.hint}` : null,
  ].filter(Boolean);
  toast.error(`Failed at ${stage}`, {
    description: parts.join('\n'),
    duration: 20000,
  });
}

// Wrap a Supabase error so it carries the step name through the throw chain.
function tagError(stage: string, e: any): Error {
  const wrapped: any = new Error(`[${stage}] ${e?.message ?? 'unknown error'}`);
  wrapped.code = e?.code;
  wrapped.details = e?.details;
  wrapped.hint = e?.hint;
  wrapped.status = e?.status;
  wrapped.stage = stage;
  wrapped.cause = e;
  return wrapped;
}

// Phase 3: FG stock lives in the stock_transactions ledger only.
// v1's component_stock table + phantom-assembly reservations (product_sets /
// BOM) reconnect in Phase 5.

export interface Dispatch {
  id: string;
  dispatch_number: string;
  client_id: string;
  dispatch_date: string;
  vehicle_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  gate_pass_number: string | null;
  dispatched_by: string | null;
  remarks: string | null;
  status: string;
  is_third_party: boolean;
  consignee_name: string | null;
  total_pieces: number;
  total_cartons: number;
  total_weight_kg: number;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  clients?: { name: string; address: string | null; phone: string | null };
  dispatch_items?: Array<{ product_id: string; products?: { code: string; name: string } }>;
}

export interface DispatchItem {
  id: string;
  dispatch_id: string;
  product_id: string;
  packing_type_id: string | null;
  num_packs: number;
  loose_qty: number;
  total_qty: number;
  weight_kg: number | null;
  remarks: string | null;
  agreed_selling_price: number | null;
  agreed_labour_price: number | null;
  agreed_price_unit: string | null;
  agreed_weight_per_piece: number | null;
  rate_source: string | null;
  created_at: string;
  products?: { name: string; code: string; weight_per_piece: number | null };
  // packing_types master reconnects in Phase 5
  packing_types?: { name: string; code: string } | null;
}

export function useDispatches(status?: string) {
  return useQuery({
    queryKey: ['dispatches', status],
    queryFn: async () => {
      let q = supabase.from('dispatches').select('*, clients(name, address, phone), dispatch_items(product_id, products(code, name))');
      if (status && status !== 'all') q = q.eq('status', status);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Dispatch[];
    },
  });
}

export function useDispatchItems(dispatchId?: string) {
  return useQuery({
    queryKey: ['dispatch_items', dispatchId],
    enabled: !!dispatchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dispatch_items')
        .select('*, products(name, code, weight_per_piece)')
        .eq('dispatch_id', dispatchId!)
        .order('created_at');
      if (error) throw error;
      return data as unknown as DispatchItem[];
    },
  });
}

export function useCreateDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ items, ...dispatch }: any) => {
      // Let DB trigger generate dispatch_number / gate_pass_number — never send placeholders
      delete dispatch.dispatch_number;
      delete dispatch.gate_pass_number;
      // Stamp created_by from auth (audit trail of who created this dispatch)
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...dispatch, dispatch_number: '', created_by: user?.id || null };
      // eslint-disable-next-line no-console
      console.log('[Dispatch] create payload', { dispatch: payload, items });
      const { data, error } = await supabase.from('dispatches').insert(payload).select().single();
      if (error) throw tagError('dispatches insert', error);
      if (items?.length) {
        const itemsWithId = items.map((item: any) => ({ ...item, dispatch_id: data.id }));
        const { error: itemErr } = await supabase.from('dispatch_items').insert(itemsWithId);
        if (itemErr) throw tagError('dispatch_items insert', itemErr);

        // Write FG ledger outflow rows for each dispatched item
        for (const item of items) {
          if (!item.product_id || !item.total_qty) continue;

          const currentStock = await fetchProductBalance(item.product_id);
          const newStock = currentStock - item.total_qty; // negative allowed per system design

          const { error: txnErr } = await supabase.from('stock_transactions').insert({
            product_id: item.product_id,
            transaction_type: 'dispatch',
            quantity: -item.total_qty,
            balance_after: newStock,
            reference_type: 'dispatch',
            reference_id: data.id,
            performed_by: user?.id || null,
            remarks: `Dispatch ${data.dispatch_number}`,
          });
          if (txnErr) throw tagError('stock_transactions insert', txnErr);
        }
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['finished-goods-stock'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-balances'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-txns'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      toast.success('Dispatch created');
    },
    onError: (e: any) => reportDispatchError(e?.stage || 'create dispatch', e),
  });
}

export function useUpdateDispatchStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('dispatches').update({ status }).eq('id', id);
      if (error) throw tagError('dispatches status update', error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      toast.success('Status updated');
    },
    onError: (e: any) => reportDispatchError(e?.stage || 'update status', e),
  });
}

interface EditableItem {
  id?: string; // present for existing rows
  product_id: string;
  packing_type_id: string | null;
  num_packs: number;
  loose_qty: number;
  total_qty: number;
  weight_kg: number;
  remarks: string | null;
  agreed_selling_price?: number | null;
  agreed_labour_price?: number | null;
  rate_source?: string | null;
}

export function useUpdateDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      dispatch_number: string;
      header: {
        client_id: string;
        dispatch_date: string;
        vehicle_number: string | null;
        driver_name: string | null;
        driver_phone: string | null;
        dispatched_by: string | null;
        remarks: string | null;
        is_third_party: boolean;
        consignee_name: string | null;
        total_pieces: number;
        total_cartons: number;
        total_weight_kg: number;
      };
      newItems: EditableItem[];
      oldItems: EditableItem[];
    }) => {
      const { id, dispatch_number, header, newItems, oldItems } = payload;
      // eslint-disable-next-line no-console
      console.log('[Dispatch] update payload', { id, dispatch_number, header, newItems, oldItems });

      // 1. Update dispatch header
      const { error: hdrErr } = await supabase
        .from('dispatches')
        .update(header)
        .eq('id', id);
      if (hdrErr) throw tagError('dispatches header update', hdrErr);

      // 2. Diff items by id
      const oldById = new Map(oldItems.filter(i => i.id).map(i => [i.id!, i]));
      const newById = new Map(newItems.filter(i => i.id).map(i => [i.id!, i]));

      const toInsert = newItems.filter(i => !i.id);
      const toUpdate = newItems.filter(i => i.id && oldById.has(i.id));
      const toDelete = oldItems.filter(i => i.id && !newById.has(i.id!));

      // Inserts
      if (toInsert.length) {
        const { error } = await supabase.from('dispatch_items').insert(
          toInsert.map(i => ({
            dispatch_id: id,
            product_id: i.product_id,
            packing_type_id: i.packing_type_id,
            num_packs: i.num_packs,
            loose_qty: i.loose_qty,
            total_qty: i.total_qty,
            weight_kg: i.weight_kg,
            remarks: i.remarks,
            agreed_selling_price: i.agreed_selling_price ?? null,
            agreed_labour_price: i.agreed_labour_price ?? null,
            rate_source: i.rate_source ?? null,
          }))
        );
        if (error) throw tagError('dispatch_items insert (edit)', error);
      }

      // Updates
      for (const i of toUpdate) {
        const updatePayload: any = {
          product_id: i.product_id,
          packing_type_id: i.packing_type_id,
          num_packs: i.num_packs,
          loose_qty: i.loose_qty,
          total_qty: i.total_qty,
          weight_kg: i.weight_kg,
          remarks: i.remarks,
        };
        if (i.agreed_selling_price !== undefined) updatePayload.agreed_selling_price = i.agreed_selling_price;
        if (i.agreed_labour_price !== undefined) updatePayload.agreed_labour_price = i.agreed_labour_price;
        if (i.rate_source !== undefined) updatePayload.rate_source = i.rate_source;
        const { error } = await supabase
          .from('dispatch_items')
          .update(updatePayload)
          .eq('id', i.id!);
        if (error) throw tagError('dispatch_items update', error);
      }

      // Deletes
      if (toDelete.length) {
        const { error } = await supabase
          .from('dispatch_items')
          .delete()
          .in('id', toDelete.map(i => i.id!));
        if (error) throw tagError('dispatch_items delete', error);
      }

      // 3. Stock delta per product (new total qty - old total qty per product_id)
      const productDelta: Record<string, number> = {};
      for (const i of newItems) {
        if (!i.product_id) continue;
        productDelta[i.product_id] = (productDelta[i.product_id] || 0) + i.total_qty;
      }
      for (const i of oldItems) {
        if (!i.product_id) continue;
        productDelta[i.product_id] = (productDelta[i.product_id] || 0) - i.total_qty;
      }

      const { data: { user } } = await supabase.auth.getUser();
      for (const [productId, delta] of Object.entries(productDelta)) {
        if (delta === 0) continue;
        const currentStock = await fetchProductBalance(productId);
        // delta > 0 means more dispatched now => reduce stock further
        const newStock = currentStock - delta;

        // Log transaction ('dispatch' negative, 'dispatch_return' positive)
        const txnType = delta > 0 ? 'dispatch' : 'dispatch_return';
        const txnQty = delta > 0 ? -delta : Math.abs(delta);
        const { error: txnErr } = await supabase.from('stock_transactions').insert({
          product_id: productId,
          transaction_type: txnType,
          quantity: txnQty,
          balance_after: newStock,
          reference_type: 'dispatch',
          reference_id: id,
          performed_by: user?.id || null,
          remarks: `Edit ${dispatch_number}: ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}`,
        });
        if (txnErr) throw tagError('stock_transactions insert (edit)', txnErr);
      }

      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['dispatch_items', id] });
      qc.invalidateQueries({ queryKey: ['finished-goods-stock'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-balances'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-txns'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      qc.invalidateQueries({ queryKey: ['sales-invoice'] });
      toast.success('Dispatch updated');
    },
    onError: (e: any) => reportDispatchError(e?.stage || 'update dispatch', e),
  });
}

export function useDeleteDispatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Load the dispatch + its items so we can restock and audit
      const { data: dispatch, error: dErr } = await supabase
        .from('dispatches')
        .select('id, dispatch_number, items:dispatch_items(product_id, total_qty)')
        .eq('id', id)
        .maybeSingle();
      if (dErr) throw tagError('dispatches load (delete)', dErr);

      const items = ((dispatch as any)?.items || []) as Array<{ product_id: string | null; total_qty: number | null }>;

      // 2. Aggregate quantity to return per product
      const productReturn: Record<string, number> = {};
      for (const it of items) {
        if (!it.product_id) continue;
        productReturn[it.product_id] = (productReturn[it.product_id] || 0) + (it.total_qty || 0);
      }

      // 3. Restock via a dispatch_return ledger entry for each product
      const { data: { user } } = await supabase.auth.getUser();
      for (const [productId, qty] of Object.entries(productReturn)) {
        if (qty <= 0) continue;
        const currentStock = await fetchProductBalance(productId);
        const newStock = currentStock + qty;

        const { error: txnErr } = await supabase.from('stock_transactions').insert({
          product_id: productId,
          transaction_type: 'dispatch_return',
          quantity: qty,
          balance_after: newStock,
          reference_type: 'dispatch',
          reference_id: id,
          performed_by: user?.id || null,
          remarks: `Dispatch ${(dispatch as any)?.dispatch_number || ''} deleted - restocked ${qty}`,
        });
        if (txnErr) throw tagError('stock_transactions insert (delete)', txnErr);
      }

      // 4. Delete the dispatch (dispatch_items cascade)
      const { error } = await supabase.from('dispatches').delete().eq('id', id);
      if (error) throw tagError('dispatches delete', error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispatches'] });
      qc.invalidateQueries({ queryKey: ['finished-goods-stock'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-balances'] });
      qc.invalidateQueries({ queryKey: ['fg-stock-txns'] });
      qc.invalidateQueries({ queryKey: ['sales-orders'] });
      qc.invalidateQueries({ queryKey: ['sales-order'] });
      qc.invalidateQueries({ queryKey: ['sales-invoices'] });
      toast.success('Dispatch deleted');
    },
    onError: (e: any) => reportDispatchError(e?.stage || 'delete dispatch', e),
  });
}
