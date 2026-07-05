import { useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Package,
  Eye,
  FileText,
  Loader2,
  Search,
  Edit3,
} from 'lucide-react';
import { EditRequisitionDialog } from '@/components/inventory/EditRequisitionDialog';
import {
  useStoreRequisitions,
  useRequisitionItems,
  useUpdateRequisition,
  type StoreRequisition,
} from '@/hooks/useStoreRequisitions';
import { useClients } from '@/hooks/useClients';
import { PermGate } from '@/components/auth/PermGate';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  picking: { label: 'Picking', variant: 'outline', icon: <Package className="h-3 w-3" /> },
  issued: { label: 'Issued', variant: 'default', icon: <FileText className="h-3 w-3" /> },
  partial: { label: 'Partial', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
  completed: { label: 'Completed', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
};

export default function StoreRequisitions() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequisition, setSelectedRequisition] = useState<StoreRequisition | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { data: requisitions, isLoading } = useStoreRequisitions(selectedDate, statusFilter);
  const { data: clients } = useClients();
  const { data: requisitionItems, isLoading: itemsLoading } = useRequisitionItems(
    selectedRequisition?.id || null
  );
  const updateRequisition = useUpdateRequisition();

  // Filter by search
  const filteredRequisitions = requisitions?.filter((req) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.requisition_number.toLowerCase().includes(query) ||
      req.job?.job_number?.toLowerCase().includes(query) ||
      req.job?.product_code?.toLowerCase().includes(query) ||
      req.department?.name?.toLowerCase().includes(query) ||
      req.machine?.machine_id?.toLowerCase().includes(query)
    );
  });

  // Counts by status
  const pendingCount = requisitions?.filter((r) => r.status === 'pending').length || 0;
  const inProgressCount = requisitions?.filter((r) => ['approved', 'picking'].includes(r.status)).length || 0;
  const completedCount = requisitions?.filter((r) => ['issued', 'completed'].includes(r.status)).length || 0;

  const handleViewDetails = (requisition: StoreRequisition) => {
    setSelectedRequisition(requisition);
    setDetailOpen(true);
  };

  const handleMarkReceived = async () => {
    if (!selectedRequisition) return;
    await updateRequisition.mutateAsync({
      id: selectedRequisition.id,
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
    setDetailOpen(false);
  };

  const handleStartPicking = async () => {
    if (!selectedRequisition) return;
    await updateRequisition.mutateAsync({
      id: selectedRequisition.id,
      status: 'picking',
    });
    setDetailOpen(false);
  };

  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return '-';
    const client = clients?.find((c) => c.id === clientId);
    return client?.name || '-';
  };

  return (
    <MainLayout title="Store Requisitions" subtitle="Manage material requisitions from production planning">
      <div className="space-y-6">
        {/* Date Filter */}
        <div className="flex justify-end">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-600/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Today</p>
                  <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Requisitions</CardTitle>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="picking">Picking</SelectItem>
                    <SelectItem value="issued">Issued</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !filteredRequisitions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No requisitions found for the selected criteria
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>REQ #</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Machine</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequisitions.map((req) => {
                      const status = statusConfig[req.status] || statusConfig.pending;
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium">{req.requisition_number}</TableCell>
                          <TableCell>{req.job?.job_number || '-'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{req.job?.product_code || '-'}</p>
                              <p className="text-xs text-muted-foreground">{req.job?.product_name || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getClientName(req.job?.client_id)}</TableCell>
                          <TableCell>{req.machine?.machine_id || '-'}</TableCell>
                          <TableCell className="capitalize">{req.shift || '-'}</TableCell>
                          <TableCell>{req.planned_production_qty?.toLocaleString() || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(req)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
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

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Requisition Details - {selectedRequisition?.requisition_number}
                </DialogTitle>
                {selectedRequisition && ['pending', 'approved', 'picking'].includes(selectedRequisition.status) && (
                  <PermGate module="inventory" action="edit">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                      className="mr-8"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </PermGate>
                )}
              </div>
            </DialogHeader>

            {selectedRequisition && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Job</p>
                    <p className="font-medium">{selectedRequisition.job?.job_number || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="font-medium">{selectedRequisition.job?.product_code || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Machine</p>
                    <p className="font-medium">{selectedRequisition.machine?.machine_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Shift</p>
                    <p className="font-medium capitalize">{selectedRequisition.shift || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Planned Qty</p>
                    <p className="font-medium">{selectedRequisition.planned_production_qty?.toLocaleString() || '-'} pcs</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedRequisition.status]?.variant || 'secondary'}>
                      {statusConfig[selectedRequisition.status]?.label || selectedRequisition.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Requested By</p>
                    <p className="font-medium">{selectedRequisition.requested_by || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium">{getClientName(selectedRequisition.job?.client_id)}</p>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Required Materials
                  </h3>
                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : !requisitionItems?.length ? (
                    <p className="text-sm text-muted-foreground">No materials added yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Material</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Required (kg)</TableHead>
                          <TableHead className="text-right">Adjusted (kg)</TableHead>
                          <TableHead className="text-right">Issued (kg)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requisitionItems.map((item) => {
                          const effectiveQty = (item as any).adjusted_qty_kg ?? item.required_qty_kg;
                          const isAdjusted = (item as any).adjusted_qty_kg != null;
                          return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.material?.code || '-'}</p>
                                <p className="text-xs text-muted-foreground">{item.material?.name || ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="capitalize">{item.material_role || '-'}</TableCell>
                            <TableCell className="capitalize">{item.source_type || 'fresh'}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {item.required_qty_kg.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {isAdjusted ? (
                                <span className="text-yellow-600">{effectiveQty.toFixed(2)}</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.issued_qty_kg?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell>
                              {item.available_qty_kg !== null && item.available_qty_kg < effectiveQty ? (
                                <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                  <AlertTriangle className="h-3 w-3" />
                                  Short
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="h-3 w-3" />
                                  In Stock
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Remarks */}
                {selectedRequisition.remarks && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Remarks</p>
                    <p className="text-sm">{selectedRequisition.remarks}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  {selectedRequisition.status === 'pending' && (
                    <Button onClick={handleMarkReceived} disabled={updateRequisition.isPending}>
                      {updateRequisition.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Mark as Received
                    </Button>
                  )}
                  {selectedRequisition.status === 'approved' && (
                    <Button onClick={handleStartPicking} disabled={updateRequisition.isPending}>
                      {updateRequisition.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Package className="h-4 w-4 mr-2" />
                      )}
                      Start Picking
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Requisition Dialog */}
        {selectedRequisition && requisitionItems && (
          <EditRequisitionDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            requisitionId={selectedRequisition.id}
            requisitionNumber={selectedRequisition.requisition_number}
            items={requisitionItems}
            onSuccess={() => {
              // Refetch items
              setDetailOpen(false);
              setTimeout(() => setDetailOpen(true), 100);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
