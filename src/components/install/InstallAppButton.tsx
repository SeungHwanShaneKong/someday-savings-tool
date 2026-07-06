// [CL-PWA-A2HS-20260706-202520] 코어 "홈 화면/바탕화면 바로가기" 버튼 — 5개 표면(헤더·푸터·히어로·플로팅·배너)이
// 공유하는 단일 진실. isStandalone 이면 전 표면 자동 소멸. 클릭 시 원터치(promptInstall) 또는 안내 모달.
import { useCallback, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useInstallResolution } from '@/hooks/useInstallResolution';
import { InstallGuideDialog } from '@/components/install/InstallGuideDialog';
import { trackFunnel } from '@/lib/analytics/funnel-events';

export type InstallPlacement = 'header' | 'footer' | 'hero' | 'fab';

interface InstallAppButtonProps {
  placement: InstallPlacement;
  className?: string;
}

const ARIA_LABEL = '홈 화면에 웨딩셈 추가';

export function InstallAppButton({ placement, className }: InstallAppButtonProps) {
  const { resolution, isStandalone, promptInstall } = useInstallResolution();
  const [guideOpen, setGuideOpen] = useState(false);
  const inFlight = useRef(false);

  const handleClick = useCallback(async () => {
    if (inFlight.current) return; // 연타/다표면 동시클릭 재진입 차단
    inFlight.current = true;
    try {
      trackFunnel('pwa_install_cta_click', { placement, platform: resolution.platform });
      if (resolution.canOneTap) {
        const outcome = await promptInstall();
        if (outcome === 'accepted') {
          trackFunnel('pwa_install_accepted', { placement });
        } else if (outcome === 'dismissed') {
          trackFunnel('pwa_install_dismissed', { placement });
        } else {
          // 이벤트 이미 소진 등 → 수동 안내로 폴백
          setGuideOpen(true);
        }
      } else {
        setGuideOpen(true);
      }
    } finally {
      inFlight.current = false;
    }
  }, [placement, resolution.canOneTap, resolution.platform, promptInstall]);

  // 이미 설치본(standalone)으로 실행 중이면 모든 설치 유도 표면을 숨긴다.
  if (isStandalone) return null;

  const dialog = (
    <InstallGuideDialog open={guideOpen} onOpenChange={setGuideOpen} resolution={resolution} />
  );

  if (placement === 'footer') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors',
            className,
          )}
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          홈 화면에 앱 추가
        </button>
        {dialog}
      </>
    );
  }

  if (placement === 'hero') {
    return (
      <>
        <Button
          variant="outline"
          onClick={handleClick}
          aria-label={ARIA_LABEL}
          className={cn(
            'mt-3 w-full h-11 rounded-xl border-wedding-rose/30 text-foreground hover:bg-wedding-rose-soft/60 gap-2',
            className,
          )}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          홈 화면에 바로가기 추가
        </Button>
        {dialog}
      </>
    );
  }

  if (placement === 'fab') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          aria-label={ARIA_LABEL}
          className={cn(
            'group flex items-center gap-2 rounded-full pl-4 pr-5 py-3 sm:py-3.5',
            'bg-gradient-to-r from-wedding-rose to-primary text-white font-medium text-sm',
            'shadow-[0_4px_20px_-4px_hsl(var(--wedding-rose)/0.5)]',
            'hover:shadow-[0_8px_30px_-4px_hsl(var(--wedding-rose)/0.6)] hover:scale-105 active:scale-95',
            'transition-all duration-200 ease-out',
            className,
          )}
        >
          <Download className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span className="whitespace-nowrap hidden sm:inline">홈 화면에 추가</span>
        </button>
        {dialog}
      </>
    );
  }

  // placement === 'header' — ThemeToggle 옆 고스트 버튼(데스크톱 텍스트·모바일 아이콘)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        aria-label={ARIA_LABEL}
        className={cn('gap-1.5 px-2 sm:px-3', className)}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">홈 화면 추가</span>
      </Button>
      {dialog}
    </>
  );
}
