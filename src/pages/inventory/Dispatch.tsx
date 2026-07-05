import { useState, useRef, useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Printer, Truck, Eye, CheckCircle, Trash2, RotateCcw, Pencil, Users, X, Check, Search, Calendar as CalendarIcon, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { useDispatches, useDispatchItems, useUpdateDispatchStatus, useDeleteDispatch } from '@/hooks/useDispatches';
import { useUserNames } from '@/hooks/useUserNames';
import { DispatchDialog } from '@/components/inventory/DispatchDialog';
import { EditDispatchDialog } from '@/components/inventory/EditDispatchDialog';
import { DispatchChallanPrint, type FontScale } from '@/components/inventory/DispatchChallanPrint';
import { DispatchReturnDialog } from '@/components/inventory/DispatchReturnDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { useAuth } from '@/hooks/useAuth';
import { useMyPermissions } from '@/hooks/useMyPermissions';
import { PermGate } from '@/components/auth/PermGate';
import { cn } from '@/lib/utils';

export default function DispatchPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const { can } = useMyPermissions();
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewDispatch, setViewDispatch] = useState<any>(null);
  const [returnDispatch, setReturnDispatch] = useState<any>(null);
  const [editDispatch, setEditDispatch] = useState<any>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const { data: dispatches = [], isLoading } = useDispatches(statusFilter);
  const dispatchCreatorIds = useMemo(
    () => Array.from(new Set((dispatches as any[]).map((d) => d.created_by).filter(Boolean))) as string[],
    [dispatches],
  );
  const { data: dispatchUserNames = {} } = useUserNames(dispatchCreatorIds);
  const { data: viewItems = [], isLoading: isLoadingItems } = useDispatchItems(viewDispatch?.id);
  const updateStatus = useUpdateDispatchStatus();
  const deleteDispatch = useDeleteDispatch();
  const printRef = useRef<HTMLDivElement>(null);
  const [printFontScale, setPrintFontScale] = useState<FontScale>(() => {
    if (typeof window === 'undefined') return 'md';
    const saved = window.localStorage.getItem('dispatch.printFontScale');
    return (saved as FontScale) || 'md';
  });
  useEffect(() => {
    try { window.localStorage.setItem('dispatch.printFontScale', printFontScale); } catch {}
  }, [printFontScale]);
  const [printFitToPage, setPrintFitToPage] = useState(true);

  // Unique customer list from current dispatches (auto-reflects active status tab)
  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    dispatches.forEach((d: any) => {
      if (d.client_id && d.clients?.name) map.set(d.client_id, d.clients.name);
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [dispatches]);

  // Unique product list from current dispatches' line items
  const productOptions = useMemo(() => {
    const map = new Map<string, { code: string; name: string }>();
    dispatches.forEach((d: any) => {
      (d.dispatch_items || []).forEach((it: any) => {
        if (it.product_id && it.products && !map.has(it.product_id)) {
          map.set(it.product_id, { code: it.products.code, name: it.products.name });
        }
      });
    });
    return Array.from(map.entries())
      .map(([id, p]) => ({ id, code: p.code, name: p.name }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [dispatches]);

  // Apply all filters (AND-combined)
  const filteredDispatches = useMemo(() => {
    const clientSet = selectedClientIds.length ? new Set(selectedClientIds) : null;
    const productSet = selectedProductIds.length ? new Set(selectedProductIds) : null;
    const q = searchText.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()).getTime() : null;
    const toMs = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999).getTime() : null;
    return dispatches.filter((d: any) => {
      if (clientSet && !clientSet.has(d.client_id)) return false;
      if (productSet) {
        const items = d.dispatch_items || [];
        if (!items.some((it: any) => productSet.has(it.product_id))) return false;
      }
      if (fromMs !== null || toMs !== null) {
        const t = new Date(d.dispatch_date).getTime();
        if (fromMs !== null && t < fromMs) return false;
        if (toMs !== null && t > toMs) return false;
      }
      if (q) {
        const hay = [
          d.dispatch_number,
          d.gate_pass_number,
          d.vehicle_number,
          d.driver_name,
          d.clients?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [dispatches, selectedClientIds, selectedProductIds, searchText, dateFrom, dateTo]);

  const toggleClient = (id: string) =>
    setSelectedClientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const clearClients = () => setSelectedClientIds([]);
  const selectAllClients = () => setSelectedClientIds(clientOptions.map((c) => c.id));

  const toggleProduct = (id: string) =>
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  const clearProducts = () => setSelectedProductIds([]);

  const clearAllFilters = () => {
    setSearchText('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedClientIds([]);
    setSelectedProductIds([]);
  };

  const hasAnyFilter =
    !!searchText || !!dateFrom || !!dateTo || selectedClientIds.length > 0 || selectedProductIds.length > 0;

  const applyDatePreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const dt = now.getDate();
    if (preset === 'today') {
      const t = new Date(y, m, dt); setDateFrom(t); setDateTo(t);
    } else if (preset === 'yesterday') {
      const t = new Date(y, m, dt - 1); setDateFrom(t); setDateTo(t);
    } else if (preset === 'week') {
      const day = now.getDay(); // 0=Sun
      const start = new Date(y, m, dt - day);
      setDateFrom(start); setDateTo(new Date(y, m, dt));
    } else if (preset === 'month') {
      setDateFrom(new Date(y, m, 1)); setDateTo(new Date(y, m, dt));
    } else if (preset === 'lastMonth') {
      setDateFrom(new Date(y, m - 1, 1)); setDateTo(new Date(y, m, 0));
    }
  };

  const filterLabel =
    selectedClientIds.length === 0
      ? 'All customers'
      : selectedClientIds.length === 1
      ? clientOptions.find((c) => c.id === selectedClientIds[0])?.name || '1 customer'
      : `${selectedClientIds.length} customers`;

  const productLabel =
    selectedProductIds.length === 0
      ? 'All products'
      : selectedProductIds.length === 1
      ? productOptions.find((p) => p.id === selectedProductIds[0])?.code || '1 product'
      : `${selectedProductIds.length} products`;

  const dateLabel =
    dateFrom && dateTo
      ? `${format(dateFrom, 'dd MMM')} – ${format(dateTo, 'dd MMM')}`
      : dateFrom
      ? `From ${format(dateFrom, 'dd MMM yy')}`
      : dateTo
      ? `Until ${format(dateTo, 'dd MMM yy')}`
      : 'Any date';

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforePrint: async () => { document.title = ' '; },
    onAfterPrint: () => {
      document.title = 'Dispatch Management';
      // Auto-transition draft → dispatched on print
      if (viewDispatch?.id && viewDispatch?.status === 'draft') {
        updateStatus.mutate({ id: viewDispatch.id, status: 'dispatched' });
        setViewDispatch({ ...viewDispatch, status: 'dispatched' });
      }
    },
  });

  // Deep-link support: open View dialog when ?view=<id> is present (QR scan target)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (!viewId || dispatches.length === 0) return;
    const target = dispatches.find((d: any) => d.id === viewId);
    if (target) {
      setViewDispatch(target);
      // Clean the URL so refreshing doesn't reopen
      const url = new URL(window.location.href);
      url.searchParams.delete('view');
      window.history.replaceState({}, '', url.toString());
    }
  }, [dispatches]);

  const statusColor = (s: string) => {
    if (s === 'dispatched') return 'default';
    if (s === 'delivered') return 'secondary';
    if (s === 'returned') return 'destructive';
    return 'outline';
  };

  return (
    <MainLayout title="Dispatch Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dispatch Management</h1>
            <p className="text-muted-foreground">Create dispatches, gate passes, and print challans</p>
          </div>
          <PermGate module="inventory" action="create">
            <Button onClick={() => setCreateOpen(true)}><Plus size={16} className="mr-1" /> New Dispatch</Button>
          </PermGate>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Draft</TabsTrigger>
              <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
              <TabsTrigger value="delivered">Delivered</TabsTrigger>
              <TabsTrigger value="returned">Returned</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
                  <span className="flex items-center gap-2 truncate">
                    <Users size={14} />
                    <span className="truncate">{filterLabel}</span>
                  </span>
                  {selectedClientIds.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                      {selectedClientIds.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[320px] p-0">
                <Command>
                  <CommandInput placeholder="Search customer…" />
                  <div className="flex items-center justify-between border-b px-2 py-1.5 text-xs">
                    <button
                      type="button"
                      onClick={selectAllClients}
                      className="text-primary hover:underline"
                    >
                      Select all ({clientOptions.length})
                    </button>
                    <button
                      type="button"
                      onClick={clearClients}
                      className="text-muted-foreground hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No customers in current view.</CommandEmpty>
                    <CommandGroup>
                      {clientOptions.map((c) => {
                        const checked = selectedClientIds.includes(c.id);
                        return (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => toggleClient(c.id)}
                            className="cursor-pointer"
                          >
                            <div
                              className={cn(
                                'mr-2 flex h-4 w-4 items-center justify-center rounded border',
                                checked
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-muted-foreground/40'
                              )}
                            >
                              {checked && <Check size={12} />}
                            </div>
                            <span className="truncate">{c.name}</span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedClientIds.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearClients}
                title="Clear customer filter"
                className="h-8 w-8"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Quick search + product + date row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-[420px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search dispatch #, gate pass, vehicle, driver…"
              className="pl-8 h-9"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 justify-between min-w-[200px]">
                <span className="flex items-center gap-2 truncate">
                  <CalendarIcon size={14} />
                  <span className="truncate">{dateLabel}</span>
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <div className="flex flex-wrap gap-1 border-b p-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyDatePreset('today')}>Today</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyDatePreset('yesterday')}>Yesterday</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyDatePreset('week')}>This week</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyDatePreset('month')}>This month</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => applyDatePreset('lastMonth')}>Last month</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>Clear</Button>
              </div>
              <Calendar
                mode="range"
                selected={{ from: dateFrom, to: dateTo }}
                onSelect={(range) => { setDateFrom(range?.from); setDateTo(range?.to); }}
                numberOfMonths={2}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>

          <Popover open={productPickerOpen} onOpenChange={setProductPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 justify-between min-w-[180px]">
                <span className="flex items-center gap-2 truncate">
                  <Package size={14} />
                  <span className="truncate">{productLabel}</span>
                </span>
                {selectedProductIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {selectedProductIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[360px] p-0">
              <Command>
                <CommandInput placeholder="Search product by code or name…" />
                <div className="flex items-center justify-between border-b px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground">{productOptions.length} products in view</span>
                  <button type="button" onClick={clearProducts} className="text-muted-foreground hover:underline">
                    Clear
                  </button>
                </div>
                <CommandList className="max-h-[320px]">
                  <CommandEmpty>No products in current view.</CommandEmpty>
                  <CommandGroup>
                    {productOptions.map((p) => {
                      const checked = selectedProductIds.includes(p.id);
                      return (
                        <CommandItem
                          key={p.id}
                          value={`${p.code} ${p.name}`}
                          onSelect={() => toggleProduct(p.id)}
                          className="cursor-pointer"
                        >
                          <div
                            className={cn(
                              'mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                              checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40'
                            )}
                          >
                            {checked && <Check size={12} />}
                          </div>
                          <span className="font-mono text-xs mr-2 shrink-0">{p.code}</span>
                          <span className="truncate text-muted-foreground">{p.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {hasAnyFilter && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={clearAllFilters}>
              <X size={14} className="mr-1" /> Clear all
            </Button>
          )}

          <div className="ml-auto text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredDispatches.length}</span> of {dispatches.length}
          </div>
        </div>

        {/* Active filter chips */}
        {hasAnyFilter && (
          <div className="flex flex-wrap items-center gap-1.5">
            {searchText && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <span className="text-xs">Search: "{searchText}"</span>
                <button onClick={() => setSearchText('')} className="hover:text-destructive"><X size={12} /></button>
              </Badge>
            )}
            {(dateFrom || dateTo) && (
              <Badge variant="secondary" className="gap-1 pr-1">
                <span className="text-xs">{dateLabel}</span>
                <button onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="hover:text-destructive"><X size={12} /></button>
              </Badge>
            )}
            {selectedClientIds.map((id) => {
              const c = clientOptions.find((x) => x.id === id);
              if (!c) return null;
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  <span className="text-xs">Customer: {c.name}</span>
                  <button onClick={() => toggleClient(id)} className="hover:text-destructive"><X size={12} /></button>
                </Badge>
              );
            })}
            {selectedProductIds.map((id) => {
              const p = productOptions.find((x) => x.id === id);
              if (!p) return null;
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  <span className="text-xs">Product: {p.code}</span>
                  <button onClick={() => toggleProduct(id)} className="hover:text-destructive"><X size={12} /></button>
                </Badge>
              );
            })}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck size={20} /> Dispatches</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-scroll [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/60">
            <p className="lg:hidden text-[11px] text-muted-foreground mb-1 italic">← Scroll horizontally to see Actions →</p>
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatch #</TableHead>
                  <TableHead>Gate Pass #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Pieces</TableHead>
                  <TableHead className="text-right">Cartons</TableHead>
                  <TableHead className="text-right">Weight KG</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead className="text-right sticky right-0 bg-card z-10 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDispatches.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.dispatch_number}</TableCell>
                    <TableCell className="font-mono text-xs">{d.gate_pass_number}</TableCell>
                    <TableCell>{format(new Date(d.dispatch_date), 'dd/MM/yy')}</TableCell>
                    <TableCell className="font-medium">{d.clients?.name}{d.is_third_party && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">3rd Party</Badge>}</TableCell>
                    <TableCell>{d.vehicle_number || '—'}</TableCell>
                    <TableCell className="text-right">{d.total_pieces}</TableCell>
                    <TableCell className="text-right">{d.total_cartons}</TableCell>
                    <TableCell className="text-right">{d.total_weight_kg.toFixed(3)}</TableCell>
                    <TableCell><Badge variant={statusColor(d.status) as any}>{d.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col leading-tight">
                        <span className="truncate max-w-[140px]" title={(d as any).created_by ? (dispatchUserNames[(d as any).created_by] || '') : ''}>
                          {(d as any).created_by ? (dispatchUserNames[(d as any).created_by] || '…') : (d.dispatched_by || '—')}
                        </span>
                        <span className="text-[10px] opacity-70">{format(new Date(d.created_at), 'dd/MM HH:mm')}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1 sticky right-0 bg-card shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                      {(() => {
                        const ageHours = (Date.now() - new Date(d.created_at).getTime()) / 3.6e6;
                        const withinWindow = ageHours <= 24;
                        const canEdit = isAdmin || (can('inventory', 'edit') && withinWindow);
                        const canDelete = isAdmin || (can('inventory', 'delete') && withinWindow);
                        return (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => setViewDispatch(d)}><Eye size={14} /></Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-blue-600 hover:text-blue-700"
                                title={isAdmin ? 'Edit (Admin)' : `Edit (within 24h • ${Math.max(0, Math.ceil(24 - ageHours))}h left)`}
                                onClick={() => setEditDispatch(d)}
                              >
                                <Pencil size={14} />
                              </Button>
                            )}
                            {d.status === 'draft' && (
                              <PermGate module="inventory" action="edit">
                                <Button variant="ghost" size="icon" onClick={() => updateStatus.mutate({ id: d.id, status: 'dispatched' })}><CheckCircle size={14} /></Button>
                              </PermGate>
                            )}
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    title={isAdmin ? 'Delete (Admin)' : `Delete (within 24h • ${Math.max(0, Math.ceil(24 - ageHours))}h left)`}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Dispatch {d.dispatch_number}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {d.status === 'draft'
                                        ? 'This draft dispatch will be permanently deleted along with all its items.'
                                        : `This ${d.status} dispatch will be permanently deleted. Dispatched quantities will be returned to stock automatically.`}
                                      {' '}This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteDispatch.mutate(d.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {(d.status === 'dispatched' || d.status === 'delivered') && (
                              <>
                                {d.status === 'dispatched' && (
                                  <PermGate module="inventory" action="edit">
                                    <Button variant="ghost" size="icon" onClick={() => updateStatus.mutate({ id: d.id, status: 'delivered' })}><CheckCircle size={14} /></Button>
                                  </PermGate>
                                )}
                                <PermGate module="inventory" action="edit">
                                  <Button variant="ghost" size="icon" className="text-orange-600 hover:text-orange-700" onClick={() => setReturnDispatch(d)}>
                                    <RotateCcw size={14} />
                                  </Button>
                                </PermGate>
                              </>
                            )}
                          </>
                        );
                      })()}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredDispatches.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">
                    {hasAnyFilter ? 'No dispatches match the current filters' : 'No dispatches found'}
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <DispatchDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Return Dialog */}
      {returnDispatch && (
        <DispatchReturnDialog
          dispatch={returnDispatch}
          open={!!returnDispatch}
          onOpenChange={(open) => !open && setReturnDispatch(null)}
        />
      )}

      {/* Edit Dialog (Admin only) */}
      {editDispatch && (
        <EditDispatchDialog
          dispatch={editDispatch}
          open={!!editDispatch}
          onOpenChange={(open) => !open && setEditDispatch(null)}
        />
      )}

      {/* View / Print Dialog */}
      <Dialog open={!!viewDispatch} onOpenChange={() => setViewDispatch(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span>Dispatch {viewDispatch?.dispatch_number}</span>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 text-xs font-normal">
                  <span className="text-muted-foreground">Font:</span>
                  {(['sm', 'md', 'lg', 'xl', '2xl'] as FontScale[]).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={printFontScale === s ? 'default' : 'outline'}
                      className="h-7 px-2 text-xs"
                      onClick={() => setPrintFontScale(s)}
                    >
                      {s === 'sm' ? 'S' : s === 'md' ? 'M' : s === 'lg' ? 'L' : s === 'xl' ? 'XL' : 'XXL'}
                    </Button>
                  ))}
                </div>
                <label className="flex items-center gap-1 text-xs font-normal cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={printFitToPage}
                    onChange={(e) => setPrintFitToPage(e.target.checked)}
                  />
                  Fit to page
                </label>
                <Button size="sm" variant="outline" onClick={() => handlePrint()} disabled={isLoadingItems || viewItems.length === 0}>
                  <Printer size={14} className="mr-1" /> {isLoadingItems ? 'Loading...' : 'Print Challan'}
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>
          {viewDispatch && (
            <>
              <div className="hidden">
                <DispatchChallanPrint
                  ref={printRef}
                  dispatch={viewDispatch}
                  items={viewItems}
                  fontScale={printFontScale}
                  fitToPage={printFitToPage}
                />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Gate Pass:</span><p className="font-medium">{viewDispatch.gate_pass_number}</p></div>
                  <div><span className="text-muted-foreground">Client:</span><p className="font-medium">{viewDispatch.clients?.name}</p></div>
                  <div><span className="text-muted-foreground">Vehicle:</span><p className="font-medium">{viewDispatch.vehicle_number || '—'}</p></div>
                  <div><span className="text-muted-foreground">Driver:</span><p className="font-medium">{viewDispatch.driver_name || '—'}</p></div>
                </div>
                <div className="overflow-x-scroll [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-thumb]:rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Packing</TableHead>
                      <TableHead className="text-right">Packs</TableHead>
                      <TableHead className="text-right">Loose</TableHead>
                      <TableHead className="text-right">Total Qty</TableHead>
                      <TableHead className="text-right">Weight KG</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products?.name}</TableCell>
                        <TableCell>{item.packing_types?.name || '—'}</TableCell>
                        <TableCell className="text-right">{item.num_packs}</TableCell>
                        <TableCell className="text-right">{item.loose_qty}</TableCell>
                        <TableCell className="text-right font-medium">{item.total_qty}</TableCell>
                        <TableCell className="text-right">{item.weight_kg?.toFixed(3) || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
