import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MaterialLot {
  id: string;
  lot_number: string;
  material_id: string;
  supplier_id: string | null;
  received_date: string;
  quantity: number;
  remaining_qty: number;
  unit: string;
  inspection_status: 'pending' | 'passed' | 'failed' | 'conditional';
  storage_location_id: string | null;
  put_away_date: string | null;
  put_away_by: string | null;
  expiry_date: string | null;
  grn_number: string | null;
  invoice_number: string | null;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Customer material tracking
  is_customer_material: boolean;
  customer_balance_kg: number;
  // New fields for multi-stage tracking
  grade?: string | null;
  customer_client_id?: string | null;
  // Joined data
  material?: {
    name: string;
    code: string;
    material_type?: string;
    color?: string | null;
  };
  supplier?: {
    name: string;
    code: string;
    supplier_type?: string;
    linked_client_id?: string | null;
  };
  storage_location?: {
    location_code: string;
    location_name: string;
  } | null;
}

export interface CreateMaterialLotData {
  lot_number: string;
  material_id: string | null;
  supplier_id?: string | null;
  received_date?: string;
  quantity: number;
  unit?: string;
  inspection_status?: 'pending' | 'passed' | 'failed' | 'conditional';
  expiry_date?: string | null;
  grn_number?: string;
  invoice_number?: string;
  remarks?: string;
  // Customer material fields
  is_customer_material?: boolean;
  customer_balance_kg?: number;
  customer_client_id?: string | null;
  // PO linking
  po_item_id?: string | null;
}

// Hook to fetch material lots with filters
export function useMaterialLots(filters?: {
  material_id?: string;
  supplier_id?: string;
  inspection_status?: string;
  hasStock?: boolean;
  isCustomerMaterial?: boolean;
}) {
  return useQuery({
    queryKey: ['material-lots', filters],
    queryFn: async () => {
      let query = supabase
        .from('material_lots')
        .select(`
          *,
          material:materials(name, code, material_type, color),
          supplier:suppliers(name, code, supplier_type, linked_client_id),
          customer:clients!material_lots_customer_client_id_fkey(id, name, code),
          storage_location:storage_locations(location_code, location_name)
        `)
        .order('received_date', { ascending: false });
      
      if (filters?.material_id) {
        query = query.eq('material_id', filters.material_id);
      }
      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }
      if (filters?.inspection_status) {
        query = query.eq('inspection_status', filters.inspection_status);
      }
      if (filters?.hasStock) {
        query = query.gt('remaining_qty', 0);
      }
      if (filters?.isCustomerMaterial !== undefined) {
        query = query.eq('is_customer_material', filters.isCustomerMaterial);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MaterialLot[];
    },
    staleTime: 30000,
  });
}

// Hook to fetch customer material lots only
export function useCustomerMaterialLots(clientId?: string) {
  return useQuery({
    queryKey: ['customer-material-lots', clientId],
    queryFn: async () => {
      let query = supabase
        .from('material_lots')
        .select(`
          *,
          material:materials(name, code, material_type, color),
          supplier:suppliers(name, code, supplier_type, linked_client_id)
        `)
        .eq('is_customer_material', true)
        .gt('customer_balance_kg', 0)
        .order('received_date', { ascending: false });
      
      // If clientId is provided, filter by supplier's linked_client_id
      // This requires a more complex query or post-filtering
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Post-filter by client if needed
      if (clientId) {
        return (data as unknown as MaterialLot[]).filter(lot => 
          lot.supplier?.linked_client_id === clientId
        );
      }
      
      return data as unknown as MaterialLot[];
    },
    staleTime: 30000,
  });
}

