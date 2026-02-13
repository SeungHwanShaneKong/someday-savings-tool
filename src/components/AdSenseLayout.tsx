import { ReactNode } from 'react';
import { AdSenseSidebar } from './AdSenseSidebar';

interface AdSenseLayoutProps {
  children: ReactNode;
}

export function AdSenseLayout({ children }: AdSenseLayoutProps) {
  return (
    <div className="flex justify-center w-full min-h-screen overflow-x-hidden">
      {/* Left ad gutter - visible only on wide screens (≥1280px) */}
      <aside
        className="hidden xl:block w-[160px] flex-shrink-0"
        aria-label="Advertisement left"
      >
        <div className="sticky top-24 pt-4 pr-6">
          <AdSenseSidebar className="w-[130px]" />
        </div>
      </aside>

      {/* Main content - takes full available width, capped at max-w-6xl */}
      <div className="flex-1 min-w-0 max-w-6xl w-full">
        {children}
      </div>

      {/* Right ad gutter - visible only on wide screens (≥1280px) */}
      <aside
        className="hidden xl:block w-[160px] flex-shrink-0"
        aria-label="Advertisement right"
      >
        <div className="sticky top-24 pt-4 pl-6">
          <AdSenseSidebar className="w-[130px]" />
        </div>
      </aside>
    </div>
  );
}
