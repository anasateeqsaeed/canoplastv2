import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MaterialLot {
  id: string;
  lot_number: string;
  quantity: number;
  remaining_qty: number;
  unit: string;
  inspection_status: string;
  received_date: string;
  supplier?: { id: string; name: string } | null;
  storage_location?: { id: string; location_code: string } | null;
}

export interface RawMaterialStockSummary {
  material_id: string;
  material_code: string;
  material_name: string;
  material_type: string | null;
  unit: string;
  lot_count: number;
  total_stock: number;
  min_stock?: number | null;
  lots: MaterialLot[];
}

export function useRawMaterialStock() {
  return useQuery({
    queryKey: ['raw-material-stock'],
    queryFn: async () => {
      // Fetch all material lots with remaining stock
      const { data: lots, error } = await supabase
        .from('material_lots')
        .select(`
          id,
          lot_number,
          material_id,
          quantity,
          remaining_qty,
          unit,
          inspection_status,
          received_date,
          supplier:suppliers(id, name),
          storage_location:storage_locations(id, location_code)
        `)
        .gt('remaining_qty', 0)
        .order('received_date', { ascending: false });

      if (error) throw error;

      // Fetch materials for grouping info
      const { data: materials, error: matError } = await supabase
        .from('materials')
        .select('id, code, name, material_type, unit, min_stock');

      if (matError) throw matError;

      // Create a map of materials
      const materialMap = new Map(
        materials?.map((m) => [m.id, m]) || []
      );

      // Group lots by material_id
      const groupedMap = new Map<string, RawMaterialStockSummary>();

      lots?.forEach((lot) => {
        const material = materialMap.get(lot.material_id);
        if (!material) return;

        const existing = groupedMap.get(lot.material_id);
        const lotData: MaterialLot = {
          id: lot.id,
          lot_number: lot.lot_number,
          quantity: lot.quantity,
          remaining_qty: lot.remaining_qty,
          unit: lot.unit,
          inspection_status: lot.inspection_status,
          received_date: lot.received_date,
          supplier: lot.supplier,
          storage_location: lot.storage_location,
        };

        if (existing) {
          existing.lot_count += 1;
          existing.total_stock += lot.remaining_qty;
          existing.lots.push(lotData);
        } else {
          groupedMap.set(lot.material_id, {
            material_id: lot.material_id,
            material_code: material.code,
            material_name: material.name,
            material_type: material.material_type,
            unit: material.unit || lot.unit || 'kg',
            lot_count: 1,
            total_stock: lot.remaining_qty,
            min_stock: material.min_stock,
            lots: [lotData],
          });
        }
      });

      return Array.from(groupedMap.values()).sort((a, b) =>
        a.material_name.localeCompare(b.material_name)
      );
    },
  });
}
