import { useState } from 'react';
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
import { Store } from '@/hooks/useStores';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AddRackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: Store;
}

export function AddRackDialog({ open, onOpenChange, store }: AddRackDialogProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rackNumber, setRackNumber] = useState('');
  const [capacity, setCapacity] = useState('5000');

  const handleSubmit = async () => {
    if (!rackNumber) {
      toast.error('Please enter a rack number');
      return;
    }

    const capacityNum = parseFloat(capacity);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      toast.error('Please enter a valid capacity');
      return;
    }

    setIsSubmitting(true);
    try {
      const paddedNumber = rackNumber.padStart(2, '0');
      const locationCode = paddedNumber;
      const locationName = `Rack ${paddedNumber}`;

      const { error } = await supabase.from('storage_locations').insert({
        store_id: store.id,
        location_code: locationCode,
        location_name: locationName,
        zone: store.code, // For backwards compatibility
        capacity_kg: capacityNum,
        current_stock_kg: 0,
        is_active: true,
      });

      if (error) throw error;

      toast.success(`${locationName} added to ${store.name}`);
      queryClient.invalidateQueries({ queryKey: ['store-racks', store.id] });
      queryClient.invalidateQueries({ queryKey: ['storage-locations'] });
      
      onOpenChange(false);
      setRackNumber('');
      setCapacity('5000');
    } catch (error: any) {
      toast.error(`Failed to add rack: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Rack to {store.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rack-number">Rack Number *</Label>
            <Input
              id="rack-number"
              type="number"
              min="1"
              max="99"
              placeholder="e.g., 1, 2, 3..."
              value={rackNumber}
              onChange={(e) => setRackNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Will be displayed as "Rack 01", "Rack 02", etc.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (kg) *</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              placeholder="e.g., 5000"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Adding...' : 'Add Rack'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
