import { useState, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable, Column } from '@/components/masters/DataTable';
import { StatusBadge } from '@/components/masters/StatusBadge';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, type ProductWithJoins } from '@/hooks/useProducts';
import { useClients } from '@/hooks/useClients';
import { useMaterials } from '@/hooks/useMaterials';
import { ProductLookupInput } from '@/components/masters/ProductLookupInput';
import { QuickAddMaterialDialog } from '@/components/masters/QuickAddMaterialDialog';
import { QuickAddClientDialog } from '@/components/masters/QuickAddClientDialog';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { Package, Box, Palette, Loader2, Plus, Layers, IndianRupee, Users, FileSpreadsheet, FileDown, FileUp, History } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProductRateHistoryDialog } from '@/components/masters/ProductRateHistoryDialog';
import { SearchableComboBox } from '@/components/ui/searchable-combobox';

// Molds, product-material mixes, BOM sets, inspection criteria, product images
// and the live costing panels reconnect in Phase 5.

const PRODUCT_CATEGORIES = [
  { value: 'INJ', label: 'Injection Molding' },
  { value: 'EBM', label: 'Extrusion Blow Molding' },
  { value: 'PET_BLOW', label: 'PET Blow Molding' },
  { value: 'FITTING', label: 'Fitting/Assembly' },
  { value: 'SET', label: 'Combined Set' },
];

const PRODUCT_TYPES = [
  { value: 'finished', label: 'Finished Product' },
  { value: 'component', label: 'Component' },
  { value: 'set', label: 'Set/Assembly' },
];

type ProductWithRelations = ProductWithJoins;

const emptyForm = {
  code: '',
  name: '',
  color: '',
  description: '',
  category: 'INJ',
  product_type: 'finished',
  masterbatch_id: '',
  masterbatch_ratio: 0,
  client_id: '',
  material_id: '',
  weight_per_piece: 0,
  agreed_weight_per_piece: 0,
  agreed_weight_notes: '',
  cavities: 1,
  cycle_time: 0,
  is_active: true,
  selling_price: 0,
  labour_price: 0,
  price_unit: 'piece',
  fitting_labour_override: null as number | null,
  transport_override: null as number | null,
  carton_packing_override: null as number | null,
  quality_inspection_override: null as number | null,
  pieces_per_hour_override: null as number | null,
  ke_rate_override: null as number | null,
  labour_rate_per_min_override: null as number | null,
  fitting_component1_cost: null as number | null,
  fitting_component2_cost: null as number | null,
  fitting_assembly_labour: null as number | null,
};

// Per-piece costing override fields (Phase 5 costing engine reads these)
const COSTING_FIELDS: Array<{ key: keyof typeof emptyForm; label: string; hint?: string }> = [
  { key: 'labour_rate_per_min_override', label: 'Labour Rate / min' },
  { key: 'pieces_per_hour_override', label: 'Pieces per Hour' },
  { key: 'ke_rate_override', label: 'K.E. Rate (electricity)' },
  { key: 'carton_packing_override', label: 'Carton / Packing per pc' },
  { key: 'quality_inspection_override', label: 'Quality Inspection per pc' },
  { key: 'transport_override', label: 'Transport / Cartage per pc' },
  { key: 'fitting_component1_cost', label: 'Fitting Component 1 Cost' },
  { key: 'fitting_component2_cost', label: 'Fitting Component 2 Cost' },
  { key: 'fitting_assembly_labour', label: 'Fitting Assembly Labour' },
  { key: 'fitting_labour_override', label: 'Fitting Labour Override' },
];

