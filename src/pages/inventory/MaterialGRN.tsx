import React, { useState, useEffect, useMemo } from 'react';
import { usePersistedState } from '@/hooks/usePersistedState';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableComboBox } from '@/components/ui/searchable-combobox';
import { SupplierSelector } from '@/components/selectors/SupplierSelector';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { Plus, Package, CheckCircle, XCircle, Clock, Search, MapPin, FileText, Link2 } from 'lucide-react';
import { useMaterialLots, useCreateMaterialLot, useUpdateMaterialLotStatus, usePutAwayMaterialLot, type CreateMaterialLotData, type MaterialLot } from '@/hooks/useMaterialLots';
import { useMaterials } from '@/hooks/useMaterials';
// useProducts reconnects in Phase 3
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { useUnitsOfMeasure, useNextGRNNumber } from '@/hooks/useUnitsOfMeasure';
import { useStores } from '@/hooks/useStores';
import { usePendingPOItems, type PurchaseOrderItem, type PurchaseOrder } from '@/hooks/usePurchaseOrders';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useMaterialToleranceCheck, calculateMaxReceivable } from '@/hooks/useGRNToleranceSettings';
import { RefreshButton } from '@/components/layout/RefreshButton';
import { PutAwayDialog } from '@/components/inventory/PutAwayDialog';
import { QuickAddMaterialDialog } from '@/components/masters/QuickAddMaterialDialog';
import { QuickAddSupplierDialog } from '@/components/inventory/QuickAddSupplierDialog';
import { QuickAddUnitDialog } from '@/components/inventory/QuickAddUnitDialog';
import { PermGate } from '@/components/auth/PermGate';
import { QuickAddClientDialog } from '@/components/masters/QuickAddClientDialog';
import { MultiRackSelector, type RackAssignment } from '@/components/inventory/MultiRackSelector';
import { RackSelectionDialog } from '@/components/inventory/RackSelectionDialog';
import { StoreSelector } from '@/components/inventory/StoreSelector';
import { supabase } from '@/integrations/supabase/client';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  conditional: 'bg-orange-100 text-orange-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  passed: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  conditional: <Clock className="h-3 w-3" />,
};

