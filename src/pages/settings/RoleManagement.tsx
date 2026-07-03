import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Grid3X3, History } from 'lucide-react';
import { RolesTab } from '@/components/settings/RolesTab';
import { PermissionMatrixTab } from '@/components/settings/PermissionMatrixTab';
import { RoleActivityTab } from '@/components/settings/RoleActivityTab';

export default function RoleManagement() {
  const [activeTab, setActiveTab] = useState('roles');

  return (
    <MainLayout title="Role Management" subtitle="Manage user roles and permissions">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Role & Permission Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Roles
                </TabsTrigger>
                <TabsTrigger value="matrix" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Permission Matrix
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Activity Log
                </TabsTrigger>
              </TabsList>

              <TabsContent value="roles">
                <RolesTab />
              </TabsContent>

              <TabsContent value="matrix">
                <PermissionMatrixTab />
              </TabsContent>

              <TabsContent value="activity">
                <RoleActivityTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
