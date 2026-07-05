import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type POStatus = 'draft' | 'approved' | 'partial' | 'completed' | 'cancelled';
export type POSourceType = 'vendor' | 'customer_provided';

export interface PurchaseOrderItem {
  id: string;
  po_id: string;
  material_id: string;
  ordered_qty: number;
  received_qty: number;
  pending_qty: number;
  unit_id: string | null;
  unit_price: number;
  line_total: number;
  remarks: string | null;
  tolerance_percent: number;
  allow_extra_receipt: boolean;
  created_at: string;
  updated_at: string;
  material?: {
    id: string;
    code: string;
    name: string;
  };
  unit?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  supplier_id: string | null;
  client_id: string | null;
  source_type: POSourceType;
  delivery_date: string | null;
  status: POStatus;
  total_amount: number;
  remarks: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  supplier?: {
    id: string;
    code: string;
    name: string;
  } | null;
  client?: {
    id: string;
    code: string;
    name: string;
  } | null;
  items?: PurchaseOrderItem[];
}

export interface CreatePOData {
  supplier_id?: string | null;
  client_id?: string | null;
  source_type: POSourceType;
  delivery_date?: string | null;
  remarks?: string | null;
  created_by?: string | null;
  items: {
    material_id: string;
    ordered_qty: number;
    unit_id?: string | null;
    unit_price?: number;
    remarks?: string | null;
    tolerance_percent?: number;
    allow_extra_receipt?: boolean;
  }[];
}

export interface UpdatePOData {
  id: string;
  supplier_id?: string | null;
  client_id?: string | null;
  delivery_date?: string | null;
  remarks?: string | null;
  status?: POStatus;
}

// Fetch all purchase orders
export function usePurchaseOrders(filters?: { status?: POStatus }) {
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers!purchase_orders_supplier_id_fkey(id, code, name),
          client:clients!purchase_orders_client_id_fkey(id, code, name)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });
}

// Fetch single purchase order with items
export function usePurchaseOrder(poId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: async () => {
      if (!poId) return null;
      
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          supplier:suppliers!purchase_orders_supplier_id_fkey(id, code, name),
          client:clients!purchase_orders_client_id_fkey(id, code, name)
        `)
        .eq('id', poId)
        .single();
      
      if (poError) throw poError;
      
      const { data: items, error: itemsError } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          material:materials!purchase_order_items_material_id_fkey(id, code, name),
          unit:units_of_measure!purchase_order_items_unit_id_fkey(id, code, name)
        `)
        .eq('po_id', poId)
        .order('created_at', { ascending: true });
      
      if (itemsError) throw itemsError;
      
      return { ...po, items } as PurchaseOrder;
    },
    enabled: !!poId,
  });
}

// Fetch pending PO items for a supplier/client (for GRN linking)
export function usePendingPOItems(supplierId?: string, clientId?: string) {
  return useQuery({
    queryKey: ['pending-po-items', supplierId, clientId],
    queryFn: async () => {
      if (!supplierId && !clientId) return [];
      
      let query = supabase
        .from('purchase_order_items')
        .select(`
          *,
          material:materials!purchase_order_items_material_id_fkey(id, code, name),
          unit:units_of_measure!purchase_order_items_unit_id_fkey(id, code, name),
          po:purchase_orders!purchase_order_items_po_id_fkey(
            id, po_number, po_date, status,
            supplier:suppliers!purchase_orders_supplier_id_fkey(id, code, name),
            client:clients!purchase_orders_client_id_fkey(id, code, name)
          )
        `)
        .gt('pending_qty', 0);
      
      // Filter by PO status (only approved or partial)
      // We need to filter after the join since Supabase doesn't support filtering on joined tables directly in this context
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by supplier/client and status
      return (data || []).filter((item: any) => {
        const po = item.po;
        if (!po) return false;
        if (po.status !== 'approved' && po.status !== 'partial') return false;
        if (supplierId && po.supplier?.id === supplierId) return true;
        if (clientId && po.client?.id === clientId) return true;
        return false;
      }) as any[];
    },
    enabled: !!(supplierId || clientId),
  });
}

