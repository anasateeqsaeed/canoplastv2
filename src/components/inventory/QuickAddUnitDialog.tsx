import { useState } from 'react';
import { useCreateUnitOfMeasure } from '@/hooks/useUnitsOfMeasure';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus } from 'lucide-react';

interface QuickAddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (unitId: string, unitCode: string) => void;
}

export function QuickAddUnitDialog({
  open,
  onOpenChange,
  onSuccess,
}: QuickAddUnitDialogProps) {
  const createUnit = useCreateUnitOfMeasure();
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim() || !formData.name.trim()) {
      return;
    }

    try {
      const newUnit = await createUnit.mutateAsync({
        code: formData.code.trim().toLowerCase(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
      });

      onSuccess?.(newUnit.id, newUnit.code);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating unit:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
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
            Quick Add Unit of Measure
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit-code">Code *</Label>
              <Input
                id="unit-code"
                placeholder="e.g. pkt, sht"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Short abbreviation (lowercase)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-name">Name *</Label>
              <Input
                id="unit-name"
                placeholder="e.g. Packet, Sheet"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit-description">Description</Label>
            <Textarea
              id="unit-description"
              placeholder="Optional description for this unit..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
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
              disabled={createUnit.isPending || !formData.code.trim() || !formData.name.trim()}
            >
              {createUnit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Unit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