// Hook to fetch material lots with available stock (for issuing to production)
export function useAvailableMaterialLots(materialId?: string) {
  return useQuery({
    queryKey: ['available-material-lots', materialId],
    queryFn: async () => {
      let query = supabase
        .from('material_lots')
        .select(`
          *,
          material:materials(name, code, material_type, color),
          supplier:suppliers(name, code)
        `)
        .eq('inspection_status', 'passed')
        .gt('remaining_qty', 0)
        .order('received_date', { ascending: true }); // FIFO
      
      if (materialId) {
        query = query.eq('material_id', materialId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as MaterialLot[];
    },
  });
}

// Hook to create material lot (GRN entry)
export function useCreateMaterialLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMaterialLotData) => {
      // Generate lot number via RPC when no supplier batch number was provided
      let lotNumber = data.lot_number;
      if (!lotNumber) {
        const { data: generated, error: lotNumErr } = await supabase.rpc('generate_material_lot_number');
        if (lotNumErr) throw lotNumErr;
        lotNumber = generated as string;
      }

      // Generate GRN number via RPC when not supplied
      let grnNumber = data.grn_number;
      if (!grnNumber) {
        const { data: generatedGRN, error: grnErr } = await supabase.rpc('next_doc_number', {
          _doc_type: 'grn',
          _prefix: 'GRN',
        });
        if (grnErr) throw grnErr;
        grnNumber = generatedGRN as string;
      }

      const insertData = {
        lot_number: lotNumber,
        material_id: data.material_id,
        supplier_id: data.supplier_id || null,
        received_date: data.received_date || new Date().toISOString().split('T')[0],
        quantity: data.quantity,
        remaining_qty: data.quantity, // Initially, remaining = received
        inspection_status: data.inspection_status || 'pending',
        unit: data.unit || 'kg',
        expiry_date: data.expiry_date || null,
        grn_number: grnNumber,
        invoice_number: data.invoice_number || null,
        remarks: data.remarks || null,
        is_customer_material: data.is_customer_material || false,
        customer_balance_kg: data.is_customer_material ? data.quantity : 0,
        customer_client_id: data.customer_client_id || null,
        po_item_id: data.po_item_id || null,
      };

      const { data: result, error } = await supabase
        .from('material_lots')
        .insert(insertData)
        .select(`
          *,
          material:materials(name, code),
          supplier:suppliers(name, code, supplier_type, linked_client_id)
        `)
        .single();

      if (error) throw error;

      // Roll received/pending qty up to the linked PO item (done by DB trigger in v1)
      if (data.po_item_id) {
        const { data: poItem, error: poItemErr } = await supabase
          .from('purchase_order_items')
          .select('id, po_id, ordered_qty, received_qty')
          .eq('id', data.po_item_id)
          .single();
        if (poItemErr) throw poItemErr;

        const newReceived = Number(poItem.received_qty ?? 0) + Number(data.quantity);
        const { error: updErr } = await supabase
          .from('purchase_order_items')
          .update({
            received_qty: newReceived,
            pending_qty: Math.max(Number(poItem.ordered_qty) - newReceived, 0),
          })
          .eq('id', data.po_item_id);
        if (updErr) throw updErr;

        // Recompute parent PO status (partial / completed)
        const { data: items, error: itemsErr } = await supabase
          .from('purchase_order_items')
          .select('ordered_qty, received_qty')
          .eq('po_id', poItem.po_id);
        if (itemsErr) throw itemsErr;

        const allReceived = (items ?? []).every(
          (i) => Number(i.received_qty ?? 0) >= Number(i.ordered_qty),
        );
        const anyReceived = (items ?? []).some((i) => Number(i.received_qty ?? 0) > 0);
        const newStatus = allReceived ? 'completed' : anyReceived ? 'partial' : null;
        if (newStatus) {
          const { error: poErr } = await supabase
            .from('purchase_orders')
            .update({ status: newStatus })
            .eq('id', poItem.po_id)
            .in('status', ['approved', 'partial']);
          if (poErr) throw poErr;
        }
      }

      return result as unknown as MaterialLot;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['available-material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['pending-po-items'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order'] });
      queryClient.invalidateQueries({ queryKey: ['next-grn-number'] });
      toast.success('Material lot created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create material lot: ${error.message}`);
    },
  });
}

// Hook to update material lot
export function useUpdateMaterialLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreateMaterialLotData> & { id: string }) => {
      const { data, error } = await supabase
        .from('material_lots')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['available-material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['gate-in-report'] });
      queryClient.invalidateQueries({ queryKey: ['customer-material-lots'] });
      toast.success('Material lot updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update material lot: ${error.message}`);
    },
  });
}

// Hook to update inspection status
export function useUpdateMaterialLotStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, inspection_status, remarks }: { 
      id: string; 
      inspection_status: 'pending' | 'passed' | 'failed' | 'conditional';
      remarks?: string;
    }) => {
      const { data, error } = await supabase
        .from('material_lots')
        .update({
          inspection_status,
          remarks: remarks || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['available-material-lots'] });
      toast.success('Inspection status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

// Hook to put away material lot to a storage location
export function usePutAwayMaterialLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storage_location_id }: { 
      id: string; 
      storage_location_id: string;
    }) => {
      const { data, error } = await supabase
        .from('material_lots')
        .update({
          storage_location_id,
          put_away_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['available-material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      queryClient.invalidateQueries({ queryKey: ['store-racks'] });
      toast.success('Material put away to location successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to put away material: ${error.message}`);
    },
  });
}

// Hook to move material lot to a different storage location
export function useMoveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lotId, 
      newLocationId, 
      reason 
    }: { 
      lotId: string; 
      newLocationId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from('material_lots')
        .update({
          storage_location_id: newLocationId,
          remarks: reason ? `Moved: ${reason}` : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lotId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-lots'] });
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      queryClient.invalidateQueries({ queryKey: ['store-racks'] });
      queryClient.invalidateQueries({ queryKey: ['rack-material-lots'] });
      toast.success('Material moved to new rack successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to move material: ${error.message}`);
    },
  });
}

// Hook to fetch available lots with full location details (store + rack)
export function useAvailableLotsByMaterial() {
  return useQuery({
    queryKey: ['available-lots-by-material'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_lots')
        .select(`
          id,
          lot_number,
          remaining_qty,
          received_date,
          material_id,
          storage_location_id,
          materials!inner (
            id,
            name,
            code
          ),
          storage_locations (
            id,
            location_code,
            store_id,
            stores (
              id,
              name
            )
          )
        `)
        .eq('inspection_status', 'passed')
        .gt('remaining_qty', 0)
        .order('received_date', { ascending: true });

      if (error) throw error;

      // Transform to flat structure for the picker
      return (data || []).map(lot => ({
        id: lot.id,
        lotNumber: lot.lot_number,
        remainingQty: lot.remaining_qty,
        receivedDate: lot.received_date,
        materialId: lot.material_id,
        materialName: (lot.materials as any)?.name || '',
        materialCode: (lot.materials as any)?.code || '',
        rackId: lot.storage_location_id,
        rackCode: (lot.storage_locations as any)?.location_code || null,
        storeId: (lot.storage_locations as any)?.store_id || null,
        storeName: (lot.storage_locations as any)?.stores?.name || null,
      }));
    },
    staleTime: 30000,
  });
}
