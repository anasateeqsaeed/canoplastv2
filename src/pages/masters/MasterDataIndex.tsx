import { MainLayout } from '@/components/layout/MainLayout';
import { Link } from 'react-router-dom';
import {
  GitBranch,
  Ruler,
  Truck,
  CreditCard,
  Users,
  Factory,
  Package,
  Boxes,
} from 'lucide-react';

// Trimmed from v1's ~15-card index down to the masters that actually exist in
// v2 so far. The rest (Products, Rejections, Stop Reasons, etc.) land in later
// build phases and are intentionally left out here to avoid linking to pages
// that would 404.
const masterModules = [
  {
    title: 'Department Master',
    description: 'Departments and locations',
    icon: GitBranch,
    path: '/masters/departments',
    color: 'primary',
  },
  {
    title: 'Units of Measure',
    description: 'Measurement units used across masters and transactions',
    icon: Ruler,
    path: '/masters/units-of-measure',
    color: 'info',
  },
  {
    title: 'Delivery Terms',
    description: 'Packing + delivery cost presets for pricing',
    icon: Truck,
    path: '/masters/delivery-terms',
    color: 'info',
  },
  {
    title: 'Payment Terms',
    description: 'Advance/credit price adjustment presets',
    icon: CreditCard,
    path: '/masters/payment-terms',
    color: 'accent',
  },
  {
    title: 'Client Master',
    description: 'Customers, credit limits and consignees',
    icon: Users,
    path: '/masters/clients',
    color: 'primary',
  },
  {
    title: 'Supplier Master',
    description: 'Material, service and expense suppliers',
    icon: Factory,
    path: '/masters/suppliers',
    color: 'success',
  },
  {
    title: 'Material Master',
    description: 'Raw materials, grades and stock levels',
    icon: Package,
    path: '/masters/materials',
    color: 'warning',
  },
  {
    title: 'Product Master',
    description: 'Product catalog, categories & pricing',
    icon: Boxes,
    path: '/masters/products',
    color: 'accent',
  },
];

const colorMap: Record<string, string> = {
  primary: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
  accent: 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground',
  warning: 'bg-warning/10 text-warning',
  success: 'bg-success/10 text-success',
  info: 'bg-primary/10 text-primary',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

export default function MasterDataIndex() {
  return (
    <MainLayout title="Master Data" subtitle="Configure core system masters">
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {masterModules.map((module) => (
            <Link
              key={module.path}
              to={module.path}
              className="group bg-card rounded-xl border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/50"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl transition-colors ${colorMap[module.color]}`}>
                  <module.icon size={24} />
                </div>
              </div>
              <h3 className="font-bold text-foreground mb-1">{module.title}</h3>
              <p className="text-sm text-muted-foreground">{module.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