function loadForm(product: ProductWithRelations, opts?: { copy?: boolean }) {
  return {
    code: opts?.copy ? `${product.code}-COPY` : product.code,
    name: opts?.copy ? `${product.name} (Copy)` : product.name,
    color: product.color || '',
    description: product.description || '',
    category: product.category || 'INJ',
    product_type: product.product_type || 'finished',
    masterbatch_id: product.masterbatch_id || '',
    masterbatch_ratio: product.masterbatch_ratio || 0,
    client_id: product.client_id || '',
    material_id: product.material_id || '',
    weight_per_piece: product.weight_per_piece || 0,
    agreed_weight_per_piece: product.agreed_weight_per_piece || 0,
    agreed_weight_notes: product.agreed_weight_notes || '',
    cavities: product.cavities || 1,
    cycle_time: product.cycle_time || 0,
    is_active: product.is_active ?? true,
    selling_price: product.selling_price || 0,
    labour_price: (product as any).labour_price || 0,
    price_unit: product.price_unit || 'piece',
    fitting_labour_override: (product as any).fitting_labour_override ?? null,
    transport_override: (product as any).transport_override ?? null,
    carton_packing_override: (product as any).carton_packing_override ?? null,
    quality_inspection_override: (product as any).quality_inspection_override ?? null,
    pieces_per_hour_override: (product as any).pieces_per_hour_override ?? null,
    ke_rate_override: (product as any).ke_rate_override ?? null,
    labour_rate_per_min_override: (product as any).labour_rate_per_min_override ?? null,
    fitting_component1_cost: (product as any).fitting_component1_cost ?? null,
    fitting_component2_cost: (product as any).fitting_component2_cost ?? null,
    fitting_assembly_labour: (product as any).fitting_assembly_labour ?? null,
  };
}

