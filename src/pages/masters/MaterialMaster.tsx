import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable, Column } from '@/components/masters/DataTable';
import { StatusBadge } from '@/components/masters/StatusBadge';
import { useMaterials, useCreateMaterial, useUpdateMaterial, useDeleteMaterial, Material } from '@/hooks/useMaterials';
import { Beaker, Palette, Recycle, Droplets } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { RefreshButton } from '@/components/layout/RefreshButton';

type MaterialCategory = 'polymer' | 'masterbatch' | 'additive' | 'regrind';

export default function MaterialMaster() {
  const { data: materials = [], isLoading } = useMaterials();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'polymer':
      case 'pp':
      case 'hdpe':
      case 'ldpe':
      case 'pet':
        return <Beaker size={14} />;
      case 'masterbatch':
        return <Palette size={14} />;
      case 'regrind':
        return <Recycle size={14} />;
      default:
        return <Droplets size={14} />;
    }
  };

  const getCategoryStyle = (type: string) => {
    const t = type.toLowerCase();
    if (['polymer', 'pp', 'hdpe', 'ldpe', 'pet', 'abs', 'pc', 'nylon'].includes(t)) {
      return 'bg-primary/10 text-primary';
    }
    if (t === 'masterbatch') return 'bg-accent/10 text-accent';
    if (t === 'regrind') return 'bg-success/10 text-success';
    return 'bg-warning/10 text-warning';
  };

  const columns: Column<Material>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => <span className="font-medium text-primary font-mono">{item.code}</span>,
    },
    {
      key: 'name',
      label: 'Material Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.hsn_code || '-'}</p>
        </div>
      ),
    },
    {
      key: 'color',
      label: 'Color',
      render: (item) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {(item as any).color || '-'}
        </span>
      ),
    },
    {
      key: 'grade',
      label: 'Grade',
      render: (item) => <span>{(item as any).grade || '-'}</span>,
    },
    {
      key: 'material_type',
      label: 'Type',
      render: (item) => (
        <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium capitalize', getCategoryStyle(item.material_type))}>
          {getCategoryIcon(item.material_type)}
          {item.material_type}
        </span>
      ),
    },
    {
      key: 'unit_price',
      label: 'Rate/Unit',
      render: (item) => (
        <div>
          <p className="font-medium">₹{Number(item.unit_price || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">per {item.unit}</p>
        </div>
      ),
    },
    {
      key: 'min_stock',
      label: 'Stock Levels',
      render: (item) => (
        <div className="text-sm">
          <p>Min: {item.min_stock} {item.unit}</p>
          <p className="text-xs text-muted-foreground">Max: {item.max_stock} {item.unit}</p>
        </div>
      ),
    },
    {
      key: 'reorder_level',
      label: 'Reorder',
      render: (item) => <span className="text-muted-foreground">{item.reorder_level} {item.unit}</span>,
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} />,
    },
  ];

  const handleAdd = () => {
    setSelectedMaterial(null);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleView = (material: Material) => {
    setSelectedMaterial(material);
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (material: Material) => {
    if (confirm(`Are you sure you want to delete ${material.name}?`)) {
      deleteMaterial.mutate(material.id);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      material_type: formData.get('material_type') as string,
      color: formData.get('color') as string || null,
      grade: formData.get('grade') as string || null,
      unit: formData.get('unit') as string,
      unit_price: Number(formData.get('unit_price')) || 0,
      min_stock: Number(formData.get('min_stock')) || 0,
      max_stock: Number(formData.get('max_stock')) || 0,
      reorder_level: Number(formData.get('reorder_level')) || 0,
      hsn_code: formData.get('hsn_code') as string,
      is_active: true,
    };

    if (selectedMaterial) {
      updateMaterial.mutate({ id: selectedMaterial.id, ...data });
    } else {
      createMaterial.mutate(data);
    }
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return (
      <MainLayout title="Material Master" subtitle="Manage raw materials and compounds">
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

  const polymers = materials.filter((m) => ['pp', 'hdpe', 'ldpe', 'pet', 'abs', 'pc', 'nylon', 'polymer'].includes(m.material_type.toLowerCase()));
  const masterbatch = materials.filter((m) => m.material_type.toLowerCase() === 'masterbatch');
  const regrind = materials.filter((m) => m.material_type.toLowerCase() === 'regrind');

  return (
    <MainLayout title="Material Master" subtitle="Manage raw materials and compounds">
      <div className="animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Beaker size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{materials.length}</p>
                <p className="text-sm text-muted-foreground">Total Materials</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Beaker size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{polymers.length}</p>
                <p className="text-sm text-muted-foreground">Polymers</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Palette size={20} className="text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{masterbatch.length}</p>
                <p className="text-sm text-muted-foreground">Masterbatch</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Recycle size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{regrind.length}</p>
                <p className="text-sm text-muted-foreground">Regrind</p>
              </div>
            </div>
          </div>
        </div>

        <DataTable
          data={materials}
          columns={columns}
          searchPlaceholder="Search materials..."
          onAdd={handleAdd}
          addLabel="Add Material"
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      </div>

      {/* Material Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? 'View Material' : selectedMaterial ? 'Edit Material' : 'Add New Material'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Material Code *</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={selectedMaterial?.code}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Material Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={selectedMaterial?.name}
                  required
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="material_type">Material Type *</Label>
                <select
                  id="material_type"
                  name="material_type"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  defaultValue={selectedMaterial?.material_type}
                  required
                  disabled={isViewMode}
                >
                  <option value="">Select Type</option>
                  <option value="PP">PP (Polypropylene)</option>
                  <option value="HDPE">HDPE</option>
                  <option value="LDPE">LDPE</option>
                  <option value="PET">PET</option>
                  <option value="ABS">ABS</option>
                  <option value="Nylon">Nylon</option>
                  <option value="PC">PC (Polycarbonate)</option>
                  <option value="Masterbatch">Masterbatch</option>
                  <option value="Regrind">Regrind</option>
                  <option value="Additive">Additive</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit *</Label>
                <select
                  id="unit"
                  name="unit"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  defaultValue={selectedMaterial?.unit || 'kg'}
                  required
                  disabled={isViewMode}
                >
                  <option value="kg">Kilogram (kg)</option>
                  <option value="gms">Grams (gms)</option>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="ltr">Litre (ltr)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  name="color"
                  defaultValue={(selectedMaterial as any)?.color || ''}
                  disabled={isViewMode}
                  placeholder="e.g., Maroon, Black, Natural"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  name="grade"
                  defaultValue={(selectedMaterial as any)?.grade || ''}
                  disabled={isViewMode}
                  placeholder="e.g., H110MA, HD50MA003"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_price">Unit Price (₹)</Label>
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  step="0.01"
                  defaultValue={selectedMaterial?.unit_price || 0}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  name="hsn_code"
                  defaultValue={selectedMaterial?.hsn_code || ''}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Minimum Stock</Label>
                <Input
                  id="min_stock"
                  name="min_stock"
                  type="number"
                  defaultValue={selectedMaterial?.min_stock || 0}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_stock">Maximum Stock</Label>
                <Input
                  id="max_stock"
                  name="max_stock"
                  type="number"
                  defaultValue={selectedMaterial?.max_stock || 0}
                  disabled={isViewMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  name="reorder_level"
                  type="number"
                  defaultValue={selectedMaterial?.reorder_level || 0}
                  disabled={isViewMode}
                />
              </div>
            </div>
            {!isViewMode && (
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMaterial.isPending || updateMaterial.isPending}>
                  {selectedMaterial ? 'Update' : 'Save'}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
