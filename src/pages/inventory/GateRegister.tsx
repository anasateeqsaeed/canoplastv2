import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useGateMovements } from '@/hooks/useGateMovements';
import { ClipboardList, Search, Factory, Building2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { format } from 'date-fns';

// A single audit view over every gate movement — both inward (gate-in) and
// outward (gate-out) — so vendor/customer arrivals, departures and the return
// of returnable items are all visible and reconcilable in one place.
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-yellow-500' },
  closed: { label: 'Closed', color: 'bg-green-500' },
  returned: { label: 'Returned', color: 'bg-blue-500' },
};

const ALL = '__all__';

export default function GateRegister() {
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [partyFilter, setPartyFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [returnableFilter, setReturnableFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // No direction argument → fetch the whole gate register (in + out).
  const { data: movements = [], isLoading } = useGateMovements();

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      if (directionFilter && m.direction !== directionFilter) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      if (returnableFilter === 'yes' && !m.returnable) return false;
      if (returnableFilter === 'no' && m.returnable) return false;
      if (partyFilter === 'vendor' && !m.vendor_id) return false;
      if (partyFilter === 'customer' && !m.customer_id) return false;
      if (partyFilter === 'none' && (m.vendor_id || m.customer_id)) return false;
      if (fromDate && m.movement_date < fromDate) return false;
      if (toDate && m.movement_date > toDate) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const partyName = m.vendor?.name || m.customer?.name || m.party_name || '';
        const match =
          m.gate_pass_no?.toLowerCase().includes(term) ||
          m.item_description?.toLowerCase().includes(term) ||
          m.vehicle_no?.toLowerCase().includes(term) ||
          partyName.toLowerCase().includes(term);
        if (!match) return false;
      }
      return true;
    });
  }, [movements, directionFilter, statusFilter, returnableFilter, partyFilter, fromDate, toDate, searchTerm]);

  // Summary across the filtered rows so the tiles reflect the current view.
  const stats = useMemo(() => {
    let gateIn = 0;
    let gateOut = 0;
    let returnablePending = 0;
    let returned = 0;
    for (const m of filtered) {
      if (m.direction === 'in') gateIn += 1;
      if (m.direction === 'out') gateOut += 1;
      if (m.returnable && m.status !== 'returned') returnablePending += 1;
      if (m.status === 'returned') returned += 1;
    }
    return { gateIn, gateOut, returnablePending, returned };
  }, [filtered]);

  const renderDirection = (direction: string) =>
    direction === 'in' ? (
      <Badge className="bg-emerald-600 text-white">
        <ArrowDownToLine className="h-3 w-3 mr-1" />
        In
      </Badge>
    ) : (
      <Badge className="bg-orange-600 text-white">
        <ArrowUpFromLine className="h-3 w-3 mr-1" />
        Out
      </Badge>
    );

  const renderParty = (m: (typeof movements)[number]) => {
    if (m.vendor) {
      return (
        <div className="flex items-center gap-1.5">
          <Factory className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{m.vendor.name}</span>
          <Badge variant="outline" className="text-[10px]">Vendor</Badge>
        </div>
      );
    }
    if (m.customer) {
      return (
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>{m.customer.name}</span>
          <Badge variant="outline" className="text-[10px]">Customer</Badge>
        </div>
      );
    }
    return <span className="text-muted-foreground">{m.party_name || '—'}</span>;
  };

  const statTiles = [
    { label: 'Gate In', value: stats.gateIn },
    { label: 'Gate Out', value: stats.gateOut },
    { label: 'Returnable Pending', value: stats.returnablePending },
    { label: 'Returned', value: stats.returned },
  ];

  return (
    <MainLayout
      title="Gate Register / Audit"
      subtitle="All gate movements — inward & outward, including returnable status"
    >
      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statTiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{t.label}</p>
              <p className="text-2xl font-semibold">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by gate pass, material, party or vehicle..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Direction</label>
              <Select value={directionFilter === '' ? ALL : directionFilter} onValueChange={(v) => setDirectionFilter(v === ALL ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="in">Gate In</SelectItem>
                  <SelectItem value="out">Gate Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Party</label>
              <Select value={partyFilter === '' ? ALL : partyFilter} onValueChange={(v) => setPartyFilter(v === ALL ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={statusFilter === '' ? ALL : statusFilter} onValueChange={(v) => setStatusFilter(v === ALL ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Returnable</label>
              <Select value={returnableFilter === '' ? ALL : returnableFilter} onValueChange={(v) => setReturnableFilter(v === ALL ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All</SelectItem>
                  <SelectItem value="yes">Returnable</SelectItem>
                  <SelectItem value="no">Non-returnable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Register table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Gate Movement Register
            <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No gate movements found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>Gate Pass #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Returnable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Returned At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => {
                    const status = STATUS_CONFIG[m.status] || STATUS_CONFIG.open;
                    return (
                      <TableRow key={m.id}>
                        <TableCell>{renderDirection(m.direction)}</TableCell>
                        <TableCell className="font-mono text-sm">{m.gate_pass_no || '—'}</TableCell>
                        <TableCell>{format(new Date(m.movement_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{renderParty(m)}</TableCell>
                        <TableCell>{m.item_description || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {m.quantity != null ? `${m.quantity}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                        </TableCell>
                        <TableCell>{m.vehicle_no || '—'}</TableCell>
                        <TableCell>
                          {m.returnable ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">Returnable</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-white`}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {m.returned_at ? format(new Date(m.returned_at), 'dd MMM yyyy HH:mm') : '—'}
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
    </MainLayout>
  );
}
