// Pure BOM helpers (no Supabase import) — shared by the editor, the BOM
// check page and unit tests.

// ============ Types ============
export type BomRole =
  | 'base'
  | 'masterbatch'
  | 'additive'
  | 'preform'
  | 'component'
  | 'packing_primary'
  | 'packing_outer'
  | 'label'
  | 'other';
export type BomStage = 'molding' | 'fitting' | 'packing';
export type QtyBasis = 'g_per_pc' | 'unit_per_pc' | 'unit_per_pack';
export type BomStatus = 'ok' | 'warning' | 'error' | 'missing';

export interface BomLine {
  id: string;
  product_id: string;
  line_no: number;
  role: BomRole;
  stage: BomStage;
  material_id: string | null;
  component_product_id: string | null;
  qty_basis: QtyBasis;
  qty: number;
  pack_size: number | null;
  waste_percent: number;
  is_optional: boolean;
  notes: string | null;
}

export interface BomLineView extends BomLine {
  product_code: string;
  product_name: string;
  material_name: string | null;
  material_category: string | null;
  material_unit: string | null;
  component_code: string | null;
  component_name: string | null;
  base_unit: 'kg' | 'pcs';
  need_per_piece: number;
  step_key: string;
}

export interface BomCheckRow {
  product_id: string;
  code: string;
  name: string;
  product_type: string | null;
  category: string | null;
  is_active: boolean | null;
  weight_g: number;
  lines: number;
  molding_g: number;
  base_g: number;
  mb_g: number;
  n_packing: number;
  n_components: number;
  issues: string[];
  issue_count: number;
  bom_status: BomStatus;
}

/** Draft row used by the editor (id is absent for new rows). */
export interface BomDraftLine {
  key: string;
  id?: string;
  role: BomRole;
  stage: BomStage;
  material_id: string | null;
  component_product_id: string | null;
  qty_basis: QtyBasis;
  qty: string;
  pack_size: string;
  waste_percent: string;
  is_optional: boolean;
  notes: string | null;
}

// ============ Labels ============
export const ROLE_META: Record<BomRole, { en: string; ur: string; stage: BomStage }> = {
  base: { en: 'Base (dana)', ur: 'دانہ', stage: 'molding' },
  masterbatch: { en: 'Masterbatch (pigment)', ur: 'پگمنٹ', stage: 'molding' },
  additive: { en: 'Additive', ur: 'ایڈیٹو', stage: 'molding' },
  preform: { en: 'Preform', ur: 'پری فارم', stage: 'molding' },
  component: { en: 'Part (component)', ur: 'پارٹ', stage: 'fitting' },
  packing_primary: { en: 'Thaili (primary)', ur: 'تھیلی', stage: 'packing' },
  packing_outer: { en: 'Carton (outer)', ur: 'کارٹن', stage: 'packing' },
  label: { en: 'Label', ur: 'لیبل', stage: 'packing' },
  other: { en: 'Other', ur: 'دیگر', stage: 'molding' },
};

export const BASIS_META: Record<QtyBasis, { en: string; ur: string }> = {
  g_per_pc: { en: 'Grams / piece', ur: 'گرام فی پیس' },
  unit_per_pc: { en: 'Per piece', ur: 'فی پیس' },
  unit_per_pack: { en: 'Per pack', ur: 'فی پیک' },
};

export const BOM_STATUS_META: Record<BomStatus, { en: string; ur: string; dot: string; chip: string }> = {
  ok: { en: 'OK', ur: 'ٹھیک', dot: 'bg-green-600', chip: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  warning: { en: 'Warning', ur: 'توجہ', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  error: { en: 'Error', ur: 'غلطی', dot: 'bg-red-600', chip: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  missing: { en: 'Missing', ur: 'نہیں بنا', dot: 'bg-muted-foreground/50', chip: 'bg-muted text-muted-foreground' },
};

/** Same rule the view uses: only the "Thaili / carton" issue is a warning, the rest are errors. */
export const isWarningIssue = (issue: string) => issue.startsWith('Thaili');

/** Material categories offered per role in the picker (null category = uncategorised). */
export const ROLE_CATEGORIES: Record<BomRole, Array<string | null>> = {
  base: ['Raw Material'],
  masterbatch: ['Color'],
  additive: ['Color', 'Raw Material', null],
  preform: ['Preform'],
  component: [],
  packing_primary: ['Packing'],
  packing_outer: ['Packing'],
  label: ['Packing', null],
  other: ['Raw Material', 'Color', 'Preform', 'Packing', null],
};

const GRAM_UNITS = ['g', 'gm', 'gms', 'gram', 'grams'];
const KG_UNITS = ['kg', 'kgs', ...GRAM_UNITS];

/** Mirror of v_product_bom.base_unit / need_per_piece so the editor previews before saving. */
export function computeNeed(
  line: Pick<BomDraftLine, 'qty_basis' | 'qty' | 'pack_size' | 'waste_percent' | 'material_id' | 'component_product_id'>,
  materialUnit: string | null | undefined,
): { base_unit: 'kg' | 'pcs'; need_per_piece: number } {
  const unit = (materialUnit ?? '').toLowerCase();
  const base_unit: 'kg' | 'pcs' = line.component_product_id
    ? 'pcs'
    : line.qty_basis === 'g_per_pc' || KG_UNITS.includes(unit || 'kg')
      ? 'kg'
      : 'pcs';
  const qty = Number(line.qty) || 0;
  const pack = Number(line.pack_size) || 0;
  const waste = Number(line.waste_percent) || 0;
  let per = line.qty_basis === 'g_per_pc' ? qty / 1000 : line.qty_basis === 'unit_per_pc' ? qty : pack ? qty / pack : 0;
  if (line.qty_basis !== 'g_per_pc' && line.material_id && GRAM_UNITS.includes(unit)) per *= 0.001;
  return { base_unit, need_per_piece: per * (1 + waste / 100) };
}

let keySeq = 0;
export const newKey = () => `n${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export function toDraft(l: BomLine | BomLineView): BomDraftLine {
  return {
    key: l.id,
    id: l.id,
    role: l.role,
    stage: l.stage,
    material_id: l.material_id,
    component_product_id: l.component_product_id,
    qty_basis: l.qty_basis,
    qty: String(Number(l.qty)),
    pack_size: l.pack_size == null ? '' : String(Number(l.pack_size)),
    waste_percent: String(Number(l.waste_percent ?? 0)),
    is_optional: !!l.is_optional,
    notes: l.notes,
  };
}
