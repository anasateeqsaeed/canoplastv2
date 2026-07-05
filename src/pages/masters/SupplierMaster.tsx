import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DataTable, Column } from '@/components/masters/DataTable';
import { StatusBadge } from '@/components/masters/StatusBadge';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, Supplier, SupplierType, LaborRateUnit, SupplierWithClient } from '@/hooks/useSuppliers';
import { useClients } from '@/hooks/useClients';
import { Factory, Users, Banknote, CheckCircle, UserCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RefreshButton } from '@/components/layout/RefreshButton';

const SUPPLIER_TYPES: { value: SupplierType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'vendor', label: 'Vendor', icon: <Factory size={14} />, color: 'bg-primary/10 text-primary' },
  { value: 'job_work', label: 'Job Work', icon: <Users size={14} />, color: 'bg-warning/10 text-warning' },
  { value: 'cash_purchase', label: 'Cash Purchase', icon: <Banknote size={14} />, color: 'bg-success/10 text-success' },
  { value: 'customer_provided', label: 'Customer', icon: <UserCheck size={14} />, color: 'bg-purple-500/10 text-purple-500' },
];

const PROCESS_TYPES = ['Crushing', 'Mixing', 'Polishing', 'Painting', 'Plating', 'Welding', 'Printing', 'Other'];
const EXPENSE_CATEGORIES = ['Tools', 'Spares', 'Colors', 'Consumables', 'Maintenance', 'Misc'];
const VENDOR_CATEGORIES = ['Raw Material', 'Spare Parts', 'Services', 'Consumables'];

