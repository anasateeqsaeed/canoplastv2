import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { RefreshButton } from './RefreshButton';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface MainLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function MainLayout({ children, title, subtitle, actions }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen h-screen bg-background flex">
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="md:ml-64 transition-all duration-300 flex flex-col flex-1 h-screen overflow-hidden w-full">
        <Header title={title} subtitle={subtitle}>
          <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </Button>
        </Header>

        <div className="px-4 md:px-6 py-2 border-b border-border bg-card/30 flex justify-end items-center gap-2">
          <RefreshButton size="sm" />
          {actions}
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-auto">
          <div className="p-3 md:p-6 md:min-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
