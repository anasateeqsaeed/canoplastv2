import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export * from '@/lib/bom';
import type { BomCheckRow, BomDraftLine, BomLineView } from '@/lib/bom';

// ============ Queries ============
export function useProductBom(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-bom', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_product_bom')
        .select('*')
        .eq('product_id', productId!)
        .order('line_no');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        qty: Number(r.qty),
        pack_size: r.pack_size == null ? null : Number(r.pack_size),
        waste_percent: Number(r.waste_percent ?? 0),
        need_per_piece: Number(r.need_per_piece ?? 0),
      })) as BomLineView[];
    },
  });
}

export function useBomCheck(opts?: { activeOnly?: boolean }) {
  const activeOnly = opts?.activeOnly ?? false;
  return useQuery({
    queryKey: ['bom-check', activeOnly],
    queryFn: async () => {
      const rows: BomCheckRow[] = [];
      // Page through — PostgREST caps a response at 1000 rows.
      for (let from = 0; ; from += 1000) {
        let q = supabase.from('v_product_bom_check').select('*').order('code').range(from, from + 999);
        if (activeOnly) q = q.eq('is_active', true);
        const { data, error } = await q;
        if (error) throw error;
        rows.push(...((data || []) as unknown as BomCheckRow[]));
        if (!data || data.length < 1000) break;
      }
      return rows.map((r) => ({
        ...r,
        weight_g: Number(r.weight_g ?? 0),
        molding_g: Number(r.molding_g ?? 0),
        base_g: Number(r.base_g ?? 0),
        mb_g: Number(r.mb_g ?? 0),
        lines: Number(r.lines ?? 0),
        n_packing: Number(r.n_packing ?? 0),
        n_components: Number(r.n_components ?? 0),
        issue_count: Number(r.issue_count ?? 0),
        issues: r.issues ?? [],
      }));
    },
    staleTime: 30_000,
  });
}

/** product_id → check row, for status dots / badges. */
export function useBomStatusMap() {
  const q = useBomCheck();
  const map: Record<string, BomCheckRow> = {};
  (q.data || []).forEach((r) => { map[r.product_id] = r; });
  return { ...q, map };
}

const BOM_KEYS = [['product-bom'], ['bom-check'], ['so-readiness'], ['so-readiness-steps'], ['so-line-needs']];

function pgMessage(e: any): string {
  return [e?.message, e?.details, e?.hint].filter(Boolean).join(' — ') || 'Failed to save BOM';
}

/**
 * Save the editor's draft for one product: delete removed lines, update
 * existing ones, insert new ones. Writes only product_bom_lines — a DB
 * trigger keeps the legacy product_materials table in sync.
 */
export function useSaveBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, lines, original }: { productId: string; lines: BomDraftLine[]; original: BomLineView[] }) => {
      const { data: auth } = await supabase.auth.getUser();
      const keep = new Set(lines.filter((l) => l.id).map((l) => l.id!));
      const removed = original.filter((o) => !keep.has(o.id)).map((o) => o.id);
      if (removed.length) {
        const { error } = await supabase.from('product_bom_lines').delete().in('id', removed);
        if (error) throw error;
      }
      const now = new Date().toISOString();
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const row = {
          product_id: productId,
          line_no: i + 1,
          role: l.role,
          stage: l.stage,
          material_id: l.role === 'component' ? null : l.material_id,
          component_product_id: l.role === 'component' ? l.component_product_id : null,
          qty_basis: l.qty_basis,
          qty: Number(l.qty),
          pack_size: l.qty_basis === 'unit_per_pack' ? Number(l.pack_size) : null,
          waste_percent: Number(l.waste_percent) || 0,
          is_optional: l.is_optional,
          notes: l.notes?.trim() || null,
          updated_at: now,
        };
        if (l.id) {
          const { error } = await supabase.from('product_bom_lines').update(row).eq('id', l.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('product_bom_lines').insert({ ...row, created_by: auth.user?.id ?? null });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      BOM_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.success('BOM saved / میٹریل لسٹ محفوظ');
    },
    onError: (e: any) => {
      BOM_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.error('BOM not saved', { description: pgMessage(e), duration: 15000 });
    },
  });
}

/** Fetch another product's BOM lines (for "Copy BOM from…"). */
export async function fetchBomLines(productId: string): Promise<BomLineView[]> {
  const { data, error } = await supabase.from('v_product_bom').select('*').eq('product_id', productId).order('line_no');
  if (error) throw error;
  return (data || []) as unknown as BomLineView[];
}

// ============ Order line needs (readiness "via <part>") ============
export interface SoMaterialNeed {
  sales_order_item_id: string;
  material_id: string | null;
  material_name: string | null;
  unit: string | null;
  required: number;
  free_for_this: number;
  shortfall: number;
  is_available: boolean | null;
  step_key: string | null;
  role: string | null;
  via_component_code: string | null;
}

export interface SoComponentNeed {
  sales_order_item_id: string;
  component_product_id: string;
  component_code: string | null;
  component_name: string | null;
  required: number;
  free_for_this: number;
  shortfall: number;
  is_available: boolean | null;
}

export function useSoLineNeeds(orderId: string | undefined) {
  return useQuery({
    queryKey: ['so-line-needs', orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [rm, cn] = await Promise.all([
        supabase
          .from('v_so_raw_material')
          .select('sales_order_item_id, material_id, material_name, unit, required, free_for_this, shortfall, is_available, step_key, role, via_component_code')
          .eq('sales_order_id', orderId!),
        supabase
          .from('v_so_component_need')
          .select('sales_order_item_id, component_product_id, component_code, component_name, required, free_for_this, shortfall, is_available')
          .eq('sales_order_id', orderId!),
      ]);
      if (rm.error) throw rm.error;
      if (cn.error) throw cn.error;
      return {
        materials: (rm.data || []) as unknown as SoMaterialNeed[],
        components: (cn.data || []) as unknown as SoComponentNeed[],
      };
    },
  });
}
