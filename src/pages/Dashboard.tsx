import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <MainLayout title="Dashboard" subtitle="Canoplast ERP v2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            Welcome to Canoplast v2
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>
            The foundation is live: authentication, role-based access control, and the app shell.
            Module dashboards (Production Command Center, Executive/Ops views) land in Phase 7 once
            each module has real data to summarize.
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
