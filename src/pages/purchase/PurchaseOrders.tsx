import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, ShoppingCart, Search, Trash2, CheckCircle, XCircle, Eye, Package, Percent, ClipboardList } from 'lucide-react';
import { 
  usePurchaseOrders, 
  useCreatePurchaseOrder, 
  useApprovePurchaseOrder,
  useCancelPurchaseOrder,
  useDeletePurchaseOrder,
  type CreatePOData,
  type POStatus,
} from '@/hooks/usePurchaseOrders';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { useMaterials } from '@/hooks/useMaterials';
import { useUnitsOfMeasure } from '@/hooks/useUnitsOfMeasure';
import { SupplierSelector } from '@/components/selectors/SupplierSelector';
import { ClientSelector } from '@/components/selectors/ClientSelector';
import { format } from 'date-fns';
import { RefreshButton } from '@/components/layout/RefreshButton';
import { useAuth } from '@/hooks/useAuth';
import { useGRNToleranceSettings, useMaterialToleranceCheck } from '@/hooks/useGRNToleranceSettings';

const statusColors: Record<POStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  approved: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface POLineItem {
  material_id: string;
  material_name: string;
  ordered_qty: number;
  unit_id: string | null;
  unit_code: string;
  unit_price: number;
  remarks: string;
  tolerance_percent: number;
  allow_extra_receipt: boolean;
}

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const isViewOnly = roles.length === 1 && roles.includes('store_incharge');
  const isStoreIncharge = roles.includes('store_incharge');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: purchaseOrders = [], isLoading } = usePurchaseOrders(
    statusFilter !== 'all' ? { status: statusFilter as POStatus } : undefined
  );
  const { data: suppliers = [] } = useSuppliers();
  const { data: clients = [] } = useClients();
  const { data: materials = [] } = useMaterials();
  const { data: units = [] } = useUnitsOfMeasure();
  const { data: toleranceSettings } = useGRNToleranceSettings();
  
  const createPO = useCreatePurchaseOrder();
  const approvePO = useApprovePurchaseOrder();
  const cancelPO = useCancelPurchaseOrder();
  const deletePO = useDeletePurchaseOrder();
  
  const [formData, setFormData] = useState({
    source_type: 'vendor' as 'vendor' | 'customer_provided',
    supplier_id: '',
    client_id: '',
    delivery_date: '',
    remarks: '',
  });
  
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [newItem, setNewItem] = useState({
    material_id: '',
    ordered_qty: 0,
    unit_id: '',
    unit_price: 0,
    remarks: '',
    tolerance_percent: 5,
    allow_extra_receipt: true,
  });

  // Get allowed tolerance options from settings
  const allowedTolerances = toleranceSettings?.allowedTolerances || [0, 5, 10, 15, 20];

  // Options for dropdowns
  const supplierOptions = suppliers.filter(s => s.is_active).map(s => ({
    value: s.id,
    label: s.code,
    description: s.name,
  }));

  const clientOptions = clients.filter(c => c.is_active).map(c => ({
    value: c.id,
    label: c.code,
    description: c.name,
  }));

  const materialOptions = materials.filter(m => m.is_active).map(m => ({
    value: m.id,
    label: m.code,
    description: m.name,
    icon: <Package size={14} className="text-primary" />,
  }));

  const filteredOrders = purchaseOrders.filter(po => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      po.po_number.toLowerCase().includes(search) ||
      po.supplier?.name?.toLowerCase().includes(search) ||
      po.client?.name?.toLowerCase().includes(search)
    );
  });

  const handleAddItem = () => {
    if (!newItem.material_id || newItem.ordered_qty <= 0) return;
    
    const material = materials.find(m => m.id === newItem.material_id);
    const unit = units.find(u => u.id === newItem.unit_id);
    
    // Check if material denies extra tolerance
    const materialDeniesExtra = (material as any)?.deny_extra_tolerance || false;
    
    setLineItems([...lineItems, {
      material_id: newItem.material_id,
      material_name: material ? `${material.code} - ${material.name}` : '',
      ordered_qty: newItem.ordered_qty,
      unit_id: newItem.unit_id || null,
      unit_code: unit?.code || 'kg',
      unit_price: newItem.unit_price,
      remarks: newItem.remarks,
      tolerance_percent: materialDeniesExtra ? 0 : newItem.tolerance_percent,
      allow_extra_receipt: materialDeniesExtra ? false : newItem.allow_extra_receipt,
    }]);
    
    setNewItem({
      material_id: '',
      ordered_qty: 0,
      unit_id: '',
      unit_price: 0,
      remarks: '',
      tolerance_percent: toleranceSettings?.defaultTolerancePercent || 5,
      allow_extra_receipt: true,
    });
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lineItems.length === 0) {
      return;
    }
    
    const submitData: CreatePOData = {
      source_type: formData.source_type,
      supplier_id: formData.source_type === 'vendor' ? formData.supplier_id || null : null,
      client_id: formData.source_type === 'customer_provided' ? formData.client_id || null : null,
      delivery_date: formData.delivery_date || null,
      remarks: formData.remarks || null,
      items: lineItems.map(item => ({
        material_id: item.material_id,
        ordered_qty: item.ordered_qty,
        unit_id: item.unit_id,
        unit_price: item.unit_price,
        remarks: item.remarks || null,
        tolerance_percent: item.tolerance_percent,
        allow_extra_receipt: item.allow_extra_receipt,
      })),
    };
    
    await createPO.mutateAsync(submitData);
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      source_type: 'vendor',
      supplier_id: '',
      client_id: '',
      delivery_date: '',
      remarks: '',
    });
    setLineItems([]);
  };

  const handleApprove = async (id: string) => {
    await approvePO.mutateAsync({ id });
  };

  const handleCancel = async (id: string) => {
    await cancelPO.mutateAsync(id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this draft PO?')) {
      await deletePO.mutateAsync(id);
    }
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + (item.ordered_qty * item.unit_price), 0);

  return (
    <MainLayout title="Purchase Orders" subtitle="Create and manage purchase orders">
      <div className="space-y-6">
        {!isViewOnly && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Source Type Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source Type *</Label>
                  <Select
                    value={formData.source_type}
                    onValueChange={(value: 'vendor' | 'customer_provided') => {
                      setFormData({ 
                        ...formData, 
                        source_type: value,
                        supplier_id: '',
                        client_id: '',
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor Purchase</SelectItem>
                      <SelectItem value="customer_provided">Customer Provided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery Date</Label>
                  <Input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Supplier or Client Selection */}
              {formData.source_type === 'vendor' ? (
                <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <SupplierSelector
                    value={formData.supplier_id}
                    onChange={(value) => setFormData({ ...formData, supplier_id: value })}
                    placeholder="Select supplier..."
                    filterByType="vendor"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <ClientSelector
                    value={formData.client_id}
                    onChange={(value) => setFormData({ ...formData, client_id: value })}
                    placeholder="Select customer..."
                  />
                </div>
              )}

              {/* Line Items Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Order Items</h3>
                
                {/* Add Item Row */}
                <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <Label className="text-xs">Material</Label>
                      <SearchableComboBox
                        options={materialOptions}
                        value={newItem.material_id}
                        onChange={(value) => {
                          const mat = materials.find(m => m.id === value) as any;
                          const deniesExtra = mat?.deny_extra_tolerance || false;
                          setNewItem({ 
                            ...newItem, 
                            material_id: value,
                            allow_extra_receipt: deniesExtra ? false : newItem.allow_extra_receipt,
                            tolerance_percent: deniesExtra ? 0 : newItem.tolerance_percent,
                          });
                        }}
                        placeholder="Select material..."
                        emptyMessage="No material found"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={newItem.ordered_qty || ''}
                        onChange={(e) => setNewItem({ ...newItem, ordered_qty: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit</Label>
                      <Select
                        value={newItem.unit_id}
                        onValueChange={(value) => setNewItem({ ...newItem, unit_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Unit Price</Label>
                      <Input
                        type="number"
                        value={newItem.unit_price || ''}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                        min={0}
                        step={0.01}
                      />
                    </div>
                    <div className="col-span-2">
                      <Button type="button" onClick={handleAddItem} className="w-full">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Tolerance Row */}
                  <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t border-dashed">
                    <div className="col-span-3">
                      <Label className="text-xs flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Extra Qty Allowed
                      </Label>
                      <Select
                        value={String(newItem.tolerance_percent)}
                        onValueChange={(value) => setNewItem({ ...newItem, tolerance_percent: Number(value) })}
                        disabled={!newItem.allow_extra_receipt}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedTolerances.map((t) => (
                            <SelectItem key={t} value={String(t)}>
                              {t}%
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 flex items-center gap-2 pt-4">
                      <Checkbox
                        id="allow-extra"
                        checked={newItem.allow_extra_receipt}
                        onCheckedChange={(checked) => setNewItem({ 
                          ...newItem, 
                          allow_extra_receipt: !!checked,
                          tolerance_percent: checked ? newItem.tolerance_percent : 0 
                        })}
                        disabled={(() => {
                          const mat = materials.find(m => m.id === newItem.material_id) as any;
                          return mat?.deny_extra_tolerance || false;
                        })()}
                      />
                      <Label htmlFor="allow-extra" className="text-xs">
                        Allow extra receipt in GRN
                      </Label>
                    </div>
                    <div className="col-span-5">
                      {newItem.material_id && (() => {
                        const mat = materials.find(m => m.id === newItem.material_id) as any;
                        if (mat?.deny_extra_tolerance) {
                          return (
                            <p className="text-xs text-warning">
                              ⚠️ Material marked as "No Extra Tolerance" by Admin
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                {lineItems.length > 0 && (
                  <div className="overflow-x-auto">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-center">Tolerance</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.material_name}</TableCell>
                          <TableCell className="text-right">{item.ordered_qty}</TableCell>
                          <TableCell>{item.unit_code}</TableCell>
                          <TableCell className="text-right">Rs {item.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">Rs {(item.ordered_qty * item.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-center">
                            {item.allow_extra_receipt ? (
                              <Badge variant="secondary" className="text-xs">
                                +{item.tolerance_percent}%
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Exact
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={5} className="text-right font-semibold">Total:</TableCell>
                        <TableCell className="text-right font-semibold">Rs {totalAmount.toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                )}
              </div>

              {/* Remarks */}
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
                <Button type="submit" disabled={createPO.isPending || lineItems.length === 0}>
                  {createPO.isPending ? 'Creating...' : 'Create PO'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by PO number, supplier, customer..."
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
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Purchase Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No purchase orders found. Click "Create Purchase Order" to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Supplier / Customer</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono font-medium">{po.po_number}</TableCell>
                      <TableCell>{format(new Date(po.po_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {po.source_type === 'vendor' ? 'Vendor' : 'Customer'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {po.supplier?.name || po.client?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {po.delivery_date ? format(new Date(po.delivery_date), 'dd MMM yyyy') : '-'}
                      </TableCell>
                      <TableCell className="text-right">Rs {po.total_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[po.status]}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Store Incharge: Record GRN button for approved/partial POs */}
                          {isStoreIncharge && (po.status === 'approved' || po.status === 'partial') && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => navigate(`/inventory/grn?po_id=${po.id}`)}
                              className="h-8"
                            >
                              <ClipboardList className="h-3 w-3 mr-1" />
                              Record GRN
                            </Button>
                          )}
                          {!isViewOnly && (
                            <>
                              {po.status === 'draft' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleApprove(po.id)}
                                    className="h-8"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDelete(po.id)}
                                    className="h-8 text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              {(po.status === 'approved' || po.status === 'partial') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleCancel(po.id)}
                                  className="h-8"
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </>
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
    </MainLayout>
  );
}
