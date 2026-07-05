import { useState } from 'react';
import { useCreateMaterial } from '@/hooks/useMaterials';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, Plus } from 'lucide-react';

const MATERIAL_TYPES = [
  { value: 'PP', label: 'Polypropylene (PP)' },
  { value: 'HDPE', label: 'HDPE' },
  { value: 'LDPE', label: 'LDPE' },
  { value: 'PET', label: 'PET' },
  { value: 'ABS', label: 'ABS' },
  { value: 'Masterbatch', label: 'Masterbatch/Pigment' },
  { value: 'Additive', label: 'Additive' },
  { value: 'Other', label: 'Other' },
];

const UNITS = [
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gms', label: 'Grams (gms)' },
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'ltrs', label: 'Liters (ltrs)' },
];

interface QuickAddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (materialId: string) => void;
  defaultMaterialType?: string;
}

export function QuickAddMaterialDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultMaterialType,
}: QuickAddMaterialDialogProps) {
  const createMaterial = useCreateMaterial();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    material_type: defaultMaterialType || '',
    color: '',
    grade: '',
    unit: 'kg',
    unit_price: 0,
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      material_type: defaultMaterialType || '',
      color: '',
      grade: '',
      unit: 'kg',
      unit_price: 0,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      return;
    }

    try {
      const newMaterial = await createMaterial.mutateAsync({
        code: formData.code.trim(),
        name: formData.name.trim(),
        material_type: formData.material_type || null,
        color: formData.color || null,
        grade: formData.grade || null,
        unit: formData.unit || 'kg',
        unit_price: formData.unit_price || 0,
        is_active: true,
      });

      onSuccess?.(newMaterial.id);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  // Reset form when dialog opens with new default type
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(prev => ({
        ...prev,
        material_type: defaultMaterialType || prev.material_type,
      }));
    } else {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Quick Add Material
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material-code">Code *</Label>
              <Input
                id="material-code"
                placeholder="e.g. PP-RIL-H110"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-type">Type</Label>
              <Select
                value={formData.material_type}
                onValueChange={(value) => setFormData({ ...formData, material_type: value })}
              >
                <SelectTrigger id="material-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-name">Name *</Label>
            <Input
              id="material-name"
              placeholder="e.g. Repol H110MA"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material-color">Color</Label>
              <Input
                id="material-color"
                placeholder="e.g. Natural, Red"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-grade">Grade</Label>
              <Input
                id="material-grade"
                placeholder="e.g. H110MA"
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="material-unit">Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger id="material-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material-price">Unit Price (Rs)</Label>
              <Input
                id="material-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.unit_price || ''}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMaterial.isPending || !formData.code.trim() || !formData.name.trim()}
            >
              {createMaterial.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Material
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
