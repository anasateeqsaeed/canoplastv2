import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { toast } from 'sonner';

interface StorageLocation {
  id: string;
  location_code: string;
  location_name: string | null;
  capacity_kg: number | null;
  current_stock_kg: number | null;
  is_active: boolean;
}

interface EditRackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rack: StorageLocation | null;
  storeName: string;
}

export function EditRackDialog({
  open,
  onOpenChange,
  rack,
  storeName,
}: EditRackDialogProps) {
  const { updateLocation } = useStorageLocations();
  
  const [form, setForm] = useState({
    location_code: '',
    capacity_kg: '',
    is_active: true,
  });

  useEffect(() => {
    if (rack) {
      setForm({
        location_code: rack.location_code || '',
        capacity_kg: rack.capacity_kg?.toString() || '',
        is_active: rack.is_active,
      });
    }
  }, [rack]);

  const handleSave = async () => {
    if (!rack) return;
    
    if (!form.location_code) {
      toast.error('Please enter a rack number');
      return;
    }

    const capacityKg = form.capacity_kg ? parseFloat(form.capacity_kg) : null;

    await updateLocation.mutateAsync({
      id: rack.id,
      location_code: form.location_code,
      capacity_kg: capacityKg,
      is_active: form.is_active,
    });

    onOpenChange(false);
  };

  const currentStock = rack?.current_stock_kg || 0;
  const capacity = parseFloat(form.capacity_kg) || 0;
  const available = Math.max(0, capacity - currentStock);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Edit Rack {rack?.location_code} in "{storeName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rack-code">Rack Number *</Label>
            <Input
              id="rack-code"
              placeholder="e.g., 01"
              value={form.location_code}
              onChange={(e) => setForm({ ...form, location_code: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (kg)</Label>
            <Input
              id="capacity"
              type="number"
              placeholder="e.g., 5000"
              value={form.capacity_kg}
              onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is-active">Active</Label>
            <Switch
              id="is-active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Stock:</span>
              <span className="font-medium">{currentStock.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available Capacity:</span>
              <span className="font-medium">{available.toLocaleString()} kg</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateLocation.isPending}>
            {updateLocation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
