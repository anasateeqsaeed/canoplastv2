import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin, Package, Warehouse } from 'lucide-react';
import { useStorageLocations } from '@/hooks/useStorageLocations';

interface PutAwayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materialLot: {
    id: string;
    lot_number: string;
    quantity: number;
    remaining_qty: number;
    unit: string;
    material?: {
      name: string;
      code: string;
      material_type?: string;
    };
  } | null;
  onConfirm: (lotId: string, locationId: string) => Promise<void>;
  isPending?: boolean;
}

export function PutAwayDialog({
  open,
  onOpenChange,
  materialLot,
  onConfirm,
  isPending = false,
}: PutAwayDialogProps) {
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  
  const { locations: allLocations = [] } = useStorageLocations();
  
  // Get unique zones
  const zones: string[] = [...new Set(allLocations.map(loc => loc.zone))];
  
  // Filter locations by zone
  const filteredLocations = allLocations.filter(loc => 
    selectedZone ? loc.zone === selectedZone : true
  );
  
  // Get selected location details
  const selectedLocation = allLocations.find(loc => loc.id === selectedLocationId);
  
  // Reset selections when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedZone('');
      setSelectedLocationId('');
    }
  }, [open]);
  
  // Auto-suggest zone based on material type
  useEffect(() => {
    if (materialLot?.material?.material_type && !selectedZone) {
      const materialType = materialLot.material.material_type.toLowerCase();
      if (materialType.includes('polymer') || materialType.includes('resin')) {
        setSelectedZone('raw_material');
      } else if (materialType.includes('masterbatch') || materialType.includes('color')) {
        setSelectedZone('masterbatch');
      } else if (materialType.includes('filler')) {
        setSelectedZone('filler');
      }
    }
  }, [materialLot, selectedZone]);
  
  const handleConfirm = async () => {
    if (!materialLot || !selectedLocationId) return;
    await onConfirm(materialLot.id, selectedLocationId);
    onOpenChange(false);
  };
  
  const getZoneLabel = (zone: string) => {
    const labels: Record<string, string> = {
      'raw_material': 'Raw Material',
      'injection': 'Injection RM',
      'blow_molding': 'Blow Molding RM',
      'masterbatch': 'Masterbatch/Color',
      'filler': 'Filler Storage',
      'compound': 'Compound',
      'regrind': 'Regrind',
      'finished': 'Finished Goods',
      'hold': 'Hold/Quarantine',
    };
    return labels[zone] || zone;
  };

  if (!materialLot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Put Away to Location
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Material Info */}
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{materialLot.material?.name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Lot: {materialLot.lot_number}
            </div>
            <div className="text-sm">
              Quantity: <span className="font-medium">{materialLot.remaining_qty} {materialLot.unit}</span>
            </div>
          </div>
          
          {/* Zone Selection */}
          <div className="space-y-2">
            <Label>Storage Zone</Label>
            <Select value={selectedZone} onValueChange={(value) => {
              setSelectedZone(value);
              setSelectedLocationId('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {getZoneLabel(zone)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Rack/Bin Location</Label>
            <Select 
              value={selectedLocationId} 
              onValueChange={setSelectedLocationId}
              disabled={!selectedZone}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedZone ? "Select location" : "Select zone first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{location.location_code}</span>
                      {location.capacity_kg && (
                        <span className="text-xs text-muted-foreground">
                          ({(location.current_stock_kg || 0).toFixed(0)}/{location.capacity_kg} kg)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Selected Location Details */}
          {selectedLocation && (
            <div className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedLocation.location_code}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedLocation.location_name}
              </div>
              {selectedLocation.capacity_kg && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">Available Space:</span>
                  <Badge variant={
                    (selectedLocation.capacity_kg - (selectedLocation.current_stock_kg || 0)) >= materialLot.remaining_qty
                      ? 'default'
                      : 'destructive'
                  }>
                    {(selectedLocation.capacity_kg - (selectedLocation.current_stock_kg || 0)).toFixed(0)} kg
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedLocationId || isPending}
          >
            {isPending ? 'Saving...' : 'Confirm Put Away'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
