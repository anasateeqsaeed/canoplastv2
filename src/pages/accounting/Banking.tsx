import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Landmark, Plus } from 'lucide-react';
import { useBankAccounts, useCreateBankAccount, useChequeRegister } from '@/hooks/useBankAccounts';
import { useTrialBalance } from '@/hooks/useAccountingReports';
import { useChartOfAccounts } from '@/hooks/useChartOfAccounts';
import { formatCurrencyFull } from '@/lib/currency';

const chequeBadge: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  cleared: 'default',
  bounced: 'destructive',
};

export default function BankingPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [iban, setIban] = useState('');

  const { data: banks = [] } = useBankAccounts();
  const { data: cheques = [] } = useChequeRegister();
  const { data: accounts = [] } = useChartOfAccounts();
  const { data: tb = [] } = useTrialBalance('1900-01-01', today);
  const create = useCreateBankAccount();

  const balances = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of tb) map.set(row.account_id, Number(row.closing));
    return map;
  }, [tb]);

  const cashAccount = accounts.find((a) => a.system_key === 'CASH_IN_HAND');
  const cashBalance = cashAccount ? balances.get(cashAccount.id) || 0 : 0;
  const bankTotal = banks.reduce((s, b) => s + (balances.get(b.coa_account_id) || 0), 0);

  const save = () =>
    create.mutate(
      { name, bank_name: bankName, account_number: accountNumber, iban },
      {
        onSuccess: () => {
          setName(''); setBankName(''); setAccountNumber(''); setIban('');
          setNewOpen(false);
        },
      },
    );

  return (
    <MainLayout title="Bank & Cash" subtitle="Bank accounts, balances and cheque register">
      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="cheques">Cheque Register</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cash in Hand</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{formatCurrencyFull(cashBalance)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Bank Balances</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{formatCurrencyFull(bankTotal)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Cash &amp; Bank</CardTitle></CardHeader>
              <CardContent className="text-2xl font-bold">{formatCurrencyFull(cashBalance + bankTotal)}</CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setNewOpen(true)}>
              <Plus size={16} className="mr-1" /> New Bank Account
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account No</TableHead>
                    <TableHead className="text-right">Balance (GL)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No bank accounts yet — add one to start recording bank receipts and payments</TableCell></TableRow>
                  ) : (
                    banks.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="flex items-center gap-2">
                          <Landmark size={16} className="text-primary" /> {b.name}
                          {!b.is_active && <Badge variant="secondary">inactive</Badge>}
                        </TableCell>
                        <TableCell>{b.bank_name}</TableCell>
                        <TableCell className="font-mono text-sm">{b.account_number}</TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(balances.get(b.coa_account_id) || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            Transfers between cash and bank: use a TR voucher from Journal Entries (Dr destination / Cr source).
          </p>
        </TabsContent>

        <TabsContent value="cheques" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>Doc #</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Cheque No</TableHead>
                    <TableHead>Cheque Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cheques.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No cheques recorded</TableCell></TableRow>
                  ) : (
                    cheques.map((c) => (
                      <TableRow key={`${c.direction}-${c.source_id}`}>
                        <TableCell>
                          <Badge variant={c.direction === 'received' ? 'default' : 'secondary'}>{c.direction}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{c.doc_number}</TableCell>
                        <TableCell>{c.party_name}</TableCell>
                        <TableCell>{c.cheque_number}</TableCell>
                        <TableCell>{c.cheque_date ? format(new Date(c.cheque_date), 'dd MMM yyyy') : '—'}</TableCell>
                        <TableCell>
                          {c.cheque_status && <Badge variant={chequeBadge[c.cheque_status]}>{c.cheque_status}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrencyFull(Number(c.amount))}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Mark cheques cleared or bounced from the Receivables / Payables screens.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Account Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meezan Current — Canoplast" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Bank</label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Meezan Bank" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Account Number</label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">IBAN</label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              A GL ledger account is created automatically under 1120 — Bank Accounts.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
              <Button disabled={!name.trim() || create.isPending} onClick={save}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
