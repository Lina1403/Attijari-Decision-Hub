import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { usePreferencesStore } from '@/stores/preferencesStore';
import { cn } from '@/utils/cn';

export default function DashboardShell() {
  const contentDensity = usePreferencesStore((state) => state.contentDensity);

  return (
    <div className="min-h-screen bg-page">
      <Sidebar />
      <div className="lg:pl-[280px]">
        <Topbar />
        <main
          className={cn(
            'min-w-0',
            contentDensity === 'compact' ? 'p-3 sm:p-4 xl:p-6' : 'p-4 sm:p-6 xl:p-8',
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
