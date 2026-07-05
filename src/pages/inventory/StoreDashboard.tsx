import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStorageLocations } from '@/hooks/useStorageLocations';
import { useMaterialIssues } from '@/hooks/useMaterialIssues';
import { useMaterialReturns } from '@/hooks/useMaterialReturns';
import { useMaterialLots } from '@/hooks/useMaterialLots';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ArrowRightLeft, ArrowDownToLine, AlertTriangle, MapPin } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const ZONE_CONFIG = [
  { zone: 'raw_material', subZone: 'injection', label: 'Injection RM', color: 'bg-blue-500' },
  { zone: 'raw_material', subZone: 'blow', label: 'Blow RM', color: 'bg-green-500' },
  { zone: 'raw_material', subZone: 'masterbatch', label: 'Masterbatch', color: 'bg-purple-500' },
  { zone: 'raw_material', subZone: 'filler', label: 'Filler', color: 'bg-orange-500' },
  { zone: 'regrind', subZone: null, label: 'Regrind', color: 'bg-yellow-500' },
  { zone: 'compound', subZone: null, label: 'Compound', color: 'bg-cyan-500' },
];

export default function StoreDashboard() {
  const navigate = useNavigate();
  const { zoneSummary, isLoading: locationsLoading } = useStorageLocations();
  const { pendingCount: pendingIssues } = useMaterialIssues();
  const { pendingCount: pendingReturns } = useMaterialReturns();
  const lotsQuery = useMaterialLots();
  const lots = lotsQuery.data || [];

  // Count GRNs awaiting put-away (passed inspection, no storage_location_id)
  const pendingPutAway = lots.filter(lot => 
    lot.inspection_status === 'passed' && !lot.storage_location
  ).length;

  const getZoneSummaryData = (zone: string, subZone: string | null) => {
    const match = zoneSummary.find(s => 
      s.zone === zone && (subZone ? s.sub_zone === subZone : true)
    );
    return match || { total_capacity: 0, total_stock: 0, count: 0 };
  };

  return (
    <MainLayout title="Store Dashboard" subtitle="Warehouse stock overview and pending actions">
      {/* Pending Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
                  <Package className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GRN Awaiting Put-Away</p>
                  <p className="text-2xl font-bold">{pendingPutAway}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/inventory/raw-materials')}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Issues</p>
                  <p className="text-2xl font-bold">{pendingIssues}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/inventory/material-issue')}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                  <ArrowDownToLine className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Returns</p>
                  <p className="text-2xl font-bold">{pendingReturns}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/inventory/material-return')}>
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Summary Cards */}
      <h2 className="text-lg font-semibold mb-4">Zone-wise Stock Summary</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {locationsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          ZONE_CONFIG.map(config => {
            const data = getZoneSummaryData(config.zone, config.subZone);
            const utilization = data.total_capacity > 0 
              ? Math.round((data.total_stock / data.total_capacity) * 100)
              : 0;
            const isHighUtilization = utilization > 80;

            return (
              <Card key={`${config.zone}-${config.subZone}`} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/inventory/stock-position')}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      {config.label}
                    </CardTitle>
                    {isHighUtilization && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        High
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock</span>
                      <span className="font-medium">{data.total_stock.toFixed(0)} kg</span>
                    </div>
                    <Progress value={utilization} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{utilization}% utilized</span>
                      <span>Cap: {data.total_capacity.toFixed(0)} kg</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {data.count} locations
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/inventory/material-issue')}>
          <ArrowRightLeft className="h-6 w-6" />
          <span>New Issue</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/inventory/material-return')}>
          <ArrowDownToLine className="h-6 w-6" />
          <span>New Return</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/inventory/stock-position')}>
          <MapPin className="h-6 w-6" />
          <span>Stock Position</span>
        </Button>
        <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate('/inventory/raw-materials')}>
          <Package className="h-6 w-6" />
          <span>Material GRN</span>
        </Button>
      </div>
    </MainLayout>
  );
}
