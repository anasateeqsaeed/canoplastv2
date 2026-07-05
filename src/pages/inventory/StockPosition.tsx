import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStorageLocations, StorageLocation } from '@/hooks/useStorageLocations';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ZONE_OPTIONS = [
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'regrind', label: 'Regrind' },
  { value: 'compound', label: 'Compound' },
  { value: 'hold', label: 'Hold/Quarantine' },
];

const SUB_ZONE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  raw_material: [
    { value: 'injection', label: 'Injection' },
    { value: 'blow', label: 'Blow Molding' },
    { value: 'masterbatch', label: 'Masterbatch' },
    { value: 'filler', label: 'Filler' },
  ],
  regrind: [
    { value: 'general', label: 'General' },
    { value: 'injection', label: 'Injection' },
    { value: 'blow', label: 'Blow' },
  ],
  compound: [
    { value: 'general', label: 'General' },
  ],
  hold: [
    { value: 'quarantine', label: 'Quarantine' },
  ],
};

interface RackGridProps {
  locations: StorageLocation[];
  selectedLocation: StorageLocation | null;
  onSelectLocation: (location: StorageLocation) => void;
}

function RackGrid({ locations, selectedLocation, onSelectLocation }: RackGridProps) {
  // Group locations by rack
  const racks = locations.reduce((acc, loc) => {
    const rack = loc.rack_number || 'Default';
    if (!acc[rack]) acc[rack] = [];
    acc[rack].push(loc);
    return acc;
  }, {} as Record<string, StorageLocation[]>);

  return (
    <div className="space-y-6">
      {Object.entries(racks).map(([rackName, rackLocations]) => (
        <div key={rackName}>
          <h3 className="font-semibold mb-3">Rack {rackName}</h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {rackLocations.sort((a, b) => (a.row_number || '').localeCompare(b.row_number || '')).map(location => {
              const utilization = location.capacity_kg && location.capacity_kg > 0
                ? Math.round(((location.current_stock_kg || 0) / location.capacity_kg) * 100)
                : 0;
              const isEmpty = (location.current_stock_kg || 0) === 0;
              const isHigh = utilization > 80;
              const isMedium = utilization > 50 && utilization <= 80;
              const isSelected = selectedLocation?.id === location.id;

              return (
                <button
                  key={location.id}
                  onClick={() => onSelectLocation(location)}
                  className={cn(
                    'aspect-square rounded-lg border-2 p-2 flex flex-col items-center justify-center text-xs transition-all hover:scale-105',
                    isEmpty && 'bg-muted/50 border-muted-foreground/20',
                    !isEmpty && !isHigh && !isMedium && 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-700',
                    isMedium && 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-700',
                    isHigh && 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700',
                    isSelected && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  <span className="font-mono font-bold">{location.row_number}</span>
                  <span className={cn(
                    'text-[10px]',
                    isEmpty ? 'text-muted-foreground' : 'text-foreground'
                  )}>
                    {isEmpty ? 'Empty' : `${(location.current_stock_kg || 0).toFixed(0)}kg`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StockPosition() {
  const [selectedZone, setSelectedZone] = useState('raw_material');
  const [selectedSubZone, setSelectedSubZone] = useState('injection');
  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | null>(null);
  
  const { locations, isLoading } = useStorageLocations(selectedZone, selectedSubZone);

  const subZoneOptions = SUB_ZONE_OPTIONS[selectedZone] || [];

  // Calculate zone totals
  const totalCapacity = locations.reduce((sum, l) => sum + (l.capacity_kg || 0), 0);
  const totalStock = locations.reduce((sum, l) => sum + (l.current_stock_kg || 0), 0);
  const overallUtilization = totalCapacity > 0 ? Math.round((totalStock / totalCapacity) * 100) : 0;

  return (
    <MainLayout title="Stock Position" subtitle="Visual rack occupancy and stock levels">
      {/* Zone Selector */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2 sm:w-48">
              <label className="text-sm font-medium">Zone</label>
              <Select value={selectedZone} onValueChange={(v) => { setSelectedZone(v); setSelectedSubZone(SUB_ZONE_OPTIONS[v]?.[0]?.value || ''); setSelectedLocation(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_OPTIONS.map(z => (
                    <SelectItem key={z.value} value={z.value}>{z.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {subZoneOptions.length > 0 && (
              <div className="space-y-2 sm:w-48">
                <label className="text-sm font-medium">Sub-Zone</label>
                <Select value={selectedSubZone} onValueChange={(v) => { setSelectedSubZone(v); setSelectedLocation(null); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subZoneOptions.map(sz => (
                      <SelectItem key={sz.value} value={sz.value}>{sz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1 flex items-end">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-muted border" />
                  <span>Empty</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
                  <span>&lt;50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
                  <span>50-80%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
                  <span>&gt;80%</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Zone Utilization: {overallUtilization}%
                </span>
                <span className="text-sm text-muted-foreground">
                  {totalStock.toFixed(0)} / {totalCapacity.toFixed(0)} kg
                </span>
              </div>
              <Progress value={overallUtilization} className="h-3" />
            </div>
            <div className="text-sm text-muted-foreground">
              {locations.length} locations
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rack Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rack Layout</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square" />
                  ))}
                </div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No locations found for this zone
                </div>
              ) : (
                <RackGrid 
                  locations={locations} 
                  selectedLocation={selectedLocation} 
                  onSelectLocation={setSelectedLocation} 
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Location Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLocation ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">{selectedLocation.location_code}</div>
                    <div className="text-sm text-muted-foreground">{selectedLocation.location_name}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Current Stock</span>
                      <span className="font-medium">{(selectedLocation.current_stock_kg || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Capacity</span>
                      <span className="font-medium">{(selectedLocation.capacity_kg || 0).toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Available Space</span>
                      <span className="font-medium">
                        {((selectedLocation.capacity_kg || 0) - (selectedLocation.current_stock_kg || 0)).toFixed(2)} kg
                      </span>
                    </div>
                  </div>

                  <Progress 
                    value={selectedLocation.capacity_kg && selectedLocation.capacity_kg > 0
                      ? ((selectedLocation.current_stock_kg || 0) / selectedLocation.capacity_kg) * 100
                      : 0
                    } 
                    className="h-2" 
                  />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Zone</span>
                      <Badge variant="outline">{selectedLocation.zone}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sub-Zone</span>
                      <Badge variant="outline">{selectedLocation.sub_zone || 'General'}</Badge>
                    </div>
                    {selectedLocation.material_type && (
                      <div className="flex justify-between text-sm">
                        <span>Material Type</span>
                        <Badge variant="secondary">{selectedLocation.material_type}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Status</span>
                    <Badge variant={selectedLocation.is_active ? 'default' : 'secondary'}>
                      {selectedLocation.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a location to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
