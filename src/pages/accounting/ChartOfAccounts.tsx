import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, Pencil, Plus } from 'lucide-react';
import { useChartOfAccounts, useCreateAccount, useUpdateAccount, CoaAccount, AccountType } from '@/hooks/useChartOfAccounts';
import { cn } from '@/lib/utils';

const typeBadge: Record<string, string> = {
  asset: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  liability: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  equity: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  income: 'bg-green-500/10 text-green-700 dark:text-green-300',
  expense: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

interface EditState {
  id?: string;
  code: string;
  name: string;
  account_type: AccountType;
  parent_id: string | null;
  is_group: boolean;
  description: string;
  is_active: boolean;
}

export default function ChartOfAccountsPage() {
  const { data: accounts = [], isLoading } = useChartOfAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [edit, setEdit] = useState<EditState | null>(null);

  const byParent = useMemo(() => {
    const map = new Map<string | null, CoaAccount[]>();
    for (const a of accounts) {
      const key = a.parent_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [accounts]);

  const matches = (a: CoaAccount) =>
    !search ||
    a.code.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase());

  /** an account is shown if it or any descendant matches the search */
  const visible = useMemo(() => {
    const set = new Set<string>();
    const check = (a: CoaAccount): boolean => {
      const kids = byParent.get(a.id) || [];
      const childVisible = kids.map(check).some(Boolean);
      const self = matches(a) || childVisible;
      if (self) set.add(a.id);
      return self;
    };
    (byParent.get(null) || []).forEach(check);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, search, byParent]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const openNew = (parent?: CoaAccount) =>
    setEdit({
      code: '',
      name: '',
      account_type: parent?.account_type || 'expense',
      parent_id: parent?.id ?? null,
      is_group: false,
      description: '',
      is_active: true,
    });

  const openEdit = (a: CoaAccount) =>
    setEdit({
      id: a.id,
      code: a.code,
      name: a.name,
      account_type: a.account_type,
      parent_id: a.parent_id,
      is_group: a.is_group,
      description: a.description || '',
      is_active: a.is_active,
    });

  const save = () => {
    if (!edit) return;
    const payload = {
      code: edit.code.trim(),
      name: edit.name.trim(),
      account_type: edit.account_type,
      parent_id: edit.parent_id,
      is_group: edit.is_group,
      description: edit.description || null,
    };
    if (edit.id) {
      updateAccount.mutate({ id: edit.id, ...payload, is_active: edit.is_active }, { onSuccess: () => setEdit(null) });
    } else {
      createAccount.mutate(payload, { onSuccess: () => setEdit(null) });
    }
  };

  const renderNode = (a: CoaAccount, depth: number) => {
    if (!visible.has(a.id)) return null;
    const kids = (byParent.get(a.id) || []).filter((k) => visible.has(k.id));
    const isCollapsed = collapsed.has(a.id);
    return (
      <div key={a.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 group',
            a.is_group && 'font-medium',
          )}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {kids.length > 0 ? (
            <button onClick={() => toggle(a.id)} className="text-muted-foreground">
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <span className="w-[14px]" />
          )}
          <span className="font-mono text-xs text-muted-foreground w-14">{a.code}</span>
          <span className={cn(!a.is_active && 'line-through text-muted-foreground')}>{a.name}</span>
          <Badge variant="outline" className={cn('text-[10px]', typeBadge[a.account_type])}>
            {a.account_type}
          </Badge>
          {a.system_key && <Badge variant="secondary" className="text-[10px]">system</Badge>}
          <span className="flex-1" />
          <span className="opacity-0 group-hover:opacity-100 flex gap-1">
            {a.is_group && (
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Add sub-account" onClick={() => openNew(a)}>
                <Plus size={14} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(a)}>
              <Pencil size={14} />
            </Button>
          </span>
        </div>
        {!isCollapsed && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  const groups = accounts.filter((a) => a.is_group);

  return (
    <MainLayout title="Chart of Accounts" subtitle="5-level account hierarchy — the foundation of the GL">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search code or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <span className="flex-1" />
          <Button onClick={() => openNew()}>
            <Plus size={16} className="mr-1" /> New Account
          </Button>
        </div>

        <Card>
          <CardContent className="py-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
            ) : (
              (byParent.get(null) || []).map((a) => renderNode(a, 0))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit?.id ? 'Edit Account' : 'New Account'}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Code</label>
                  <Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select
                    value={edit.account_type}
                    onValueChange={(v) => setEdit({ ...edit, account_type: v as AccountType })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['asset', 'liability', 'equity', 'income', 'expense'] as const).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Parent Group</label>
                  <Select
                    value={edit.parent_id ?? 'none'}
                    onValueChange={(v) => setEdit({ ...edit, parent_id: v === 'none' ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— top level —</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.code} {g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={edit.is_group}
                    onCheckedChange={(c) => setEdit({ ...edit, is_group: c === true })}
                    disabled={!!edit.id}
                  />
                  Group (header) account
                </label>
                {edit.id && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={edit.is_active}
                      onCheckedChange={(c) => setEdit({ ...edit, is_active: c === true })}
                    />
                    Active
                  </label>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button>
                <Button
                  disabled={!edit.code.trim() || !edit.name.trim() || createAccount.isPending || updateAccount.isPending}
                  onClick={save}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
