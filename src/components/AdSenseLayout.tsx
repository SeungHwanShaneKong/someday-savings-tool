import { ReactNode } from 'react';
import { AdSenseSidebar } from './AdSenseSidebar';

interface AdSenseLayoutProps {
  children: ReactNode;
}

export function AdSenseLayout({ children }: AdSenseLayoutProps) {
  return (
    <div className="flex justify-center w-full min-h-screen">
      {/* Left ad gutter - hidden below 1280px */}
      <aside className="hidden xl:flex flex-col items-end w-[160px] flex-shrink-0 sticky top-0 h-screen pt-24 pr-6">
        <AdSenseSidebar className="w-[130px]" />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 max-w-6xl">
        {children}
      </div>

      {/* Right ad gutter - hidden below 1280px */}
      <aside className="hidden xl:flex flex-col items-start w-[160px] flex-shrink-0 sticky top-0 h-screen pt-24 pl-6">
        <AdSenseSidebar className="w-[130px]" />
      </aside>
    </div>
  );
}
