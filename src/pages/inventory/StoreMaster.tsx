import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useStores, useStoreRacks, useRackMaterialLots, Store } from '@/hooks/useStores';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { Plus, Warehouse, Package, Edit, Trash2, ChevronDown, ChevronUp, Search, X, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';
import { AddRackDialog } from '@/components/inventory/AddRackDialog';
import { EditRackDialog } from '@/components/inventory/EditRackDialog';
import { MoveStockDialog, RackLot } from '@/components/inventory/MoveStockDialog';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PermGate } from '@/components/auth/PermGate';

interface StorageLocation {
  id: string;
  location_code: string;
  location_name: string | null;
  capacity_kg: number | null;
  current_stock_kg: number | null;
  is_active: boolean;
}

export default function StoreMaster() {
  const { stores, isLoading, createStore, updateStore, deleteStore } = useStores();
  const { updateLocation, deleteLocation } = useStorageLocations();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showAddStoreDialog, setShowAddStoreDialog] = useState(false);
  const [showEditStoreDialog, setShowEditStoreDialog] = useState(false);
  const [showAddRackDialog, setShowAddRackDialog] = useState(false);
  const [showEditRackDialog, setShowEditRackDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingRack, setEditingRack] = useState<StorageLocation | null>(null);
  const [selectedRackId, setSelectedRackId] = useState<string | null>(null);
  const [rackSearch, setRackSearch] = useState('');
  const [rackFilter, setRackFilter] = useState<'all' | 'empty' | 'has-stock'>('all');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [movingLot, setMovingLot] = useState<RackLot | null>(null);
  
  const [storeForm, setStoreForm] = useState({
    code: '',
    name: '',
    description: '',
    floor_location: '',
  });

  const { racks, isLoading: racksLoading } = useStoreRacks(selectedStore?.id);
  const { lots: rackLots, totalQty: rackTotalQty, isLoading: lotsLoading } = useRackMaterialLots(selectedRackId || undefined);

  // Reset search/filter when store changes
  useEffect(() => {
    setRackSearch('');
    setRackFilter('all');
    setSelectedRackId(null);
  }, [selectedStore?.id]);

  // Filter racks based on search and filter
  const filteredRacks = useMemo(() => {
    return racks.filter(rack => {
      // Search filter
      const searchMatch = !rackSearch || 
        rack.location_code.toLowerCase().includes(rackSearch.toLowerCase()) ||
        (rack.location_name?.toLowerCase().includes(rackSearch.toLowerCase()));
      
      // Stock filter
      const stockMatch = 
        rackFilter === 'all' ? true :
        rackFilter === 'empty' ? (rack.current_stock_kg || 0) === 0 :
        (rack.current_stock_kg || 0) > 0;
      
      return searchMatch && stockMatch;
    });
  }, [racks, rackSearch, rackFilter]);

  const handleAddStore = async () => {
    if (!storeForm.code || !storeForm.name) {
      toast.error('Please fill in code and name');
      return;
    }
    
    await createStore.mutateAsync({
      code: storeForm.code,
      name: storeForm.name,
      description: storeForm.description || undefined,
      floor_location: storeForm.floor_location || undefined,
    });
    
    setShowAddStoreDialog(false);
    setStoreForm({ code: '', name: '', description: '', floor_location: '' });
  };

  const handleEditStore = async () => {
    if (!editingStore) return;
    
    await updateStore.mutateAsync({
      id: editingStore.id,
      code: storeForm.code,
      name: storeForm.name,
      description: storeForm.description || undefined,
      floor_location: storeForm.floor_location || undefined,
    });
    
    setShowEditStoreDialog(false);
    setEditingStore(null);
    setStoreForm({ code: '', name: '', description: '', floor_location: '' });
  };

  const handleDeleteStore = async (store: Store) => {
    if (!confirm(`Are you sure you want to delete "${store.name}"?`)) return;
    await deleteStore.mutateAsync(store.id);
    if (selectedStore?.id === store.id) {
      setSelectedStore(null);
    }
  };

  const openEditStore = (store: Store) => {
    setEditingStore(store);
    setStoreForm({
      code: store.code,
      name: store.name,
      description: store.description || '',
      floor_location: store.floor_location || '',
    });
    setShowEditStoreDialog(true);
  };

  const handleDeleteRack = async (rackId: string, rackName: string) => {
    if (!confirm(`Are you sure you want to delete "${rackName}"?`)) return;
    await deleteLocation.mutateAsync(rackId);
    if (selectedRackId === rackId) {
      setSelectedRackId(null);
    }
  };

  const openEditRack = (rack: StorageLocation) => {
    setEditingRack(rack);
    setShowEditRackDialog(true);
  };

  const handleRackRowClick = (rackId: string) => {
    setSelectedRackId(selectedRackId === rackId ? null : rackId);
  };

  const handleMoveClick = (lot: RackLot, e: React.MouseEvent) => {
    e.stopPropagation();
    setMovingLot(lot);
    setShowMoveDialog(true);
  };

  const getStockPercentage = (current: number | null, capacity: number | null) => {
    if (!capacity || capacity === 0) return 0;
    return Math.round(((current || 0) / capacity) * 100);
  };

  const getStockStatus = (current: number | null, capacity: number | null) => {
    const percentage = getStockPercentage(current, capacity);
    if (percentage >= 100) return { label: 'Full', variant: 'destructive' as const };
    if (percentage >= 80) return { label: 'Near Full', variant: 'secondary' as const };
    return { label: 'Available', variant: 'default' as const };
  };

  return (
    <MainLayout title="Store & Rack Master" subtitle="Manage warehouse stores and rack locations">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Stores List */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Warehouse className="h-5 w-5" />
                Stores
              </CardTitle>
              <PermGate module="inventory" action="create">
                <Button size="sm" onClick={() => setShowAddStoreDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Store
                </Button>
              </PermGate>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Loading stores...</p>
              ) : stores.length === 0 ? (
                <p className="text-muted-foreground text-sm">No stores found</p>
              ) : (
                stores.map((store) => (
                  <div
                    key={store.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedStore?.id === store.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedStore(store)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{store.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {store.code} • {store.floor_location || 'No location'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <PermGate module="inventory" action="edit">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditStore(store);
                            }}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        </PermGate>
                        <PermGate module="inventory" action="delete">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteStore(store);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </PermGate>
                      </div>
                    </div>
                    {!store.is_active && (
                      <Badge variant="secondary" className="mt-2">Inactive</Badge>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Racks in Selected Store */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedStore ? `Racks in "${selectedStore.name}"` : 'Select a Store'}
              </CardTitle>
              {selectedStore && (
                <PermGate module="inventory" action="create">
                  <Button size="sm" onClick={() => setShowAddRackDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rack
                  </Button>
                </PermGate>
              )}
            </CardHeader>
            <CardContent>
              {!selectedStore ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a store to view its racks</p>
                </div>
              ) : racksLoading ? (
                <p className="text-muted-foreground text-sm">Loading racks...</p>
              ) : racks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No racks in this store</p>
                  <p className="text-sm">Click "Add Rack" to create one</p>
                </div>
              ) : (
              <div className="space-y-4">
                {/* Search and Filter Controls */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search racks..."
                      value={rackSearch}
                      onChange={(e) => setRackSearch(e.target.value)}
                      className="pl-9 pr-9"
                    />
                    {rackSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setRackSearch('')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={rackFilter} 
                    onValueChange={(value) => value && setRackFilter(value as 'all' | 'empty' | 'has-stock')}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="all" aria-label="Show all racks" className="px-3">
                      All
                    </ToggleGroupItem>
                    <ToggleGroupItem value="empty" aria-label="Show empty racks" className="px-3">
                      Empty
                    </ToggleGroupItem>
                    <ToggleGroupItem value="has-stock" aria-label="Show racks with stock" className="px-3">
                      Has Stock
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                {/* Racks Table */}
                {filteredRacks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No racks match your filter</p>
                    <p className="text-sm">Try adjusting your search or filter</p>
                  </div>
                ) : (
                <div className="overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rack</TableHead>
                      <TableHead>Capacity (kg)</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRacks.map((rack) => {
                      const status = getStockStatus(rack.current_stock_kg, rack.capacity_kg);
                      const available = (rack.capacity_kg || 0) - (rack.current_stock_kg || 0);
                      const isSelected = selectedRackId === rack.id;
                      return (
                        <TableRow 
                          key={rack.id}
                          className={`cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                          onClick={() => handleRackRowClick(rack.id)}
                        >
                          <TableCell className="font-medium">
                            {rack.location_name || rack.location_code}
                          </TableCell>
                          <TableCell>{rack.capacity_kg?.toLocaleString() || '-'} kg</TableCell>
                          <TableCell>{(rack.current_stock_kg || 0).toLocaleString()} kg</TableCell>
                          <TableCell>{available.toLocaleString()} kg</TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditRack(rack as StorageLocation);
                                }}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteRack(rack.id, rack.location_name || rack.location_code);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
                )}

                {/* Result Count */}
                <div className="text-sm text-muted-foreground text-right">
                  Showing {filteredRacks.length} of {racks.length} racks
                  {rackFilter !== 'all' && ` (filtered: ${rackFilter === 'empty' ? 'Empty only' : 'Has Stock only'})`}
                </div>

                {/* Stock Position Panel */}
                {selectedRackId && (
                  <Collapsible defaultOpen>
                    <Card className="border-primary/20">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">
                              Stock Position in Rack {racks.find(r => r.id === selectedRackId)?.location_code || selectedRackId}
                            </CardTitle>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          {lotsLoading ? (
                            <p className="text-sm text-muted-foreground">Loading stock details...</p>
                          ) : rackLots.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No materials stored in this rack</p>
                          ) : (
                            <div className="space-y-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Lot Number</TableHead>
                                    <TableHead>Material</TableHead>
                                    <TableHead>Qty (kg)</TableHead>
                                    <TableHead>GRN Date</TableHead>
                                    <TableHead className="w-[80px]">Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {rackLots.map((lot) => (
                                    <TableRow key={lot.id}>
                                      <TableCell className="font-medium">{lot.lot_number}</TableCell>
                                      <TableCell>
                                        {lot.material?.name || 'Unknown'}
                                        {lot.material?.code && (
                                          <span className="text-muted-foreground text-xs ml-1">
                                            ({lot.material.code})
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell>{(lot.remaining_qty || 0).toLocaleString()}</TableCell>
                                      <TableCell>
                                        {lot.received_date ? format(new Date(lot.received_date), 'dd-MMM-yyyy') : '-'}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 text-muted-foreground hover:text-foreground"
                                          onClick={(e) => handleMoveClick(lot as RackLot, e)}
                                          title="Move to another rack"
                                        >
                                          <ArrowRightLeft className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              <div className="flex justify-end border-t pt-2">
                                <span className="text-sm font-medium">
                                  Total: {rackTotalQty.toLocaleString()} kg
                                </span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
              </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Store Dialog */}
      <Dialog open={showAddStoreDialog} onOpenChange={setShowAddStoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Store Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., RM"
                  value={storeForm.code}
                  onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor Location</Label>
                <Input
                  id="floor"
                  placeholder="e.g., Ground Floor"
                  value={storeForm.floor_location}
                  onChange={(e) => setStoreForm({ ...storeForm, floor_location: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Raw Material Store"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={storeForm.description}
                onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStore} disabled={createStore.isPending}>
              {createStore.isPending ? 'Creating...' : 'Create Store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={showEditStoreDialog} onOpenChange={setShowEditStoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Store Code *</Label>
                <Input
                  id="edit-code"
                  value={storeForm.code}
                  onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-floor">Floor Location</Label>
                <Input
                  id="edit-floor"
                  value={storeForm.floor_location}
                  onChange={(e) => setStoreForm({ ...storeForm, floor_location: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Store Name *</Label>
              <Input
                id="edit-name"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={storeForm.description}
                onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditStoreDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditStore} disabled={updateStore.isPending}>
              {updateStore.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rack Dialog */}
      {selectedStore && (
        <AddRackDialog
          open={showAddRackDialog}
          onOpenChange={setShowAddRackDialog}
          store={selectedStore}
        />
      )}

      {/* Edit Rack Dialog */}
      {selectedStore && (
        <EditRackDialog
          open={showEditRackDialog}
          onOpenChange={setShowEditRackDialog}
          rack={editingRack}
          storeName={selectedStore.name}
        />
      )}

      {/* Move Stock Dialog */}
      <MoveStockDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        lot={movingLot}
        currentRackId={selectedRackId || ''}
        currentRackName={racks.find(r => r.id === selectedRackId)?.location_code || ''}
      />
    </MainLayout>
  );
}
