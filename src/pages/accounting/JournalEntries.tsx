import { useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Eye } from 'lucide-react';
import { useVouchers, Voucher, VOUCHER_TYPES } from '@/hooks/useVouchers';
import { VoucherDialog } from '@/components/accounting/VoucherDialog';
import { VoucherDetailDialog } from '@/components/accounting/VoucherDetailDialog';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  posted: 'default',
  reversed: 'destructive',
};

export default function JournalEntriesPage() {
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(Date.now() - 90 * 86400_000), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newOpen, setNewOpen] = useState(false);
  const [selected, setSelected] = useState<Voucher | null>(null);

  const { data: vouchers = [], isLoading } = useVouchers({ type, status, search, startDate, endDate });

  return (
    <MainLayout title="Journal Entries" subtitle="All vouchers — manual and auto-generated">
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(VOUCHER_TYPES).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{code} — {label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="posted">Posted</SelectItem>
                <SelectItem value="reversed">Reversed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-40">
            <label className="text-xs text-muted-foreground">Search</label>
            <Input placeholder="Number, narration, reference…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button onClick={() => setNewOpen(true)}>
            <Plus size={16} className="mr-1" /> New Voucher
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Narration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                ) : vouchers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No vouchers in this range</TableCell></TableRow>
                ) : (
                  vouchers.map((v) => (
                    <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelected(v)}>
                      <TableCell className="font-mono text-sm">{v.voucher_number}</TableCell>
                      <TableCell>{format(new Date(v.voucher_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>{VOUCHER_TYPES[v.voucher_type] || v.voucher_type}</TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">{v.narration}</TableCell>
                      <TableCell><Badge variant={statusVariant[v.status]}>{v.status}</Badge></TableCell>
                      <TableCell><Eye size={16} className="text-muted-foreground" /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <VoucherDialog open={newOpen} onOpenChange={setNewOpen} />
      <VoucherDetailDialog voucher={selected} onClose={() => setSelected(null)} />
    </MainLayout>
  );
}
