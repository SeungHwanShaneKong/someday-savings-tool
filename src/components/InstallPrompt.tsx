// [CL-TOP20-P5-PWA-20260703-050000] PWA 설치 유도 배너 — 모바일 하단 고정, 닫기 시 30일 억제, iOS 는 수동 안내
// 마운트는 PM(App.tsx)이 담당 — 여기서는 export 만.
import { useCallback, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  usePWAInstall,
  isInstallPromptSuppressed,
  rememberInstallPromptDismissed,
} from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const isMobile = useIsMobile();
  const { isInstallable, isIOS, isStandalone, promptInstall } = usePWAInstall();
  // 마운트 시 1회만 억제 여부 판정(lazy init) — 렌더마다 localStorage 재조회 방지
  const [dismissed, setDismissed] = useState<boolean>(() => isInstallPromptSuppressed());

  const handleDismiss = useCallback(() => {
    rememberInstallPromptDismissed();
    setDismissed(true);
  }, []);

  const handleInstall = useCallback(async () => {
    const outcome = await promptInstall();
    // 네이티브 프롬프트에서 거절해도 같은 30일 억제 적용(반복 노출 방지)
    if (outcome === 'dismissed') rememberInstallPromptDismissed();
    setDismissed(true);
  }, [promptInstall]);

  if (!isMobile || isStandalone || dismissed) return null;
  // 미지원 브라우저(이벤트 미발생·iOS 아님)는 렌더하지 않음
  if (!isInstallable && !isIOS) return null;

  return (
    <aside
      aria-label="웨딩셈 앱 설치 안내"
      // [CL-MODAL-COORD-20260703-140000] z-40 로 낮춤 — 모달 Dialog(z-50)가 항상 위에 오게 해
      //   설치 배너가 열린 모달의 버튼을 가리는 스택 충돌을 원천 차단(모달 열림 시 배경 inert).
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
    >
      {isInstallable ? (
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">홈 화면에 추가하고 빠르게 열기</p>
            <p className="text-xs text-muted-foreground">앱처럼 한 번에 실행할 수 있어요</p>
          </div>
          <Button size="sm" className="h-10 flex-shrink-0 px-4" onClick={handleInstall}>
            설치
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 flex-shrink-0 text-muted-foreground"
            onClick={handleDismiss}
            aria-label="설치 안내 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <SquarePlus className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="text-sm font-semibold">홈 화면에 추가하고 빠르게 열기</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Safari 하단의 공유
              <Share className="mx-0.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
              버튼을 누른 뒤 <span className="font-medium text-foreground">‘홈 화면에 추가’</span>를
              선택하세요.
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 flex-shrink-0 text-muted-foreground"
            onClick={handleDismiss}
            aria-label="설치 안내 닫기"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      )}
    </aside>
  );
}
