import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ShoppingCart, Receipt, BarChart3 } from 'lucide-react';
import { useQuotations, useSalesOrders } from '@/hooks/useSales';

export default function SalesIndex() {
  const navigate = useNavigate();
  const { data: quotes = [] } = useQuotations({ status: 'all' });
  const { data: orders = [] } = useSalesOrders({ status: 'all' });

  const openQuotes = quotes.filter((q) => q.status === 'draft' || q.status === 'sent').length;
  const pendingAccept = quotes.filter((q) => q.status === 'sent').length;
  const openOrders = orders.filter((o) => o.status === 'open' || o.status === 'in_production').length;
  const overdue = orders.filter((o) => {
    if (!o.required_date) return false;
    if (o.status === 'fulfilled' || o.status === 'closed' || o.status === 'cancelled') return false;
    return new Date(o.required_date) < new Date();
  }).length;

  const tiles = [
    { label: 'Quotations', sub: `${openQuotes} open`, icon: FileText, path: '/sales/quotations', color: 'text-blue-600' },
    { label: 'Pending Acceptance', sub: `${pendingAccept} sent`, icon: FileText, path: '/sales/quotations', color: 'text-amber-600' },
    { label: 'Sales Orders', sub: `${openOrders} open`, icon: ShoppingCart, path: '/sales/orders', color: 'text-indigo-600' },
    { label: 'Overdue', sub: `${overdue} past due`, icon: ShoppingCart, path: '/sales/orders', color: 'text-red-600' },
    { label: 'Invoices', sub: 'Billing', icon: Receipt, path: '/sales/invoices', color: 'text-green-600' },
    { label: 'Sales Reports', sub: 'Summary & breakdowns', icon: BarChart3, path: '/reports/sales-summary', color: 'text-purple-600' },
  ];

  return (
    <MainLayout title="Sales" subtitle="Quotations, orders, invoices & reports">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Card key={t.label} className="cursor-pointer hover:shadow-md transition" onClick={() => navigate(t.path)}>
            <CardContent className="p-5 flex items-center gap-4">
              <t.icon className={`${t.color} flex-shrink-0`} size={32} />
              <div>
                <div className="text-lg font-semibold">{t.label}</div>
                <div className="text-sm text-muted-foreground">{t.sub}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </MainLayout>
  );
}