export default function MaterialGRN() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = usePersistedState<string>('material-grn.status', 'all');
  const [searchQuery, setSearchQuery] = usePersistedState('material-grn.search', '');
  const [putAwayLot, setPutAwayLot] = useState<MaterialLot | null>(null);
  
  // Quick add dialogs
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showUnitDialog, setShowUnitDialog] = useState(false);
  const [showRackSelectionDialog, setShowRackSelectionDialog] = useState(false);
  
  // Multi-rack state
  const [rackAssignments, setRackAssignments] = useState<RackAssignment[]>([]);
  const [isOnHold, setIsOnHold] = useState(false);
  
  // PO linking state
  const [selectedPOItemId, setSelectedPOItemId] = useState<string>('');
  const [urlPOItemId, setUrlPOItemId] = useState<string | null>(null);
  
  const { data: materialLots = [], isLoading } = useMaterialLots(
    statusFilter !== 'all' ? { inspection_status: statusFilter } : undefined
  );
  const { data: materials = [] } = useMaterials();
  const { data: suppliers = [] } = useSuppliers();
  const { data: clients = [] } = useClients();
  const { data: units = [] } = useUnitsOfMeasure();
  const { data: nextGRN } = useNextGRNNumber();
  const { activeStores } = useStores();
  const createMaterialLot = useCreateMaterialLot();
  const updateStatus = useUpdateMaterialLotStatus();
  const putAwayMutation = usePutAwayMaterialLot();
  
  const [formData, setFormData] = useState<{
    lot_number: string;
    material_id: string;
    supplier_id: string;
    customer_client_id: string;
    is_customer_material: boolean;
    quantity: number;
    unit: string;
    selected_store_id: string;
    grn_number: string;
    invoice_number: string;
    remarks: string;
    received_date: string;
    po_item_id: string;
  }>({
    lot_number: '',
    material_id: '',
    supplier_id: '',
    customer_client_id: '',
    is_customer_material: false,
    quantity: 0,
    unit: 'kg',
    selected_store_id: '',
    grn_number: '',
    invoice_number: '',
    remarks: '',
    received_date: new Date().toISOString().split('T')[0],
    po_item_id: '',
  });
  
  // Pending PO items for selected supplier/client
  const { data: pendingPOItems = [] } = usePendingPOItems(
    formData.supplier_id || undefined,
    formData.customer_client_id || undefined
  );

  // Update GRN preview when dialog opens
  useEffect(() => {
    if (isDialogOpen && nextGRN) {
      setFormData(prev => ({ ...prev, grn_number: nextGRN }));
    }
  }, [isDialogOpen, nextGRN]);

  // Auto-fill from URL parameters (when coming from Store Operations)
  useEffect(() => {
    const poItemIdFromUrl = searchParams.get('po_item_id');
    if (poItemIdFromUrl) {
      setUrlPOItemId(poItemIdFromUrl);
      // Clear the URL parameter to prevent re-triggering
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch PO item details when URL param is detected
  useEffect(() => {
    const fetchPOItemAndOpen = async () => {
      if (!urlPOItemId) return;
      
      try {
        const { data: poItem, error } = await supabase
          .from('purchase_order_items')
          .select(`
            *,
            po:purchase_orders!inner(
              id, po_number, status, supplier_id,
              supplier:suppliers(id, name, code)
            ),
            material:materials(id, name, code),
            unit:units_of_measure(id, code, name)
          `)
          .eq('id', urlPOItemId)
          .single();
        
        if (error || !poItem) {
          toast.error('Could not find PO item');
          setUrlPOItemId(null);
          return;
        }

        // Pre-fill the supplier
        const supplierId = poItem.po?.supplier_id || '';
        setFormData(prev => ({
          ...prev,
          supplier_id: supplierId,
          customer_client_id: '',
          is_customer_material: false,
        }));

        // Wait a tick for pendingPOItems to update, then select the PO item
        setTimeout(() => {
          setSelectedPOItemId(urlPOItemId);
          setFormData(prev => ({
            ...prev,
            po_item_id: urlPOItemId,
            material_id: poItem.material_id,
            quantity: Number(poItem.pending_qty) || 0,
            unit: poItem.unit?.code || 'kg',
          }));
          // Open the dialog automatically
          setIsDialogOpen(true);
          setUrlPOItemId(null);
        }, 100);
      } catch (err) {
        console.error('Error fetching PO item:', err);
        toast.error('Error loading PO details');
        setUrlPOItemId(null);
      }
    };

    fetchPOItemAndOpen();
  }, [urlPOItemId]);

  // Get selected store details
  const selectedStore = activeStores.find(s => s.id === formData.selected_store_id);

  // Material options (product receipts reconnect in Phase 3)
  const materialOptions = [
    ...materials.filter(m => m.is_active).map(m => ({
      value: m.id,
      label: m.code,
      description: m.name,
      group: 'Materials',
      icon: <Package size={14} className="text-primary" />,
    })),
  ];

  // Supplier options
  const supplierOptions = suppliers.filter(s => s.is_active).map(s => ({
    value: s.id,
    label: s.code,
    description: s.name,
  }));

  // Client options
  const clientOptions = clients.filter(c => c.is_active).map(c => ({
    value: c.id,
    label: c.code,
    description: c.name,
  }));
  
  const filteredLots = materialLots.filter(lot => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      lot.lot_number.toLowerCase().includes(search) ||
      lot.material?.name?.toLowerCase().includes(search) ||
      lot.supplier?.name?.toLowerCase().includes(search) ||
      lot.grn_number?.toLowerCase().includes(search)
    );
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.material_id || !formData.quantity) {
      return;
    }
    
    // Validate PO quantity constraint with tolerance
    if (formData.po_item_id && selectedPOItem) {
      const poItem = selectedPOItem as any;
      const allowExtra = poItem.allow_extra_receipt !== false && !denyExtraTolerance;
      const maxReceivable = calculateMaxReceivable(
        poItem.ordered_qty,
        poItem.tolerance_percent || 5,
        allowExtra,
        poItem.received_qty || 0
      );
      
      if (formData.quantity > maxReceivable) {
        toast.error(`Quantity cannot exceed max receivable (${maxReceivable.toFixed(2)} ${formData.unit})`);
        return;
      }
    }
    
    // Store rack assignments in remarks as JSON if not on hold
    const assignmentData = isOnHold 
      ? { status: 'on_hold' }
      : { assignments: rackAssignments.map(a => ({ id: a.locationId, qty: a.quantity })) };
    
    const combinedRemarks = formData.remarks 
      ? `${formData.remarks}\n---\nStorage: ${JSON.stringify(assignmentData)}`
      : `Storage: ${JSON.stringify(assignmentData)}`;
    
    const submitData: CreateMaterialLotData = {
      // Empty lot number is auto-generated via generate_material_lot_number() RPC
      lot_number: formData.lot_number,
      material_id: formData.material_id,
      supplier_id: formData.supplier_id || null,
      quantity: formData.quantity,
      unit: formData.unit,
      // grn_number auto-generated via next_doc_number('grn', 'GRN') RPC
      invoice_number: formData.invoice_number || undefined,
      remarks: combinedRemarks,
      received_date: formData.received_date,
      is_customer_material: formData.is_customer_material,
      customer_client_id: formData.customer_client_id || null,
      // Link to PO item
      po_item_id: formData.po_item_id || null,
    };
    
    await createMaterialLot.mutateAsync(submitData);
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      lot_number: '',
      material_id: '',
      supplier_id: '',
      customer_client_id: '',
      is_customer_material: false,
      quantity: 0,
      unit: 'kg',
      selected_store_id: '',
      grn_number: '',
      invoice_number: '',
      remarks: '',
      received_date: new Date().toISOString().split('T')[0],
      po_item_id: '',
    });
    setRackAssignments([]);
    setIsOnHold(false);
    setSelectedPOItemId('');
  };

  // Handler for PO item selection - auto-fills material and quantity
  const handlePOItemSelect = (poItemId: string) => {
    if (!poItemId) {
      // Clear PO link, re-enable fields but keep supplier/customer
      setSelectedPOItemId('');
      setFormData(prev => ({
        ...prev,
        po_item_id: '',
        material_id: '',
        quantity: 0,
        unit: 'kg',
      }));
      return;
    }

    const poItem = pendingPOItems.find((item: any) => item.id === poItemId);
    if (poItem) {
      setSelectedPOItemId(poItemId);
      setFormData(prev => ({
        ...prev,
        po_item_id: poItemId,
        material_id: poItem.material_id,
        quantity: poItem.pending_qty,
        unit: poItem.unit?.code || 'kg',
      }));
    }
  };

  // Get selected PO item details for display
  const selectedPOItem = pendingPOItems.find((item: any) => item.id === selectedPOItemId);

  // Check material tolerance flag
  const { data: materialTolerance } = useMaterialToleranceCheck(formData.material_id);
  const denyExtraTolerance = materialTolerance?.denyExtraTolerance || false;

  // Calculate max receivable with tolerance
  const maxReceivableQty = useMemo(() => {
    if (!selectedPOItem) return null;
    
    const poItem = selectedPOItem as any;
    const allowExtra = poItem.allow_extra_receipt !== false && !denyExtraTolerance;
    
    return calculateMaxReceivable(
      poItem.ordered_qty,
      poItem.tolerance_percent || 5,
      allowExtra,
      poItem.received_qty || 0
    );
  }, [selectedPOItem, denyExtraTolerance]);

  // Check if quantity exceeds max receivable (with tolerance)
  const isPOLinked = !!formData.po_item_id && !!selectedPOItem;
  const exceedsMaxReceivable = isPOLinked && maxReceivableQty !== null && formData.quantity > maxReceivableQty;
  
  const handleStatusChange = async (id: string, newStatus: 'pending' | 'passed' | 'failed' | 'conditional') => {
    await updateStatus.mutateAsync({ id, inspection_status: newStatus });
  };
  
  return (
    <MainLayout title="Material GRN" subtitle="Goods Receipt Note - Record incoming material batches">
      <div className="space-y-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <PermGate module="inventory" action="create">
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Material Lot
              </Button>
            </DialogTrigger>
          </PermGate>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Material Receipt</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* GRN Number & Date Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>GRN Number</Label>
                  <Input
                    value={formData.grn_number}
                    disabled
                    className="bg-muted"
                    placeholder="Auto-generated"
                  />
                  <p className="text-xs text-muted-foreground">Auto-generated on save</p>
                </div>
                <div className="space-y-2">
                  <Label>Received Date *</Label>
                  <Input
                    type="date"
                    value={formData.received_date}
                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              {/* Material Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={isPOLinked ? 'text-muted-foreground' : ''}>
                    Material / Item *
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowMaterialDialog(true)}
                    disabled={isPOLinked}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Quick Add
                  </Button>
                </div>
                <SearchableComboBox
                  options={materialOptions}
                  value={formData.material_id}
                  onChange={(value) => setFormData({ ...formData, material_id: value })}
                  placeholder="Search or select material..."
                  emptyMessage="No material found"
                  disabled={isPOLinked}
                />
                {isPOLinked && (
                  <p className="text-xs text-muted-foreground">Locked: Material selected from Purchase Order</p>
                )}
              </div>
              
              {/* Supplier Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={!!formData.customer_client_id ? 'text-muted-foreground' : ''}>
                    Supplier {!formData.customer_client_id && '*'}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowSupplierDialog(true)}
                    disabled={!!formData.customer_client_id}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Quick Add
                  </Button>
                </div>
                <SupplierSelector
                  value={formData.supplier_id}
                  onChange={(value) => {
                    // Clear PO selection when changing supplier
                    handlePOItemSelect('');
                    setFormData({ 
                      ...formData, 
                      supplier_id: value,
                      customer_client_id: value ? '' : formData.customer_client_id,
                      is_customer_material: value ? false : formData.is_customer_material
                    });
                  }}
                  placeholder="Search or select supplier..."
                  disabled={!!formData.customer_client_id}
                  includeNone
                  noneLabel="— None —"
                />
                {!!formData.customer_client_id && (
                  <p className="text-xs text-muted-foreground">Disabled: Customer already selected</p>
                )}
              </div>

              {/* Customer Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={!!formData.supplier_id ? 'text-muted-foreground' : ''}>
                    Customer {!formData.supplier_id && '*'}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowClientDialog(true)}
                    disabled={!!formData.supplier_id}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Quick Add
                  </Button>
                </div>
                <ClientSelector
                  value={formData.customer_client_id}
                  onChange={(value) => {
                    // Clear PO selection when changing customer
                    handlePOItemSelect('');
                    setFormData({ 
                      ...formData, 
                      customer_client_id: value,
                      supplier_id: value ? '' : formData.supplier_id,
                      is_customer_material: !!value
                    });
                  }}
                  placeholder="Search or select customer..."
                  disabled={!!formData.supplier_id}
                  includeNone
                  noneLabel="— None —"
                />
                {!!formData.supplier_id && (
                  <p className="text-xs text-muted-foreground">Disabled: Supplier already selected</p>
                )}
              </div>
              
              {/* Link to Purchase Order (only show if supplier or customer selected) */}
              {(formData.supplier_id || formData.customer_client_id) && (
                <div className="space-y-2 p-3 border border-dashed rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Link to Purchase Order (Optional)</Label>
                  </div>
                  <Select
                    value={selectedPOItemId || '__none__'}
                    onValueChange={(v) => handlePOItemSelect(v === '__none__' ? '' : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={pendingPOItems.length === 0 ? "No pending PO items" : "Select pending PO item..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None (Manual Entry) —</SelectItem>
                      {pendingPOItems.map((item: any) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.po?.po_number} | {item.material?.code} - {item.material?.name} | {item.ordered_qty} {item.unit?.code || 'units'} ({item.pending_qty} pending)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pendingPOItems.length === 0 && (
                    <p className="text-xs text-muted-foreground">No approved/partial POs found for this supplier/customer</p>
                  )}
                  {isPOLinked && (
                    <p className="text-xs text-primary">
                      ✓ Linked to {(selectedPOItem as any)?.po?.po_number} — Pending: {(selectedPOItem as any)?.pending_qty} {(selectedPOItem as any)?.unit?.code || 'units'}
                    </p>
                  )}
                </div>
              )}
              
              {/* Quantity & Unit Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={isPOLinked && maxReceivableQty !== null ? maxReceivableQty : undefined}
                    step={0.01}
                    required
                    className={exceedsMaxReceivable ? 'border-destructive' : ''}
                  />
                  {isPOLinked && maxReceivableQty !== null && (
                    <div className="text-xs space-y-0.5">
                      <p className="text-muted-foreground">
                        Ordered: {(selectedPOItem as any)?.ordered_qty} | Received: {(selectedPOItem as any)?.received_qty || 0} {formData.unit}
                      </p>
                      <p className={exceedsMaxReceivable ? 'text-destructive font-medium' : 'text-primary font-medium'}>
                        {exceedsMaxReceivable 
                          ? `⚠️ Cannot exceed max receivable: ${maxReceivableQty.toFixed(2)} ${formData.unit}`
                          : `Max Receivable: ${maxReceivableQty.toFixed(2)} ${formData.unit} (incl. ${(selectedPOItem as any)?.tolerance_percent || 5}% tolerance)`
                        }
                      </p>
                      {denyExtraTolerance && (
                        <p className="text-orange-600">⚠️ No extra tolerance allowed for this material</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Unit</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowUnitDialog(true)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    disabled={isPOLinked}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          {unit.code} - {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Storage Location Section */}
              <div className="space-y-4">
                <StoreSelector
                  value={formData.selected_store_id}
                  onChange={(storeId) => {
                    setFormData({ ...formData, selected_store_id: storeId });
                    setRackAssignments([]); // Reset rack assignments when store changes
                  }}
                  label="Store / Godown *"
                />
                
                {/* Multi-Rack Selector */}
                <MultiRackSelector
                  totalQuantity={formData.quantity}
                  unit={formData.unit}
                  assignments={rackAssignments}
                  onAssignmentsChange={setRackAssignments}
                  onAddRack={() => setShowRackSelectionDialog(true)}
                  isOnHold={isOnHold}
                  onHoldChange={setIsOnHold}
                  selectedStoreId={formData.selected_store_id}
                  selectedStoreName={selectedStore?.name}
                />
              </div>
              
              {/* Batch & Invoice Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier Batch/Lot Number</Label>
                  <Input
                    value={formData.lot_number}
                    onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                    placeholder="Enter batch number from supplier"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Supplier invoice number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMaterialLot.isPending}>
                  {createMaterialLot.isPending ? 'Saving...' : 'Save Material Lot'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by lot number, material, supplier, GRN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Material Lots Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Material Lots ({filteredLots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredLots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No material lots found. Click "Add Material Lot" to record incoming materials.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN #</TableHead>
                    <TableHead>Lot Number</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLots.map((lot) => (
                    <TableRow key={lot.id}>
                      <TableCell className="font-mono text-xs">
                        {lot.grn_number || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{lot.lot_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lot.material?.name}</div>
                          <div className="text-sm text-muted-foreground">{lot.material?.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lot.is_customer_material ? (
                          <div>
                            <div>{(lot as any).customer?.name || (lot as any).supplier?.name || '-'}</div>
                            <div className="text-xs text-muted-foreground">Customer Material</div>
                          </div>
                        ) : (
                          lot.supplier?.name || '-'
                        )}
                      </TableCell>
                      <TableCell>{format(new Date(lot.received_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">{lot.quantity} {lot.unit}</TableCell>
                      <TableCell className="text-right">
                        <span className={lot.remaining_qty <= 0 ? 'text-red-600' : ''}>
                          {lot.remaining_qty} {lot.unit}
                        </span>
                      </TableCell>
                      <TableCell>{lot.storage_location?.location_code || '-'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[lot.inspection_status]}>
                          <span className="flex items-center gap-1">
                            {statusIcons[lot.inspection_status]}
                            {lot.inspection_status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Select
                            value={lot.inspection_status}
                            onValueChange={(value) => handleStatusChange(lot.id, value as 'pending' | 'passed' | 'failed' | 'conditional')}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="passed">Passed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                              <SelectItem value="conditional">Conditional</SelectItem>
                            </SelectContent>
                          </Select>
                          {lot.inspection_status === 'passed' && !lot.storage_location_id && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setPutAwayLot(lot)}
                              className="h-8"
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Put Away
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Put Away Dialog */}
      <PutAwayDialog
        open={!!putAwayLot}
        onOpenChange={(open) => !open && setPutAwayLot(null)}
        materialLot={putAwayLot}
        onConfirm={async (lotId, locationId) => {
          await putAwayMutation.mutateAsync({ id: lotId, storage_location_id: locationId });
        }}
        isPending={putAwayMutation.isPending}
      />

      {/* Quick Add Dialogs */}
      <QuickAddMaterialDialog
        open={showMaterialDialog}
        onOpenChange={setShowMaterialDialog}
        onSuccess={(materialId) => setFormData(prev => ({ ...prev, material_id: materialId }))}
      />
      
      <QuickAddSupplierDialog
        open={showSupplierDialog}
        onOpenChange={setShowSupplierDialog}
        onSuccess={(supplierId) => setFormData(prev => ({ ...prev, supplier_id: supplierId }))}
      />
      
      <QuickAddClientDialog
        open={showClientDialog}
        onOpenChange={setShowClientDialog}
        onSuccess={(clientId) => setFormData(prev => ({ ...prev, customer_client_id: clientId }))}
      />
      
      <QuickAddUnitDialog
        open={showUnitDialog}
        onOpenChange={setShowUnitDialog}
        onSuccess={(unitId, unitCode) => setFormData(prev => ({ ...prev, unit: unitCode }))}
      />
      
      {/* Rack Selection Dialog */}
      <RackSelectionDialog
        open={showRackSelectionDialog}
        onOpenChange={setShowRackSelectionDialog}
        storeId={formData.selected_store_id}
        storeName={selectedStore?.name || ''}
        excludeIds={rackAssignments.map(a => a.locationId)}
        remainingQuantity={Math.max(0, formData.quantity - rackAssignments.reduce((sum, a) => sum + a.quantity, 0))}
        unit={formData.unit}
        onSelect={(assignment) => setRackAssignments(prev => [...prev, assignment])}
      />
    </MainLayout>
  );
}
