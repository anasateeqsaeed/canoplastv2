import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMaterialIssues, MaterialIssueInput } from '@/hooks/useMaterialIssues';
import { useAvailableLotsByMaterial } from '@/hooks/useMaterialLots';
import { useDepartments } from '@/hooks/useDepartments';
import { DepartmentSelector } from '@/components/selectors/DepartmentSelector';
import { StoreSelector } from '@/components/inventory/StoreSelector';
import { MaterialLotPicker, MaterialLotWithLocation } from '@/components/inventory/MaterialLotPicker';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Package, CheckCircle, Truck, Clock, Search, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PermGate } from '@/components/auth/PermGate';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  issued: { label: 'Issued', color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
  picking: { label: 'Picking', color: 'bg-blue-500', icon: <Package className="h-3 w-3" /> },
  dispatched: { label: 'Dispatched', color: 'bg-purple-500', icon: <Truck className="h-3 w-3" /> },
  received: { label: 'Received', color: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
};

const PURPOSES = [
  { value: 'production', label: 'Production' },
  { value: 'mixing', label: 'Mixing' },
  { value: 'crushing', label: 'Crushing' },
  { value: 'testing', label: 'Testing/QC' },
  { value: 'other', label: 'Other' },
];

interface IssueItem {
  lot: MaterialLotWithLocation;
  quantity: number;
}

interface FormData {
  to_department_id: string;
  to_department_name: string;
  source_store_id: string;
  purpose: string;
  issued_by: string;
  remarks: string;
  items: IssueItem[];
}

const INITIAL_FORM_DATA: FormData = {
  to_department_id: '',
  to_department_name: '',
  source_store_id: '',
  purpose: 'production',
  issued_by: '',
  remarks: '',
  items: [],
};

export default function MaterialIssue() {
  const ALL_STATUS = '__all__';
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { issues, isLoading, createIssue, updateIssueStatus } = useMaterialIssues(statusFilter || undefined);
  const { data: departments = [] } = useDepartments();
  const { data: availableLots = [], isLoading: lotsLoading } = useAvailableLotsByMaterial();
  
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!formData.to_department_name || formData.items.length === 0) {
      toast.error('Please add at least one material');
      return;
    }

    // Validate all quantities (but allow shortage - qty can exceed remaining)
    const invalidItem = formData.items.find(item => item.quantity <= 0);
    if (invalidItem) {
      toast.error(`Invalid quantity for ${invalidItem.lot.materialName}`);
      return;
    }

    // Check for items with shortage (qty exceeds remaining)
    const shortageItems = formData.items.filter(item => item.quantity > item.lot.remainingQty);
    if (shortageItems.length > 0) {
      const shortageTotal = shortageItems.reduce((sum, item) => 
        sum + (item.quantity - item.lot.remainingQty), 0
      );
      // Show confirmation but proceed anyway - shortage allowed
      toast.warning(`Issuing with shortage: ${shortageTotal.toFixed(1)} kg short across ${shortageItems.length} item(s)`);
    }

    setIsSubmitting(true);
    try {
      // Create all issue records
      for (const item of formData.items) {
        const issueData: MaterialIssueInput = {
          to_department: formData.to_department_name,
          quantity_issued: item.quantity,
          purpose: formData.purpose,
          from_location_id: item.lot.rackId || undefined,
          material_lot_id: item.lot.id,
          // issued_by is recorded as the logged-in user (uuid) inside the hook
          remarks: formData.remarks || undefined,
        };

        await new Promise<void>((resolve, reject) => {
          createIssue.mutate(issueData, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          });
        });
      }

      toast.success(`Created ${formData.items.length} issue slip(s)`);
      setShowNewDialog(false);
      setFormData(INITIAL_FORM_DATA);
    } catch (error) {
      toast.error('Failed to create some issues');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateIssueStatus.mutate({ id, status: newStatus });
  };

  const handleDepartmentChange = (deptId: string) => {
    const dept = departments.find(d => d.id === deptId);
    setFormData(prev => ({
      ...prev,
      to_department_id: deptId,
      to_department_name: dept?.name || '',
    }));
  };

  const handleStoreChange = (storeId: string) => {
    setFormData(prev => ({
      ...prev,
      source_store_id: storeId,
      items: [], // Clear items when store changes
    }));
  };

  const handleAddLot = (lot: MaterialLotWithLocation) => {
    // Check if lot is already added
    if (formData.items.some(item => item.lot.id === lot.id)) {
      toast.error('This lot is already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { lot, quantity: lot.remainingQty }],
    }));
  };

  const handleRemoveItem = (lotId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.lot.id !== lotId),
    }));
  };

  const handleQuantityChange = (lotId: string, quantity: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.lot.id === lotId ? { ...item, quantity } : item
      ),
    }));
  };

  const handleDialogClose = () => {
    setShowNewDialog(false);
    setFormData(INITIAL_FORM_DATA);
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch = !searchTerm || 
      issue.issue_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.to_department?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const addedLotIds = new Set(formData.items.map(item => item.lot.id));
  const totalQuantity = formData.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <MainLayout 
      title="Material Issue" 
      subtitle="Issue materials from store to production"
      actions={
        <PermGate module="inventory" action="create">
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Issue
          </Button>
        </PermGate>
      }
    >
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by issue number or department..." 
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter === '' ? ALL_STATUS : statusFilter}
              onValueChange={(v) => setStatusFilter(v === ALL_STATUS ? '' : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS}>All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle>Material Issues</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No issue records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>From Location</TableHead>
                    <TableHead>To Department</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty (kg)</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIssues.map((issue) => {
                    const status = STATUS_CONFIG[issue.status] || STATUS_CONFIG.issued;
                    return (
                      <TableRow key={issue.id}>
                        <TableCell className="font-mono text-sm">{issue.issue_number}</TableCell>
                        <TableCell>{format(new Date(issue.issue_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{issue.from_location?.location_code || '-'}</TableCell>
                        <TableCell>{issue.to_department}</TableCell>
                        <TableCell>
                          {issue.material_lot ? (
                            <div>
                              <div className="font-medium">{issue.material_lot.material?.name}</div>
                              <div className="text-xs text-muted-foreground">{issue.material_lot.lot_number}</div>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{issue.quantity_issued}</TableCell>
                        <TableCell className="capitalize">{issue.purpose || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white`}>
                            {status.icon}
                            <span className="ml-1">{status.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {issue.status === 'issued' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(issue.id, 'picking')}>
                                Start Picking
                              </Button>
                            )}
                            {issue.status === 'picking' && (
                              <Button size="sm" variant="outline" onClick={() => handleStatusChange(issue.id, 'dispatched')}>
                                Dispatch
                              </Button>
                            )}
                            {issue.status === 'dispatched' && (
                              <Button size="sm" variant="default" onClick={() => handleStatusChange(issue.id, 'received')}>
                                Confirm Receipt
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Issue Dialog */}
      <Dialog open={showNewDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Material Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Row 1: Department & Purpose */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Issue To Department</Label>
                <DepartmentSelector 
                  value={formData.to_department_id}
                  onChange={handleDepartmentChange}
                  placeholder="Select department..."
                />
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Select value={formData.purpose} onValueChange={(v) => setFormData(prev => ({ ...prev, purpose: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Store Selection */}
            <StoreSelector 
              value={formData.source_store_id}
              onChange={handleStoreChange}
              label="Source Store / Godown (filters materials below)"
              showQuickAdd={false}
            />

            {/* Material Lot Picker */}
            <div className="space-y-2">
              <Label>Add Materials</Label>
              <MaterialLotPicker
                lots={availableLots}
                onAddLot={handleAddLot}
                filterByStoreId={formData.source_store_id || null}
                isLoading={lotsLoading}
                addedLotIds={addedLotIds}
              />
            </div>

            {/* Selected Items Table */}
            {formData.items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Selected Items ({formData.items.length})</Label>
                  <Badge variant="outline" className="font-mono">
                    Total: {totalQuantity.toFixed(1)} kg
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Lot Number</TableHead>
                        <TableHead>Rack</TableHead>
                        <TableHead className="w-32">Qty (kg)</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.items.map((item, index) => {
                        const isOverQty = item.quantity > item.lot.remainingQty;
                        return (
                          <TableRow key={item.lot.id}>
                            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{item.lot.materialName}</div>
                              <div className="text-xs text-muted-foreground">{item.lot.materialCode}</div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{item.lot.lotNumber}</TableCell>
                            <TableCell>{item.lot.rackCode || '-'}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => handleQuantityChange(item.lot.id, parseFloat(e.target.value) || 0)}
                                className={isOverQty ? 'border-amber-500' : ''}
                              />
                              {isOverQty && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  <span>Short by {(item.quantity - item.lot.remainingQty).toFixed(1)} kg</span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.lot.remainingQty} kg
                            </TableCell>
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(item.lot.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Issued By is recorded automatically as the logged-in user */}

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea 
                placeholder="Any additional notes..."
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
            <Button 
              onClick={handleCreate} 
              disabled={isSubmitting || !formData.to_department_name || formData.items.length === 0}
            >
              {isSubmitting ? 'Creating...' : `Create Issue Slip (${formData.items.length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