// Create purchase order with items
export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePOData) => {
      // Generate PO number via RPC (was a DB trigger in v1)
      const { data: poNumber, error: numErr } = await supabase.rpc('next_doc_number', {
        _doc_type: 'purchase_order',
        _prefix: 'PO',
      });
      if (numErr) throw numErr;

      // Create PO header
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          po_number: poNumber as string,
          supplier_id: data.supplier_id || null,
          client_id: data.client_id || null,
          source_type: data.source_type,
          delivery_date: data.delivery_date || null,
          remarks: data.remarks || null,
          created_by: data.created_by || null,
          status: 'draft',
        }])
        .select()
        .single();
      
      if (poError) throw poError;
      
      // Create PO items
      if (data.items.length > 0) {
        const itemsToInsert = data.items.map(item => ({
          po_id: po.id,
          material_id: item.material_id,
          ordered_qty: item.ordered_qty,
          // pending_qty / line_total were generated columns in v1
          pending_qty: item.ordered_qty,
          line_total: item.ordered_qty * (item.unit_price || 0),
          unit_id: item.unit_id || null,
          unit_price: item.unit_price || 0,
          remarks: item.remarks || null,
          tolerance_percent: item.tolerance_percent ?? 5,
          allow_extra_receipt: item.allow_extra_receipt ?? true,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;

        // Keep PO total in sync (was a DB trigger in v1)
        const total = itemsToInsert.reduce((sum, i) => sum + i.line_total, 0);
        const { error: totalErr } = await supabase
          .from('purchase_orders')
          .update({ total_amount: total })
          .eq('id', po.id);
        if (totalErr) throw totalErr;
      }

      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase Order created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create Purchase Order: ' + error.message);
    },
  });
}

// Update purchase order
export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdatePOData) => {
      const { id, ...updates } = data;
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return po;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      toast.success('Purchase Order updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update Purchase Order: ' + error.message);
    },
  });
}

// Approve purchase order
export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, approved_by }: { id: string; approved_by?: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'approved',
          approved_by: approved_by || null,
          approved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      toast.success('Purchase Order approved');
    },
    onError: (error) => {
      toast.error('Failed to approve Purchase Order: ' + error.message);
    },
  });
}

// Cancel purchase order
export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      toast.success('Purchase Order cancelled');
    },
    onError: (error) => {
      toast.error('Failed to cancel Purchase Order: ' + error.message);
    },
  });
}

// Delete purchase order (only drafts)
export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id)
        .eq('status', 'draft'); // Only allow deleting drafts
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase Order deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete Purchase Order: ' + error.message);
    },
  });
}

// Recompute a PO's total_amount from its items (was a DB trigger in v1)
async function recomputePOTotal(poId: string) {
  const { data: items, error } = await supabase
    .from('purchase_order_items')
    .select('ordered_qty, unit_price')
    .eq('po_id', poId);
  if (error) throw error;

  const total = (items ?? []).reduce(
    (sum, i) => sum + Number(i.ordered_qty) * Number(i.unit_price ?? 0),
    0,
  );
  const { error: updErr } = await supabase
    .from('purchase_orders')
    .update({ total_amount: total })
    .eq('id', poId);
  if (updErr) throw updErr;
}

// Add item to existing PO
export function useAddPOItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      po_id: string;
      material_id: string;
      ordered_qty: number;
      unit_id?: string | null;
      unit_price?: number;
      remarks?: string | null;
    }) => {
      const { data: item, error } = await supabase
        .from('purchase_order_items')
        .insert({
          po_id: data.po_id,
          material_id: data.material_id,
          ordered_qty: data.ordered_qty,
          pending_qty: data.ordered_qty,
          line_total: data.ordered_qty * (data.unit_price || 0),
          unit_id: data.unit_id || null,
          unit_price: data.unit_price || 0,
          remarks: data.remarks || null,
        })
        .select()
        .single();

      if (error) throw error;
      await recomputePOTotal(data.po_id);
      return item;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.po_id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Item added to Purchase Order');
    },
    onError: (error) => {
      toast.error('Failed to add item: ' + error.message);
    },
  });
}

// Remove item from PO
export function useRemovePOItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, poId }: { itemId: string; poId: string }) => {
      const { error } = await supabase
        .from('purchase_order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await recomputePOTotal(poId);
      return poId;
    },
    onSuccess: (poId) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Item removed from Purchase Order');
    },
    onError: (error) => {
      toast.error('Failed to remove item: ' + error.message);
    },
  });
}