export default function SupplierMaster() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const { data: clients = [] } = useClients();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithClient | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SupplierType | 'all'>('all');
  const [formSupplierType, setFormSupplierType] = useState<SupplierType>('vendor');
  const [selectedProcessTypes, setSelectedProcessTypes] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const getTypeConfig = (type: string) => {
    return SUPPLIER_TYPES.find(t => t.value === type) || SUPPLIER_TYPES[0];
  };

  const columns: Column<SupplierWithClient>[] = [
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (item) => <span className="font-medium text-primary">{item.code}</span>,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => (
        <div>
          <p className="font-medium text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.supplier_type === 'customer_provided' && item.linked_client 
              ? `For: ${item.linked_client.name}` 
              : item.contact_person || '-'}
          </p>
        </div>
      ),
    },
    {
      key: 'supplier_type',
      label: 'Type',
      render: (item) => {
        const config = getTypeConfig(item.supplier_type);
        return (
          <Badge variant="secondary" className={cn('gap-1', config.color)}>
            {config.icon}
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'category',
      label: 'Category/Rate',
      render: (item) => {
        if (item.supplier_type === 'job_work' && item.labor_rate) {
          const unitLabel = item.labor_rate_unit === 'per_kg' ? '/kg' : item.labor_rate_unit === 'per_piece' ? '/pc' : '/hr';
          return <span className="font-medium">PKR {item.labor_rate}{unitLabel}</span>;
        }
        if (item.supplier_type === 'cash_purchase' && item.expense_category) {
          return <span className="text-muted-foreground">{item.expense_category}</span>;
        }
        if (item.supplier_type === 'customer_provided') {
          return <span className="text-muted-foreground">Toll Process</span>;
        }
        return <span className="text-muted-foreground">{item.category?.replace('_', ' ') || '-'}</span>;
      },
    },
    {
      key: 'phone',
      label: 'Contact',
      render: (item) => (
        <div className="text-sm">
          <p>{item.phone || '-'}</p>
          <p className="text-xs text-muted-foreground">{item.email || '-'}</p>
        </div>
      ),
    },
    {
      key: 'payment_terms',
      label: 'Terms',
      render: (item) => {
        if (item.supplier_type === 'cash_purchase') {
          return <span className="text-sm text-muted-foreground">Cash</span>;
        }
        if (item.supplier_type === 'job_work' && item.turnaround_days) {
          return <span className="text-sm">{item.turnaround_days} days TAT</span>;
        }
        if (item.supplier_type === 'customer_provided') {
          return <span className="text-sm text-muted-foreground">Toll Process</span>;
        }
        return <span className="text-sm">{item.payment_terms || 30} days</span>;
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} />,
    },
  ];

  const handleAdd = () => {
    setSelectedSupplier(null);
    setFormSupplierType('vendor');
    setSelectedProcessTypes([]);
    setSelectedClientId('');
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (supplier: SupplierWithClient) => {
    setSelectedSupplier(supplier);
    setFormSupplierType(supplier.supplier_type as SupplierType);
    setSelectedProcessTypes(supplier.process_types || []);
    setSelectedClientId(supplier.linked_client_id || '');
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleView = (supplier: SupplierWithClient) => {
    setSelectedSupplier(supplier);
    setFormSupplierType(supplier.supplier_type as SupplierType);
    setSelectedProcessTypes(supplier.process_types || []);
    setSelectedClientId(supplier.linked_client_id || '');
    setIsViewMode(true);
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: SupplierWithClient) => {
    if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      deleteSupplier.mutate(supplier.id);
    }
  };

  const toggleProcessType = (process: string) => {
    setSelectedProcessTypes(prev => 
      prev.includes(process) 
        ? prev.filter(p => p !== process)
        : [...prev, process]
    );
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const baseData = {
      code: formData.get('code') as string,
      name: formData.get('name') as string,
      supplier_type: formSupplierType,
      contact_person: formData.get('contact_person') as string || null,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      address: formData.get('address') as string || null,
      gst_number: formData.get('gst_number') as string || null,
      ntn_number: formData.get('ntn_number') as string || null,
      bank_details: formData.get('bank_details') as string || null,
      is_active: true,
    };

    let typeSpecificData = {};

    if (formSupplierType === 'vendor') {
      typeSpecificData = {
        category: formData.get('category') as string || null,
        payment_terms: Number(formData.get('payment_terms')) || 30,
        min_order_qty: Number(formData.get('min_order_qty')) || null,
        lead_time_days: Number(formData.get('lead_time_days')) || null,
      };
    } else if (formSupplierType === 'job_work') {
      typeSpecificData = {
        process_types: selectedProcessTypes,
        labor_rate: Number(formData.get('labor_rate')) || null,
        labor_rate_unit: formData.get('labor_rate_unit') as LaborRateUnit || null,
        turnaround_days: Number(formData.get('turnaround_days')) || null,
      };
    } else if (formSupplierType === 'cash_purchase') {
      typeSpecificData = {
        expense_category: formData.get('expense_category') as string || null,
        petty_cash_limit: Number(formData.get('petty_cash_limit')) || null,
        payment_terms: 0, // Cash purchases have no credit
      };
    } else if (formSupplierType === 'customer_provided') {
      typeSpecificData = {
        linked_client_id: selectedClientId || null,
        notes: formData.get('notes') as string || null,
        category: 'toll_manufacturing',
      };
    }

    const data = { ...baseData, ...typeSpecificData };

    if (selectedSupplier) {
      updateSupplier.mutate({ id: selectedSupplier.id, ...data });
    } else {
      createSupplier.mutate(data);
    }
    setIsDialogOpen(false);
  };

  const filteredSuppliers = activeFilter === 'all' 
    ? suppliers 
    : suppliers.filter(s => s.supplier_type === activeFilter);

  const vendors = suppliers.filter(s => s.supplier_type === 'vendor');
  const jobWork = suppliers.filter(s => s.supplier_type === 'job_work');
  const cashPurchase = suppliers.filter(s => s.supplier_type === 'cash_purchase');
  const customerProvided = suppliers.filter(s => s.supplier_type === 'customer_provided');
  const activeCount = suppliers.filter(s => s.is_active).length;

  if (isLoading) {
    return (
      <MainLayout title="Supplier Master" subtitle="Manage vendors, job work parties & cash purchases">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Supplier Master" subtitle="Manage vendors, job work parties & cash purchases">
      <div className="animate-fade-in">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div 
            className={cn(
              "bg-card rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
              activeFilter === 'vendor' ? 'border-primary ring-1 ring-primary' : 'border-border'
            )}
            onClick={() => setActiveFilter(activeFilter === 'vendor' ? 'all' : 'vendor')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Factory size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{vendors.length}</p>
                <p className="text-sm text-muted-foreground">Vendors</p>
              </div>
            </div>
          </div>
          <div 
            className={cn(
              "bg-card rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
              activeFilter === 'job_work' ? 'border-warning ring-1 ring-warning' : 'border-border'
            )}
            onClick={() => setActiveFilter(activeFilter === 'job_work' ? 'all' : 'job_work')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Users size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{jobWork.length}</p>
                <p className="text-sm text-muted-foreground">Job Work</p>
              </div>
            </div>
          </div>
          <div 
            className={cn(
              "bg-card rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
              activeFilter === 'cash_purchase' ? 'border-success ring-1 ring-success' : 'border-border'
            )}
            onClick={() => setActiveFilter(activeFilter === 'cash_purchase' ? 'all' : 'cash_purchase')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Banknote size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{cashPurchase.length}</p>
                <p className="text-sm text-muted-foreground">Cash Purchase</p>
              </div>
            </div>
          </div>
          <div 
            className={cn(
              "bg-card rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md",
              activeFilter === 'customer_provided' ? 'border-purple-500 ring-1 ring-purple-500' : 'border-border'
            )}
            onClick={() => setActiveFilter(activeFilter === 'customer_provided' ? 'all' : 'customer_provided')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <UserCheck size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{customerProvided.length}</p>
                <p className="text-sm text-muted-foreground">Customer</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <CheckCircle size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Badge */}
        {activeFilter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtering:</span>
            <Badge 
              variant="secondary" 
              className={cn('gap-1 cursor-pointer', getTypeConfig(activeFilter).color)}
              onClick={() => setActiveFilter('all')}
            >
              {getTypeConfig(activeFilter).icon}
              {getTypeConfig(activeFilter).label}
              <span className="ml-1">×</span>
            </Badge>
          </div>
        )}

        <DataTable
          data={filteredSuppliers}
          columns={columns}
          searchPlaceholder="Search suppliers..."
          onAdd={handleAdd}
          addLabel="Add Supplier"
          onEdit={handleEdit}
          onView={handleView}
          onDelete={handleDelete}
        />
      </div>

      {/* Supplier Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode ? 'View Supplier' : selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </DialogTitle>
          </DialogHeader>
          
          {/* Type Selection */}
          {!isViewMode && !selectedSupplier && (
            <div className="flex gap-2 mb-4">
              {SUPPLIER_TYPES.map((type) => (
                <Button
                  key={type.value}
                  type="button"
                  variant={formSupplierType === type.value ? 'default' : 'outline'}
                  className="flex-1 gap-2"
                  onClick={() => setFormSupplierType(type.value)}
                >
                  {type.icon}
                  {type.label}
                </Button>
              ))}
            </div>
          )}

          {isViewMode && (
            <Badge variant="secondary" className={cn('w-fit gap-1 mb-4', getTypeConfig(formSupplierType).color)}>
              {getTypeConfig(formSupplierType).icon}
              {getTypeConfig(formSupplierType).label}
            </Badge>
          )}

          <form onSubmit={handleSave}>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="type">Type Details</TabsTrigger>
                <TabsTrigger value="bank">Bank/Payment</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Supplier Code *</Label>
                    <Input
                      id="code"
                      name="code"
                      defaultValue={selectedSupplier?.code}
                      required
                      disabled={isViewMode}
                      placeholder="e.g., V001, JW01, CP01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={selectedSupplier?.name}
                      required
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      name="contact_person"
                      defaultValue={selectedSupplier?.contact_person || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      defaultValue={selectedSupplier?.phone || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={selectedSupplier?.email || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      name="gst_number"
                      defaultValue={selectedSupplier?.gst_number || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ntn_number">NTN Number</Label>
                    <Input
                      id="ntn_number"
                      name="ntn_number"
                      defaultValue={selectedSupplier?.ntn_number || ''}
                      disabled={isViewMode}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      defaultValue={selectedSupplier?.address || ''}
                      disabled={isViewMode}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Type Details Tab */}
              <TabsContent value="type">
                <div className="grid grid-cols-2 gap-4">
                  {/* Vendor Fields */}
                  {formSupplierType === 'vendor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <select
                          id="category"
                          name="category"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          defaultValue={selectedSupplier?.category || ''}
                          disabled={isViewMode}
                        >
                          <option value="">Select Category</option>
                          {VENDOR_CATEGORIES.map(cat => (
                            <option key={cat} value={cat.toLowerCase().replace(' ', '_')}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
                        <Input
                          id="lead_time_days"
                          name="lead_time_days"
                          type="number"
                          defaultValue={selectedSupplier?.lead_time_days || ''}
                          disabled={isViewMode}
                          placeholder="e.g., 7"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="min_order_qty">Min Order Qty</Label>
                        <Input
                          id="min_order_qty"
                          name="min_order_qty"
                          type="number"
                          defaultValue={selectedSupplier?.min_order_qty || ''}
                          disabled={isViewMode}
                          placeholder="e.g., 100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="payment_terms">Payment Terms (Days)</Label>
                        <Input
                          id="payment_terms"
                          name="payment_terms"
                          type="number"
                          defaultValue={selectedSupplier?.payment_terms || 30}
                          disabled={isViewMode}
                        />
                      </div>
                    </>
                  )}

                  {/* Job Work Fields */}
                  {formSupplierType === 'job_work' && (
                    <>
                      <div className="space-y-2 col-span-2">
                        <Label>Process Types</Label>
                        <div className="flex flex-wrap gap-2 p-3 border border-input rounded-md bg-muted/30">
                          {PROCESS_TYPES.map(process => (
                            <Badge
                              key={process}
                              variant={selectedProcessTypes.includes(process) ? 'default' : 'outline'}
                              className={cn(
                                'cursor-pointer transition-all',
                                isViewMode && 'pointer-events-none'
                              )}
                              onClick={() => !isViewMode && toggleProcessType(process)}
                            >
                              {process}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="labor_rate">Labor Rate (PKR)</Label>
                        <Input
                          id="labor_rate"
                          name="labor_rate"
                          type="number"
                          step="0.01"
                          defaultValue={selectedSupplier?.labor_rate || ''}
                          disabled={isViewMode}
                          placeholder="e.g., 15.50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="labor_rate_unit">Rate Unit</Label>
                        <select
                          id="labor_rate_unit"
                          name="labor_rate_unit"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          defaultValue={selectedSupplier?.labor_rate_unit || 'per_kg'}
                          disabled={isViewMode}
                        >
                          <option value="per_kg">Per KG</option>
                          <option value="per_piece">Per Piece</option>
                          <option value="per_hour">Per Hour</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="turnaround_days">Turnaround Time (Days)</Label>
                        <Input
                          id="turnaround_days"
                          name="turnaround_days"
                          type="number"
                          defaultValue={selectedSupplier?.turnaround_days || ''}
                          disabled={isViewMode}
                          placeholder="e.g., 3"
                        />
                      </div>
                    </>
                  )}

                  {/* Cash Purchase Fields */}
                  {formSupplierType === 'cash_purchase' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="expense_category">Expense Category</Label>
                        <select
                          id="expense_category"
                          name="expense_category"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          defaultValue={selectedSupplier?.expense_category || ''}
                          disabled={isViewMode}
                        >
                          <option value="">Select Category</option>
                          {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="petty_cash_limit">Petty Cash Limit (PKR)</Label>
                        <Input
                          id="petty_cash_limit"
                          name="petty_cash_limit"
                          type="number"
                          defaultValue={selectedSupplier?.petty_cash_limit || ''}
                          disabled={isViewMode}
                          placeholder="e.g., 10000"
                        />
                      </div>
                      <div className="col-span-2 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm text-muted-foreground">
                          💰 Cash purchases are paid immediately. No credit terms apply.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Customer Provided Fields */}
                  {formSupplierType === 'customer_provided' && (
                    <>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="linked_client_id">Link to Customer *</Label>
                        <select
                          id="linked_client_id"
                          name="linked_client_id"
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={selectedClientId}
                          onChange={(e) => setSelectedClientId(e.target.value)}
                          disabled={isViewMode}
                          required
                        >
                          <option value="">Select Customer</option>
                          {clients.filter(c => c.is_active).map(client => (
                            <option key={client.id} value={client.id}>
                              {client.code} - {client.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          This supplier entry represents materials provided by this customer for toll processing.
                        </p>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="notes">Notes</Label>
                        <textarea
                          id="notes"
                          name="notes"
                          className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background resize-none"
                          defaultValue={(selectedSupplier as any)?.notes || ''}
                          disabled={isViewMode}
                          placeholder="e.g., Customer also provides molds, processing rate per product..."
                        />
                      </div>
                      <div className="col-span-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          🏭 <strong>Toll Manufacturing:</strong> Material received from this customer will be tracked separately. 
                          Processing rates are set per-product in the Product Master.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Bank/Payment Tab */}
              <TabsContent value="bank">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_details">Bank Details</Label>
                    <textarea
                      id="bank_details"
                      name="bank_details"
                      className="w-full min-h-[120px] px-3 py-2 rounded-md border border-input bg-background resize-none"
                      defaultValue={selectedSupplier?.bank_details || ''}
                      disabled={isViewMode}
                      placeholder="Bank Name, Account Number, IBAN, Branch, etc."
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter complete bank details for payment processing. Include bank name, account number, IBAN/SWIFT code if applicable.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {!isViewMode && (
              <div className="flex justify-end gap-2 pt-6 border-t border-border mt-6">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                  {selectedSupplier ? 'Update' : 'Save'}
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
