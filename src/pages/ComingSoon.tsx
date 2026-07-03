import { MainLayout } from '@/components/layout/MainLayout';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  subtitle: string;
}

export default function ComingSoon({ title, subtitle }: ComingSoonProps) {
  return (
    <MainLayout title={title} subtitle={subtitle}>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Construction size={48} className="text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          This module is scheduled in a later build phase. Check the project plan for when it lands.
        </p>
      </div>
    </MainLayout>
  );
}
