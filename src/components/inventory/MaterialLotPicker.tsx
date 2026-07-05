import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, Package, ChevronDown, ChevronRight, MapPin, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MaterialLotWithLocation {
  id: string;
  lotNumber: string;
  remainingQty: number;
  receivedDate: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  rackId: string | null;
  rackCode: string | null;
  storeId: string | null;
  storeName: string | null;
}

export interface GroupedMaterial {
  materialId: string;
  materialName: string;
  materialCode: string;
  totalQty: number;
  lots: MaterialLotWithLocation[];
}

interface MaterialLotPickerProps {
  lots: MaterialLotWithLocation[];
  onAddLot: (lot: MaterialLotWithLocation) => void;
  filterByStoreId?: string | null;
  isLoading?: boolean;
  addedLotIds?: Set<string>;
}

export function MaterialLotPicker({
  lots,
  onAddLot,
  filterByStoreId,
  isLoading = false,
  addedLotIds = new Set(),
}: MaterialLotPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());

  // Filter and group lots by material
  const groupedMaterials = useMemo(() => {
    let filtered = lots;

    // Filter by store if specified
    if (filterByStoreId) {
      filtered = filtered.filter(lot => lot.storeId === filterByStoreId);
    }

    // Filter by search term - only show matching materials when user starts typing
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lot =>
        lot.materialName.toLowerCase().includes(term) ||
        lot.materialCode.toLowerCase().includes(term)
      );
    }

    // Group by material
    const grouped = new Map<string, GroupedMaterial>();
    
    for (const lot of filtered) {
      const existing = grouped.get(lot.materialId);
      if (existing) {
        existing.totalQty += lot.remainingQty;
        existing.lots.push(lot);
      } else {
        grouped.set(lot.materialId, {
          materialId: lot.materialId,
          materialName: lot.materialName,
          materialCode: lot.materialCode,
          totalQty: lot.remainingQty,
          lots: [lot],
        });
      }
    }

    // Sort lots within each material by received date (FIFO)
    for (const material of grouped.values()) {
      material.lots.sort((a, b) => 
        new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime()
      );
    }

    return Array.from(grouped.values()).sort((a, b) => 
      a.materialName.localeCompare(b.materialName)
    );
  }, [lots, filterByStoreId, searchTerm]);

  // Auto-expand matching materials when searching
  useMemo(() => {
    if (searchTerm && groupedMaterials.length <= 5) {
      setExpandedMaterials(new Set(groupedMaterials.map(m => m.materialId)));
    }
  }, [searchTerm, groupedMaterials]);

  const toggleExpanded = (materialId: string) => {
    setExpandedMaterials(prev => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type to search materials by name or code..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing {groupedMaterials.length} material(s) matching "{searchTerm}"
          </p>
        )}
      </div>

      {/* Material List */}
      <ScrollArea className="h-[280px]">
        {!searchTerm ? (
          <div className="p-6 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Start typing to search materials</p>
            <p className="text-sm mt-1">e.g., "CAL", "PP", "HDPE"</p>
          </div>
        ) : groupedMaterials.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No materials found for "{searchTerm}"</p>
            {filterByStoreId && (
              <p className="text-sm mt-1">Try selecting a different store</p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {groupedMaterials.map((material) => {
              const isExpanded = expandedMaterials.has(material.materialId);

              return (
                <Collapsible
                  key={material.materialId}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(material.materialId)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="font-medium">
                            {material.materialName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {material.materialCode} • {material.lots.length} lot(s)
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="font-mono">
                        {material.totalQty.toFixed(1)} kg
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="bg-muted/30 divide-y divide-muted">
                      {material.lots.map((lot) => {
                        const isAdded = addedLotIds.has(lot.id);
                        return (
                          <div
                            key={lot.id}
                            className={cn(
                              "px-4 py-2 pl-10 flex items-center justify-between gap-2",
                              isAdded && "bg-primary/10"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-sm truncate">
                                {lot.lotNumber}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {lot.rackCode ? `Rack ${lot.rackCode}` : 'No rack'}
                                  {lot.storeName && ` • ${lot.storeName}`}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium whitespace-nowrap">
                                {lot.remainingQty} kg
                              </span>
                              <Button
                                size="sm"
                                variant={isAdded ? "secondary" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isAdded) {
                                    onAddLot(lot);
                                  }
                                }}
                                disabled={isAdded}
                              >
                                {isAdded ? 'Added' : (
                                  <>
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
