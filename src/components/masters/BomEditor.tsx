import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableComboBox, type ComboBoxOption } from '@/components/ui/searchable-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle, CheckCircle2, Copy, ExternalLink, Loader2, Plus, RotateCcw, Save, Trash2, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BASIS_META, BOM_STATUS_META, ROLE_CATEGORIES, ROLE_META, computeNeed, fetchBomLines, newKey, toDraft,
  useBomStatusMap, useProductBom, useSaveBom,
  type BomDraftLine, type BomRole, type BomStage, type QtyBasis,
} from '@/hooks/useBom';

export interface BomProduct {
  id: string;
  code: string;
  name: string;
  weight_per_piece: number | null;
  product_type: string | null;
  category: string | null;
  is_assembled: boolean | null;
  pcs_per_pack: number | null;
  is_active?: boolean | null;
}

interface MaterialLite {
  id: string;
  name: string;
  unit: string | null;
  material_category: string | null;
  material_type: string | null;
  color?: string | null;
  is_active?: boolean | null;
}

const MOLDING_ROLES: BomRole[] = ['base', 'masterbatch', 'additive', 'preform', 'other'];
const PACKING_ROLES: BomRole[] = ['packing_primary', 'packing_outer', 'label'];

function Ur({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span dir="rtl" lang="ur" className={cn('text-muted-foreground font-normal', className)}>{children}</span>;
}

const fmtQty = (n: number, unit: 'kg' | 'pcs') =>
  unit === 'kg'
    ? `${n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 3 : 2 })} kg`
    : `${Math.ceil(n - 1e-9).toLocaleString()} pcs`;

function blankLine(role: BomRole, stage: BomStage, basis: QtyBasis, packSize?: number | null): BomDraftLine {
  return {
    key: newKey(),
    role,
    stage,
    material_id: null,
    component_product_id: null,
    qty_basis: basis,
    qty: '',
    pack_size: basis === 'unit_per_pack' ? String(packSize ?? '') : '',
    waste_percent: '0',
    is_optional: false,
    notes: null,
  };
}

/** Returns a message per invalid line key (empty when the draft can be saved). */
function validate(lines: BomDraftLine[], productId: string): Record<string, string> {
  const bad: Record<string, string> = {};
  lines.forEach((l) => {
    if (l.role === 'component') {
      if (!l.component_product_id) bad[l.key] = 'Pick a part';
      else if (l.component_product_id === productId) bad[l.key] = 'A product cannot be its own part';
    } else if (!l.material_id) bad[l.key] = 'Pick a material';
    if (!(Number(l.qty) > 0)) bad[l.key] = bad[l.key] ?? 'Qty must be more than 0';
    if (l.qty_basis === 'unit_per_pack' && !(Number(l.pack_size) > 0)) bad[l.key] = bad[l.key] ?? 'Pack size needed';
    const w = Number(l.waste_percent);
    if (Number.isNaN(w) || w < 0 || w >= 100) bad[l.key] = bad[l.key] ?? 'Waste % must be 0–99';
  });
  return bad;
}

export function BomEditor({
  product,
  products,
  materials,
  canEdit,
  onOpenProduct,
}: {
  product: BomProduct;
  products: BomProduct[];
  materials: MaterialLite[];
  canEdit: boolean;
  onOpenProduct?: (productId: string) => void;
}) {
  const { data: original = [], isLoading } = useProductBom(product.id);
  const { map: statusMap } = useBomStatusMap();
  const save = useSaveBom();
  const [lines, setLines] = useState<BomDraftLine[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [previewQty, setPreviewQty] = useState('10000');
  const [copyFrom, setCopyFrom] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const originalDrafts = useMemo(() => original.map(toDraft), [original]);
  useEffect(() => {
    if (isLoading) return;
    // (Re)load whenever the saved BOM changes: first open, product switch, after Save.
    setLines(originalDrafts);
    setLoadedFor(product.id);
    setShowErrors(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originalDrafts, isLoading, product.id]);

  const matById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const prodById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const defaultPack = product.pcs_per_pack && product.pcs_per_pack > 0 ? Number(product.pcs_per_pack) : null;

  const strip = (ls: BomDraftLine[]) => JSON.stringify(ls.map(({ key: _k, ...r }) => r));
  const dirty = strip(lines) !== strip(originalDrafts);
  const errors = validate(lines, product.id);
  const hasErrors = Object.keys(errors).length > 0;

  const isSetLike =
    product.product_type === 'set' || !!product.is_assembled || product.category === 'FITTING' || product.category === 'SET';
  const showFitting = isSetLike || lines.some((l) => l.role === 'component');

  const update = (key: string, patch: Partial<BomDraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));
  const add = (l: BomDraftLine) => setLines((ls) => [...ls, l]);

  const replaceWith = (next: BomDraftLine[], what: string) => {
    if (lines.length && !confirm(`Replace the ${lines.length} current line(s) with ${what}?`)) return;
    setLines(next);
    setShowErrors(false);
  };

  // ---------- Templates ----------
  const w = Number(product.weight_per_piece) || 0;
  const r3 = (n: number) => String(Math.round(n * 1000) / 1000);
  const templates: Array<{ id: string; en: string; ur: string; build: () => BomDraftLine[] }> = [
    {
      id: 'inj',
      en: 'Injection item',
      ur: 'انجیکشن آئٹم',
      build: () => [
        { ...blankLine('base', 'molding', 'g_per_pc'), qty: w ? r3(w * 0.98) : '' },
        { ...blankLine('masterbatch', 'molding', 'g_per_pc'), qty: w ? r3(w * 0.02) : '' },
        { ...blankLine('packing_primary', 'packing', 'unit_per_pack', defaultPack ?? 350), qty: '1' },
        { ...blankLine('packing_outer', 'packing', 'unit_per_pack', defaultPack ?? 1000), qty: '1' },
      ],
    },
    {
      id: 'pet',
      en: 'PET bottle',
      ur: 'پی ای ٹی بوتل',
      build: () => [
        { ...blankLine('preform', 'molding', 'unit_per_pc'), qty: '1' },
        { ...blankLine('packing_primary', 'packing', 'unit_per_pack', defaultPack ?? 350), qty: '1' },
        { ...blankLine('packing_outer', 'packing', 'unit_per_pack', defaultPack ?? 1000), qty: '1' },
      ],
    },
    {
      id: 'set',
      en: 'Fitting set',
      ur: 'فٹنگ سیٹ',
      build: () => [
        { ...blankLine('component', 'fitting', 'unit_per_pc'), qty: '1' },
        { ...blankLine('component', 'fitting', 'unit_per_pc'), qty: '1' },
        { ...blankLine('packing_outer', 'packing', 'unit_per_pack', defaultPack ?? 1000), qty: '1' },
      ],
    },
  ];

  const doCopy = async () => {
    if (!copyFrom) return;
    setCopying(true);
    try {
      const src = await fetchBomLines(copyFrom);
      const next = src
        .filter((l) => l.component_product_id !== product.id)
        .map((l) => ({ ...toDraft(l), id: undefined, key: newKey() }));
      if (!next.length) {
        toast.error('That product has no BOM lines to copy');
        return;
      }
      const srcP = prodById.get(copyFrom);
      replaceWith(next, `${next.length} line(s) from ${srcP?.code ?? 'the other product'}`);
      setCopyOpen(false);
      toast.success('Copied — change what differs (e.g. pigment), then Save');
    } catch (e: any) {
      toast.error(e.message || 'Could not copy');
    } finally {
      setCopying(false);
    }
  };

  const onSave = () => {
    setShowErrors(true);
    if (hasErrors) {
      toast.error('Fix the highlighted lines first', { description: Object.values(errors)[0] });
      return;
    }
    save.mutate({ productId: product.id, lines, original });
  };

  // ---------- Options ----------
  const materialOptions = (role: BomRole, currentId: string | null): ComboBoxOption[] => {
    const cats = ROLE_CATEGORIES[role];
    return materials
      .filter((m) => m.id === currentId || ((m.is_active ?? true) && cats.includes(m.material_category ?? null)))
      .map((m) => ({
        value: m.id,
        label: m.name,
        description: [m.material_type, m.color, m.unit].filter(Boolean).join(' · '),
        group: m.material_category ?? 'Other',
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  };
  const componentOptions: ComboBoxOption[] = useMemo(
    () =>
      products
        .filter((p) => p.id !== product.id && p.is_active !== false)
        .map((p) => ({ value: p.id, label: `${p.code} — ${p.name}`, description: p.product_type ?? undefined }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [products, product.id],
  );
  const copyOptions: ComboBoxOption[] = useMemo(
    () =>
      products
        .filter((p) => p.id !== product.id && (statusMap[p.id]?.lines ?? 0) > 0)
        .map((p) => ({ value: p.id, label: `${p.code} — ${p.name}`, description: `${statusMap[p.id]?.lines ?? 0} lines` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [products, product.id, statusMap],
  );

  // ---------- Totals ----------
  const molding = lines.filter((l) => l.stage === 'molding' && l.role !== 'component');
  const fitting = lines.filter((l) => l.role === 'component');
  const packing = lines.filter((l) => l.stage === 'packing' && l.role !== 'component');
  const gramsOf = (roles: BomRole[]) =>
    molding.filter((l) => l.qty_basis === 'g_per_pc' && roles.includes(l.role)).reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const totalG = molding.filter((l) => l.qty_basis === 'g_per_pc').reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const mbG = gramsOf(['masterbatch']);
  const pigmentPct = totalG > 0 ? (mbG / totalG) * 100 : 0;
  const weightOk = w > 0 && totalG > 0 ? Math.abs(totalG - w) / w <= 0.05 : null;

  const n = Math.max(0, Number(previewQty) || 0);
  const preview = lines
    .filter((l) => (l.material_id || l.component_product_id) && Number(l.qty) > 0)
    .map((l) => {
      const m = l.material_id ? matById.get(l.material_id) : undefined;
      const p = l.component_product_id ? prodById.get(l.component_product_id) : undefined;
      const { base_unit, need_per_piece } = computeNeed(l, m?.unit);
      return {
        key: l.key,
        name: p ? `${p.code} — ${p.name}` : m?.name ?? '—',
        role: l.role,
        unit: base_unit,
        total: need_per_piece * n,
      };
    });

  const readOnly = !canEdit;

  if (isLoading || loadedFor !== product.id) {
    return <div className="p-6 text-center text-muted-foreground"><Loader2 className="inline mr-2 animate-spin" size={16} />Loading BOM…</div>;
  }

  // ---------- Row renderers ----------
  const errCls = (k: string) => (showErrors && errors[k] ? 'border-red-500 ring-1 ring-red-500/40' : '');

  const renderMaterialRow = (l: BomDraftLine, roles: BomRole[], bases: QtyBasis[]) => {
    const m = l.material_id ? matById.get(l.material_id) : undefined;
    const need = computeNeed(l, m?.unit);
    return (
      <div key={l.key} className={cn('rounded-md border p-2 sm:p-3 space-y-2', errCls(l.key))}>
        <div className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-12 sm:col-span-3 space-y-1">
            <Label className="text-[11px]">Role <Ur>کردار</Ur></Label>
            <Select
              value={l.role}
              disabled={readOnly}
              onValueChange={(v) => {
                const role = v as BomRole;
                const cats = ROLE_CATEGORIES[role];
                const keepMat = m && cats.includes(m.material_category ?? null);
                update(l.key, { role, stage: ROLE_META[role].stage === 'fitting' ? l.stage : ROLE_META[role].stage, material_id: keepMat ? l.material_id : null });
              }}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_META[r].en} · {ROLE_META[r].ur}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 sm:col-span-5 space-y-1">
            <Label className="text-[11px]">Material <Ur>میٹریل</Ur></Label>
            <SearchableComboBox
              value={l.material_id ?? ''}
              onChange={(v) => update(l.key, { material_id: v || null })}
              options={materialOptions(l.role, l.material_id)}
              placeholder="Select material"
              searchPlaceholder="Search material…"
              emptyMessage="No material in this category"
              disabled={readOnly}
            />
          </div>
          <div className="col-span-6 sm:col-span-4 space-y-1">
            <Label className="text-[11px]">Basis <Ur>بنیاد</Ur></Label>
            <Select
              value={l.qty_basis}
              disabled={readOnly}
              onValueChange={(v) =>
                update(l.key, {
                  qty_basis: v as QtyBasis,
                  pack_size: v === 'unit_per_pack' ? l.pack_size || String(defaultPack ?? '') : '',
                })
              }
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {bases.map((b) => (
                  <SelectItem key={b} value={b}>{BASIS_META[b].en} · {BASIS_META[b].ur}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 sm:col-span-3 space-y-1">
            <Label className="text-[11px]">
              Qty {l.qty_basis === 'g_per_pc' ? '(g)' : m?.unit ? `(${m.unit})` : ''}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              className="h-9"
              value={l.qty}
              disabled={readOnly}
              onChange={(e) => update(l.key, { qty: e.target.value })}
            />
          </div>
          {l.qty_basis === 'unit_per_pack' && (
            <div className="col-span-6 sm:col-span-3 space-y-1">
              <Label className="text-[11px]">Pack size (pcs) <Ur>فی پیک</Ur></Label>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                className="h-9"
                value={l.pack_size}
                disabled={readOnly}
                onChange={(e) => update(l.key, { pack_size: e.target.value })}
              />
            </div>
          )}
          <div className="col-span-6 sm:col-span-2 space-y-1">
            <Label className="text-[11px]">Waste % <Ur>ضائع</Ur></Label>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              max={99}
              className="h-9"
              value={l.waste_percent}
              disabled={readOnly}
              onChange={(e) => update(l.key, { waste_percent: e.target.value })}
            />
          </div>
          <div className={cn('flex items-end justify-between gap-2', l.qty_basis === 'unit_per_pack' ? 'col-span-12 sm:col-span-4' : 'col-span-12 sm:col-span-7')}>
            <span className="text-xs text-muted-foreground pb-2">
              {Number(l.qty) > 0 ? `= ${fmtNeed(need.need_per_piece, need.base_unit)} / pc` : ''}
            </span>
            {!readOnly && (
              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(l.key)} title="Remove line">
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
        {showErrors && errors[l.key] && <p className="text-xs text-red-600">{errors[l.key]}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm">
          <span className="font-medium">{product.code}</span>{' '}
          <span className="text-muted-foreground">· weight {w ? `${w} g` : 'not set'}</span>
        </div>
        {statusMap[product.id] && (
          <span className={cn('rounded px-2 py-0.5 text-xs', BOM_STATUS_META[statusMap[product.id].bom_status].chip)}>
            {BOM_STATUS_META[statusMap[product.id].bom_status].en} <Ur className="text-inherit">{BOM_STATUS_META[statusMap[product.id].bom_status].ur}</Ur>
          </span>
        )}
        {!readOnly && (
          <div className="ml-auto flex flex-wrap gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm"><Wand2 size={14} className="mr-1" /> Template</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Quick-add template <Ur>تیار ڈھانچہ</Ur></DropdownMenuLabel>
                {templates.map((t) => (
                  <DropdownMenuItem key={t.id} onSelect={() => replaceWith(t.build(), `the “${t.en}” template`)}>
                    {t.en} <Ur className="ml-2">{t.ur}</Ur>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Popover open={copyOpen} onOpenChange={setCopyOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm"><Copy size={14} className="mr-1" /> Copy BOM from…</Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-2" align="end">
                <Label className="text-xs">Copy all lines from <Ur>سے نقل کریں</Ur></Label>
                <SearchableComboBox
                  value={copyFrom}
                  onChange={setCopyFrom}
                  options={copyOptions}
                  placeholder="Pick a product with a BOM"
                  searchPlaceholder="Search code / name…"
                  emptyMessage="No product with a BOM"
                />
                <p className="text-[11px] text-muted-foreground">e.g. copy the White variant into Blue, then change only the pigment. Nothing is saved until you press Save.</p>
                <Button type="button" size="sm" className="w-full" disabled={!copyFrom || copying} onClick={doCopy}>
                  {copying ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Copy size={14} className="mr-1" />} Copy
                </Button>
              </PopoverContent>
            </Popover>
            <Button type="button" variant="outline" size="sm" disabled={!dirty || save.isPending} onClick={() => { setLines(originalDrafts); setShowErrors(false); }}>
              <RotateCcw size={14} className="mr-1" /> Reset
            </Button>
            <Button type="button" size="sm" disabled={!dirty || save.isPending} onClick={onSave}>
              {save.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
              Save BOM <Ur className="ml-1 text-inherit">محفوظ</Ur>
            </Button>
          </div>
        )}
      </div>
      {readOnly && <p className="text-xs text-muted-foreground">Read-only — only admin, production manager or super user can change the BOM.</p>}
      {statusMap[product.id]?.issues?.length ? (
        <div className="flex flex-wrap gap-1">
          {statusMap[product.id].issues.map((i) => (
            <span key={i} className={cn('rounded px-2 py-0.5 text-[11px]', i.startsWith('Thaili') ? BOM_STATUS_META.warning.chip : BOM_STATUS_META.error.chip)}>{i}</span>
          ))}
          {dirty && <span className="text-[11px] text-muted-foreground self-center">(saved version)</span>}
        </div>
      ) : null}

      {/* Molding */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-sm">Molding <Ur>مولڈنگ</Ur></h4>
          <span className="text-xs text-muted-foreground">dana · pigment · additive · preform</span>
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => add(blankLine(molding.some((l) => l.role === 'base') ? 'masterbatch' : 'base', 'molding', 'g_per_pc'))}>
              <Plus size={14} className="mr-1" /> Add line
            </Button>
          )}
        </div>
        {molding.length === 0 && <p className="text-xs text-muted-foreground">No molding lines.</p>}
        {molding.map((l) => (
          renderMaterialRow(l, MOLDING_ROLES, ['g_per_pc', 'unit_per_pc'])
        ))}
        {totalG > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span
              className={cn(
                'inline-flex items-center gap-1 font-medium',
                weightOk === null ? '' : weightOk ? 'text-green-700 dark:text-green-400' : 'text-red-600',
              )}
            >
              {weightOk === null ? null : weightOk ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              Total {Math.round(totalG * 1000) / 1000} g {w ? `vs weight ${w} g` : '(product weight not set)'}
            </span>
            {w > 0 && <span className="text-xs text-muted-foreground">({totalG >= w ? '+' : ''}{(((totalG - w) / w) * 100).toFixed(1)}%, ±5% allowed)</span>}
            <span className="text-xs text-muted-foreground ml-auto">
              Pigment {pigmentPct.toFixed(2)}% of grams <Ur>پگمنٹ</Ur>
            </span>
          </div>
        )}
      </section>

      {/* Fitting */}
      {showFitting && (
        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-sm">Fitting parts <Ur>فٹنگ پارٹس</Ur></h4>
            <span className="text-xs text-muted-foreground">parts per set</span>
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => add({ ...blankLine('component', 'fitting', 'unit_per_pc'), qty: '1' })}>
                <Plus size={14} className="mr-1" /> Add part
              </Button>
            )}
          </div>
          {fitting.length === 0 && <p className="text-xs text-amber-600">No parts yet — a set / fitting item needs its parts.</p>}
          {fitting.map((l) => {
            const st = l.component_product_id ? statusMap[l.component_product_id] : undefined;
            return (
              <div key={l.key} className={cn('rounded-md border p-2 sm:p-3 space-y-2', errCls(l.key))}>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-7 space-y-1">
                    <Label className="text-[11px]">Part (product) <Ur>پارٹ</Ur></Label>
                    <SearchableComboBox
                      value={l.component_product_id ?? ''}
                      onChange={(v) => update(l.key, { component_product_id: v || null })}
                      options={componentOptions}
                      placeholder="Select part"
                      searchPlaceholder="Search code / name…"
                      emptyMessage="No product found"
                      disabled={readOnly}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-[11px]">Qty / set</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step="any"
                      className="h-9"
                      value={l.qty}
                      disabled={readOnly}
                      onChange={(e) => update(l.key, { qty: e.target.value })}
                    />
                  </div>
                  <div className="col-span-8 sm:col-span-3 flex items-center justify-end gap-1 pb-1">
                    {st && (
                      <span className={cn('rounded px-1.5 py-0.5 text-[11px] whitespace-nowrap', BOM_STATUS_META[st.bom_status].chip)} title={st.issues.join('\n')}>
                        BOM {BOM_STATUS_META[st.bom_status].en}
                      </span>
                    )}
                    {l.component_product_id && onOpenProduct && (
                      <Button type="button" variant="ghost" size="icon" title="Open this part's BOM" onClick={() => onOpenProduct(l.component_product_id!)}>
                        <ExternalLink size={14} />
                      </Button>
                    )}
                    {!readOnly && (
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(l.key)} title="Remove part">
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                {showErrors && errors[l.key] && <p className="text-xs text-red-600">{errors[l.key]}</p>}
              </div>
            );
          })}
        </section>
      )}

      {/* Packing */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-sm">Packing <Ur>پیکنگ</Ur></h4>
          <span className="text-xs text-muted-foreground">thaili · carton · label{defaultPack ? ` · default pack ${defaultPack} pcs` : ''}</span>
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() =>
                add({
                  ...blankLine(packing.some((l) => l.role === 'packing_primary') ? 'packing_outer' : 'packing_primary', 'packing', 'unit_per_pack', defaultPack),
                  qty: '1',
                })
              }
            >
              <Plus size={14} className="mr-1" /> Add line
            </Button>
          )}
        </div>
        {packing.length === 0 && <p className="text-xs text-amber-600">No thaili / carton set.</p>}
        {packing.map((l) => (
          renderMaterialRow(l, PACKING_ROLES, ['unit_per_pack', 'unit_per_pc'])
        ))}
      </section>

      {/* Preview */}
      <section className="rounded-md border bg-muted/20 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
          For
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            className="h-8 w-28"
            value={previewQty}
            onChange={(e) => setPreviewQty(e.target.value)}
          />
          pcs you need: <Ur>اتنے پیس کے لیے چاہیے</Ur>
        </div>
        {preview.length === 0 ? (
          <p className="text-xs text-muted-foreground">Add lines to see the material requirement.</p>
        ) : (
          <ul className="divide-y text-sm">
            {preview.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 py-1.5">
                <span className="min-w-0 truncate">
                  {p.name} <span className="text-xs text-muted-foreground">· {ROLE_META[p.role].en}</span>
                </span>
                <span className="font-medium tabular-nums whitespace-nowrap">{fmtQty(p.total, p.unit)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">Waste % included. Parts' own materials are planned through each part's BOM.</p>
      </section>

      {fitting.length > 0 && Object.values(statusMap).length > 0 && fitting.some((l) => l.component_product_id && statusMap[l.component_product_id]?.bom_status === 'missing') && (
        <Badge variant="outline" className="border-amber-500 text-amber-700">Some parts have no BOM yet — open them to add one.</Badge>
      )}
    </div>
  );
}

function fmtNeed(n: number, unit: 'kg' | 'pcs') {
  if (unit === 'kg') return n < 0.01 ? `${(n * 1000).toLocaleString(undefined, { maximumFractionDigits: 3 })} g` : `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} kg`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 4 })} pcs`;
}