export default function ProductMaster() {
  const { data: products = [], isLoading } = useProducts();
  const { data: clients = [] } = useClients();
  const { data: materials = [] } = useMaterials();

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({ ...emptyForm });

  // Quick Add dialogs
  const [quickAddMaterialDialog, setQuickAddMaterialDialog] = useState<{
    open: boolean;
    type?: string;
    target?: 'base' | 'masterbatch';
  }>({ open: false });
  const [quickAddClientDialog, setQuickAddClientDialog] = useState(false);

  // Filter state for Product Master shortlist
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClientIds, setFilterClientIds] = useState<string[]>([]); // empty = all; may contain 'own' for no-client products
  const [clientFilterSearch, setClientFilterSearch] = useState('');
  const [rateHistoryProduct, setRateHistoryProduct] = useState<ProductWithRelations | null>(null);

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const uniqueClients = useMemo(() => {
    const seen = new Map<string, string>();
    (products as ProductWithRelations[]).forEach(p => {
      if (p.client_id && p.client?.name) seen.set(p.client_id, p.client.name);
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products as ProductWithRelations[];
    if (filterCategory !== 'all') result = result.filter(p => p.category === filterCategory);
    if (filterType !== 'all') result = result.filter(p => p.product_type === filterType);
    if (filterStatus !== 'all') result = result.filter(p =>
      filterStatus === 'active' ? p.is_active !== false : p.is_active === false
    );
    if (filterClientIds.length > 0) {
      const wantOwn = filterClientIds.includes('own');
      const ids = new Set(filterClientIds.filter(v => v !== 'own'));
      result = result.filter(p => (wantOwn && !p.client_id) || (p.client_id && ids.has(p.client_id)));
    }
    return result;
  }, [products, filterCategory, filterType, filterStatus, filterClientIds]);

  // Filter masterbatch materials
  const masterbatchMaterials = materials.filter((m: any) =>
    m.material_type?.toLowerCase().includes('masterbatch') ||
    m.material_type?.toLowerCase().includes('color') ||
    m.material_type?.toLowerCase() === 'mb'
  );

  const columns: Column<ProductWithRelations>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => <span className="font-medium text-primary font-mono">{item.code}</span>,
    },
    {
      key: 'name',
      label: 'Product Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          {item.client?.name && (
            <p className="text-xs text-muted-foreground">Client: {item.client.name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (item) => (
        <Badge variant="outline" className="font-mono text-xs">
          {item.category || 'INJ'}
        </Badge>
      ),
    },
    {
      key: 'product_type',
      label: 'Type',
      render: (item) => {
        const typeLabel = PRODUCT_TYPES.find(t => t.value === item.product_type)?.label || 'Finished';
        return (
          <span className="text-xs text-muted-foreground capitalize">
            {typeLabel}
          </span>
        );
      },
    },
    {
      key: 'color',
      label: 'Color',
      render: (item) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {item.color || '-'}
        </span>
      ),
    },
    {
      key: 'material_id',
      label: 'Material',
      render: (item) => (
        <div>
          <p className="font-medium">{item.material?.name || '-'}</p>
          {item.masterbatch_ratio && item.masterbatch_ratio > 0 ? (
            <p className="text-xs text-muted-foreground">
              +{item.masterbatch_ratio}% MB
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: 'weight_per_piece',
      label: 'Weight (Actual / Agreed)',
      render: (item) => {
        const actual = item.weight_per_piece;
        const agreed = item.agreed_weight_per_piece;
        if (!actual && !agreed) return <span>-</span>;
        return (
          <span className="text-xs">
            {actual ? `${actual} g` : '-'}
            {agreed ? <span className="text-primary"> / {agreed} g</span> : null}
          </span>
        );
      },
    },
    {
      key: 'selling_price',
      label: 'Pricing',
      render: (item) => {
        const unit = item.price_unit === 'kg' ? '/kg' : '/pc';
        const hasLabour = item.labour_price && item.labour_price > 0;
        const hasMaterial = item.selling_price && item.selling_price > 0;

        if (!hasLabour && !hasMaterial) {
          return <span className="text-muted-foreground">-</span>;
        }

        return (
          <div className="text-xs space-y-0.5">
            {hasLabour ? (
              <div>
                <span className="text-muted-foreground">Labour: </span>
                <span className="font-medium text-primary">Rs {item.labour_price}{unit}</span>
              </div>
            ) : null}
            {hasMaterial ? (
              <div>
                <span className="text-muted-foreground">W/Mat: </span>
                <span className="font-medium text-success">Rs {item.selling_price}{unit}</span>
              </div>
            ) : null}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setRateHistoryProduct(item); }}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary mt-0.5"
            >
              <History className="h-3 w-3" /> Rate history
            </button>
          </div>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} />,
    },
  ];

  const resetForm = () => {
    setFormData({ ...emptyForm });
    setSelectedProduct(null);
    setActiveTab('basic');
    setIsCopyMode(false);
  };

  const handleAdd = () => {
    resetForm();
    setIsViewMode(false);
    setIsCopyMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (product: ProductWithRelations) => {
    setFormData(loadForm(product));
    setSelectedProduct(product);
    setIsViewMode(false);
    setIsCopyMode(false);
    setIsDialogOpen(true);
  };

  const handleView = (product: ProductWithRelations) => {
    setFormData(loadForm(product));
    setSelectedProduct(product);
    setIsViewMode(true);
    setIsCopyMode(false);
    setIsDialogOpen(true);
  };

  const handleCopy = (product: ProductWithRelations) => {
    setFormData(loadForm(product, { copy: true }));
    setSelectedProduct(product);
    setIsViewMode(false);
    setIsCopyMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (product: ProductWithRelations) => {
    if (confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteProduct.mutate(product.id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      code: formData.code,
      name: formData.name,
      color: formData.color || null,
      description: formData.description || null,
      category: formData.category || 'INJ',
      product_type: formData.product_type || 'finished',
      masterbatch_id: formData.masterbatch_id || null,
      masterbatch_ratio: formData.masterbatch_ratio || null,
      client_id: formData.client_id || null,
      material_id: formData.material_id || null,
      weight_per_piece: formData.weight_per_piece || null,
      agreed_weight_per_piece: formData.agreed_weight_per_piece || null,
      agreed_weight_notes: formData.agreed_weight_notes || null,
      cavities: formData.cavities || null,
      cycle_time: formData.cycle_time || 0,
      is_active: formData.is_active,
      selling_price: formData.selling_price || 0,
      labour_price: formData.labour_price || 0,
      price_unit: formData.price_unit || 'piece',
      fitting_labour_override: formData.fitting_labour_override,
      transport_override: formData.transport_override,
      carton_packing_override: formData.carton_packing_override,
      quality_inspection_override: formData.quality_inspection_override,
      pieces_per_hour_override: formData.pieces_per_hour_override,
      ke_rate_override: formData.ke_rate_override,
      labour_rate_per_min_override: formData.labour_rate_per_min_override,
      fitting_component1_cost: formData.fitting_component1_cost,
      fitting_component2_cost: formData.fitting_component2_cost,
      fitting_assembly_labour: formData.fitting_assembly_labour,
    };

    try {
      if (selectedProduct && !isCopyMode) {
        await updateProduct.mutateAsync({ id: selectedProduct.id, ...productData });
      } else {
        await createProduct.mutateAsync(productData);
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  // Export rows derived from filtered products.
  const exportRows = useMemo(() => {
    return filteredProducts.map((p) => ({
      Code: p.code,
      Name: p.name,
      Category: p.category || '',
      Type: PRODUCT_TYPES.find(t => t.value === p.product_type)?.label || p.product_type || '',
      Color: p.color || '',
      Material: p.material?.name || '',
      Client: p.client?.name || '',
      'Weight (g)': p.weight_per_piece ?? '',
      'Agreed Weight (g)': p.agreed_weight_per_piece ?? '',
      Cavities: p.cavities ?? '',
      'Cycle Time': p.cycle_time ?? '',
      'Labour Price (Rs)': p.labour_price ?? '',
      'Sale Price (Rs)': p.selling_price ?? '',
      'Price Unit': p.price_unit || '',
      Status: p.is_active ? 'Active' : 'Inactive',
    }));
  }, [filteredProducts]);

  // ---- xlsx bulk import (upsert by Code) ----
  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (!rows.length) {
        toast.info('No rows found in the file');
        return;
      }
      const byCode = new Map((products as ProductWithRelations[]).map(p => [p.code.trim().toLowerCase(), p]));
      const clientByName = new Map(clients.map((c: any) => [String(c.name).trim().toLowerCase(), c.id]));
      const materialByName = new Map(materials.map((m: any) => [String(m.name).trim().toLowerCase(), m.id]));
      const typeByLabel = new Map(PRODUCT_TYPES.map(t => [t.label.toLowerCase(), t.value]));

      let created = 0, updated = 0, skipped = 0;
      for (const r of rows) {
        const code = String(r.Code ?? r.code ?? '').trim();
        const name = String(r.Name ?? r.name ?? '').trim();
        if (!code || !name) { skipped++; continue; }
        const typeRaw = String(r.Type ?? '').trim().toLowerCase();
        const payload: any = {
          code,
          name,
          category: String(r.Category ?? '').trim() || null,
          product_type: typeByLabel.get(typeRaw) || (typeRaw || null),
          color: String(r.Color ?? '').trim() || null,
          client_id: clientByName.get(String(r.Client ?? '').trim().toLowerCase()) || null,
          material_id: materialByName.get(String(r.Material ?? '').trim().toLowerCase()) || null,
          weight_per_piece: Number(r['Weight (g)']) || null,
          agreed_weight_per_piece: Number(r['Agreed Weight (g)']) || null,
          cavities: Number(r.Cavities) || null,
          cycle_time: Number(r['Cycle Time']) || 0,
          labour_price: Number(r['Labour Price (Rs)']) || 0,
          selling_price: Number(r['Sale Price (Rs)']) || 0,
          price_unit: String(r['Price Unit'] ?? '').trim() || 'piece',
          is_active: String(r.Status ?? 'Active').trim().toLowerCase() !== 'inactive',
        };
        const existing = byCode.get(code.toLowerCase());
        try {
          if (existing) {
            await updateProduct.mutateAsync({ id: existing.id, ...payload });
            updated++;
          } else {
            await createProduct.mutateAsync(payload);
            created++;
          }
        } catch {
          skipped++;
        }
      }
      toast.success(`Import complete — ${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ''}`);
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <MainLayout title="Product Master" subtitle="Manage product catalog">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  const activeProducts = products.filter((p) => p.is_active);
  const setProducts = (products as ProductWithRelations[]).filter((p) => p.product_type === 'set');
  const clientProducts = products.filter((p) => p.client_id);

  const hasActiveFilters = filterCategory !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterClientIds.length > 0;

  const clearFilters = () => {
    setFilterCategory('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterClientIds([]);
  };

  const toggleClientFilter = (id: string) => {
    setFilterClientIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const filteredClientOptions = clientFilterSearch.trim()
    ? uniqueClients.filter(c => c.name.toLowerCase().includes(clientFilterSearch.trim().toLowerCase()))
    : uniqueClients;

  const clientFilterLabel = filterClientIds.length === 0
    ? 'All Clients'
    : filterClientIds.length === 1
      ? (filterClientIds[0] === 'own' ? 'Own Products' : (uniqueClients.find(c => c.id === filterClientIds[0])?.name ?? '1 selected'))
      : `${filterClientIds.length} clients`;

  const filterUI = (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger className="h-9 w-[130px] text-xs">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {PRODUCT_CATEGORIES.map(c => (
            <SelectItem key={c.value} value={c.value}>{c.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="h-9 w-[130px] text-xs">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {PRODUCT_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="h-9 w-[110px] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 w-[170px] justify-between text-xs font-normal">
            <span className="truncate">{clientFilterLabel}</span>
            <Users className="h-3.5 w-3.5 opacity-60 shrink-0 ml-1" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <div className="p-2 border-b space-y-2">
            <Input
              value={clientFilterSearch}
              onChange={(e) => setClientFilterSearch(e.target.value)}
              placeholder="Search clients..."
              className="h-8 text-xs"
            />
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs flex-1"
                onClick={() => setFilterClientIds([])}>
                All
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs flex-1"
                onClick={() => setFilterClientIds(['own', ...uniqueClients.map(c => c.id)])}>
                Select all
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs flex-1"
                onClick={() => setFilterClientIds([])}>
                None
              </Button>
            </div>
          </div>
          <div className="max-h-[260px] overflow-y-auto p-1">
            <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs">
              <Checkbox
                checked={filterClientIds.includes('own')}
                onCheckedChange={() => toggleClientFilter('own')}
              />
              <span className="italic text-muted-foreground">Own Products (no client)</span>
            </label>
            {filteredClientOptions.map(c => (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-xs">
                <Checkbox
                  checked={filterClientIds.includes(c.id)}
                  onCheckedChange={() => toggleClientFilter(c.id)}
                />
                <span className="truncate">{c.name}</span>
              </label>
            ))}
            {filteredClientOptions.length === 0 && (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">No clients found</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground hover:text-foreground">
          Clear Filters
        </Button>
      )}
    </div>
  );

  const handleExportCSV = () => {
    if (exportRows.length === 0) {
      toast.info('No products to export');
      return;
    }
    const headers = Object.keys(exportRows[0]);
    const csvContent = [
      headers.join(','),
      ...exportRows.map((row) =>
        headers
          .map((h) => {
            const val = (row as any)[h];
            const str = val === null || val === undefined ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `products_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success(`Exported ${exportRows.length} products to CSV`);
  };

  const handleExportExcel = () => {
    if (exportRows.length === 0) {
      toast.info('No products to export');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, `products_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`Exported ${exportRows.length} products to Excel`);
  };

  const exportActions = (
    <div className="flex items-center gap-2">
      <input
        ref={importInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportFile(f);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()} disabled={importing} className="gap-2">
        {importing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
        Import
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
        <FileDown size={14} />
        CSV
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
        <FileSpreadsheet size={14} />
        Excel
      </Button>
    </div>
  );

  return (
    <MainLayout title="Product Master" subtitle="Manage product catalog with categories, materials & pricing">
      <div className="animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{products.length}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-success/30 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Box size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{activeProducts.length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-accent/30 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Layers size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{setProducts.length}</p>
                <p className="text-sm text-muted-foreground">Product Sets</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-warning/30 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Palette size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-warning">{clientProducts.length}</p>
                <p className="text-sm text-muted-foreground">Client Products</p>
              </div>
            </div>
          </div>
        </div>

        <DataTable
          data={filteredProducts}
          columns={columns}
          searchPlaceholder="Search products..."
          onAdd={handleAdd}
          addLabel="Add Product"
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
          onCopy={handleCopy}
          filters={filterUI}
          exportActions={exportActions}
        />
      </div>

      {/* Product Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? 'View Product'
                : isCopyMode
                  ? 'Copy Product'
                  : selectedProduct
                    ? 'Edit Product'
                    : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center gap-1">
                  <IndianRupee size={14} />
                  Pricing &amp; Costing
                </TabsTrigger>
                {/* Materials mix / BOM Components / Inspection tabs reconnect in Phase 5 */}
              </TabsList>

              <TabsContent value="basic" className="space-y-4 pt-4">
                {/* Product image upload reconnects in Phase 5 (storage bucket) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Product Code *</Label>
                    <ProductLookupInput
                      id="code"
                      value={formData.code}
                      onChange={(value) => setFormData({ ...formData, code: value })}
                      onSelectProduct={(product) => setFormData({ ...formData, code: product.code, name: product.name })}
                      products={(products as ProductWithRelations[]).map(p => ({ code: p.code, name: p.name }))}
                      searchBy="code"
                      required
                      disabled={isViewMode}
                      placeholder="e.g., PRD-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <ProductLookupInput
                      id="name"
                      value={formData.name}
                      onChange={(value) => setFormData({ ...formData, name: value })}
                      onSelectProduct={(product) => setFormData({ ...formData, code: product.code, name: product.name })}
                      products={(products as ProductWithRelations[]).map(p => ({ code: p.code, name: p.name }))}
                      searchBy="name"
                      required
                      disabled={isViewMode}
                      placeholder="e.g., Spout Cap Maroon"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        category: value,
                        product_type: (value === 'FITTING' || value === 'SET') ? 'set' : formData.product_type,
                      })}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product_type">Product Type *</Label>
                    <Select
                      value={formData.product_type}
                      onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                      disabled={isViewMode}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      disabled={isViewMode}
                      placeholder="e.g., Maroon, Black"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_id">Client</Label>
                    <div className="flex gap-2">
                      <ClientSelector
                        value={formData.client_id || ""}
                        onChange={(value) => setFormData({ ...formData, client_id: value })}
                        placeholder="Select client..."
                        disabled={isViewMode}
                        includeNone
                        noneLabel="None"
                        className="flex-1"
                      />
                      {!isViewMode && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="flex-shrink-0"
                                onClick={() => setQuickAddClientDialog(true)}
                              >
                                <Plus size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Quick add new client</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>

                  {/* Mold assignment reconnects in Phase 5 (molds / product_molds) */}

                  <div className="space-y-2">
                    <Label htmlFor="material_id">Base Material</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableComboBox
                          value={formData.material_id || ''}
                          onChange={(value) => setFormData({ ...formData, material_id: value })}
                          disabled={isViewMode}
                          placeholder="Select base material"
                          searchPlaceholder="Search by name or type…"
                          emptyMessage="No matching material"
                          options={materials.filter((m: any) => m.id).map((material: any) => ({
                            value: material.id,
                            label: material.name,
                            description: material.material_type,
                          }))}
                        />
                      </div>
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0"
                          title="Quick add new material"
                          onClick={() => setQuickAddMaterialDialog({ open: true, target: 'base' })}
                        >
                          <Plus size={16} />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="masterbatch_id">Masterbatch</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <SearchableComboBox
                          value={formData.masterbatch_id || ''}
                          onChange={(value) => setFormData({ ...formData, masterbatch_id: value })}
                          disabled={isViewMode}
                          placeholder={masterbatchMaterials.length === 0 ? 'No masterbatch materials found' : 'Select masterbatch'}
                          searchPlaceholder="Search by name or color…"
                          emptyMessage="No matching masterbatch"
                          options={masterbatchMaterials.map((material: any) => ({
                            value: material.id,
                            label: material.name,
                            description: material.color || material.material_type,
                          }))}
                        />
                      </div>
                      {!isViewMode && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="flex-shrink-0"
                          title="Quick add new masterbatch"
                          onClick={() => setQuickAddMaterialDialog({ open: true, type: 'Masterbatch', target: 'masterbatch' })}
                        >
                          <Plus size={16} />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="masterbatch_ratio">Masterbatch Ratio (%)</Label>
                    <Input
                      id="masterbatch_ratio"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.masterbatch_ratio || ''}
                      onChange={(e) => setFormData({ ...formData, masterbatch_ratio: parseFloat(e.target.value) || 0 })}
                      disabled={isViewMode}
                      placeholder="e.g., 2.0"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      disabled={isViewMode}
                      placeholder="Product description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight_per_piece">Actual Weight per Piece (g)</Label>
                    <Input
                      id="weight_per_piece"
                      type="number"
                      step="0.01"
                      value={formData.weight_per_piece || ''}
                      onChange={(e) => setFormData({ ...formData, weight_per_piece: parseFloat(e.target.value) || 0 })}
                      disabled={isViewMode}
                      placeholder="e.g., 2.1"
                    />
                    <p className="text-xs text-muted-foreground">Real moulded weight</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="agreed_weight_per_piece" className="text-primary">Agreed Weight per Piece (g)</Label>
                    <Input
                      id="agreed_weight_per_piece"
                      type="number"
                      step="0.001"
                      value={formData.agreed_weight_per_piece || ''}
                      onChange={(e) => setFormData({ ...formData, agreed_weight_per_piece: parseFloat(e.target.value) || 0 })}
                      disabled={isViewMode}
                      placeholder="e.g., 2.2"
                    />
                    <p className="text-xs text-muted-foreground">Weight billed to customer — used on dispatch challan &amp; consumption report</p>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="agreed_weight_notes">Agreed Weight Notes</Label>
                    <Input
                      id="agreed_weight_notes"
                      value={formData.agreed_weight_notes || ''}
                      onChange={(e) => setFormData({ ...formData, agreed_weight_notes: e.target.value })}
                      disabled={isViewMode}
                      placeholder="Agreement reference / reason for difference"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cavities">Cavities</Label>
                    <Input
                      id="cavities"
                      type="number"
                      min="1"
                      value={formData.cavities || ''}
                      onChange={(e) => setFormData({ ...formData, cavities: parseInt(e.target.value) || 1 })}
                      disabled={isViewMode}
                      placeholder="e.g., 12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cycle_time">Cycle Time (seconds)</Label>
                    <Input
                      id="cycle_time"
                      type="number"
                      value={formData.cycle_time || ''}
                      onChange={(e) => setFormData({ ...formData, cycle_time: parseInt(e.target.value) || 0 })}
                      disabled={isViewMode}
                      placeholder="e.g., 25"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Pricing + costing overrides */}
              <TabsContent value="pricing" className="space-y-4 pt-4">
                <div className="p-4 border border-border rounded-lg space-y-4 bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2">
                    <IndianRupee size={16} />
                    Pricing Information
                  </h4>

                  {/* Price Unit - applies to both prices */}
                  <div className="space-y-2">
                    <Label htmlFor="price_unit">Price Unit</Label>
                    <Select
                      value={formData.price_unit}
                      onValueChange={(value) => setFormData({ ...formData, price_unit: value })}
                      disabled={isViewMode}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="piece">Per Piece</SelectItem>
                        <SelectItem value="kg">Per Kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-3 border border-primary/30 rounded-lg bg-primary/5">
                      <Label htmlFor="labour_price" className="text-primary">Labour Job Price (Rs)</Label>
                      <Input
                        id="labour_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.labour_price || ''}
                        onChange={(e) => setFormData({ ...formData, labour_price: parseFloat(e.target.value) || 0 })}
                        disabled={isViewMode}
                        placeholder="e.g., 15.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Manufacturing only (client provides material)
                      </p>
                    </div>
                    <div className="space-y-2 p-3 border border-success/30 rounded-lg bg-success/5">
                      <Label htmlFor="selling_price" className="text-success">With Material Price (Rs)</Label>
                      <Input
                        id="selling_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.selling_price || ''}
                        onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                        disabled={isViewMode}
                        placeholder="e.g., 25.50"
                      />
                      <p className="text-xs text-muted-foreground">
                        Includes material cost (own product/with material)
                      </p>
                    </div>
                  </div>

                  {formData.weight_per_piece > 0 && formData.price_unit === 'kg' && (
                    <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                      <p className="font-medium">Effective per-piece rates:</p>
                      {formData.labour_price > 0 && (
                        <p>Labour: Rs {((formData.labour_price * formData.weight_per_piece) / 1000).toFixed(2)}/pc</p>
                      )}
                      {formData.selling_price > 0 && (
                        <p>With Material: Rs {((formData.selling_price * formData.weight_per_piece) / 1000).toFixed(2)}/pc</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Costing overrides — the live cost breakdown panel reconnects in Phase 5 */}
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <div>
                    <h4 className="font-medium">Costing Overrides (per piece)</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to use global rates. The full cost breakdown calculator reconnects in Phase 5.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {COSTING_FIELDS.map((f) => (
                      <div key={f.key as string} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={(formData as any)[f.key] ?? ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              [f.key]: e.target.value === '' ? null : parseFloat(e.target.value),
                            } as any)
                          }
                          disabled={isViewMode}
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {!isViewMode && (
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) && (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  )}
                  {selectedProduct && !isCopyMode ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Add Material Dialog */}
      <QuickAddMaterialDialog
        open={quickAddMaterialDialog.open}
        onOpenChange={(open) => setQuickAddMaterialDialog({ ...quickAddMaterialDialog, open })}
        defaultMaterialType={quickAddMaterialDialog.type}
        onSuccess={(newMaterialId) => {
          if (quickAddMaterialDialog.target === 'base') {
            setFormData(prev => ({ ...prev, material_id: newMaterialId }));
          } else if (quickAddMaterialDialog.target === 'masterbatch') {
            setFormData(prev => ({ ...prev, masterbatch_id: newMaterialId }));
          }
          setQuickAddMaterialDialog({ open: false });
        }}
      />

      {/* Quick Add Client Dialog */}
      <QuickAddClientDialog
        open={quickAddClientDialog}
        onOpenChange={setQuickAddClientDialog}
        onSuccess={(newClientId) => {
          setFormData(prev => ({ ...prev, client_id: newClientId }));
          setQuickAddClientDialog(false);
        }}
      />

      {/* Product Rate History Dialog */}
      <ProductRateHistoryDialog
        open={!!rateHistoryProduct}
        onOpenChange={(open) => { if (!open) setRateHistoryProduct(null); }}
        productId={rateHistoryProduct?.id ?? null}
        productCode={rateHistoryProduct?.code}
        productName={rateHistoryProduct?.name}
      />
    </MainLayout>
  );
}
