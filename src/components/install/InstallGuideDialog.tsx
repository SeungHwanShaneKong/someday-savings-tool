// [CL-PWA-A2HS-20260706-202500] 플랫폼별 "홈 화면/바탕화면 추가" 수동 안내 모달.
// 원터치(installable) 불가한 환경(iOS·맥 Safari·Firefox·인앱·기타)에서 클릭 시 열린다.
// CoffeeDonationModal 의 웜톤 그라디언트 헤더 패턴을 재사용해 브랜드 일관성 유지.
import { useEffect, Fragment } from 'react';
import { Share, Download, MoreVertical, Globe, ArrowDownToLine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { INSTALL_GUIDES, type InstallResolution, type InstallGuideIcon } from '@/lib/pwa/install-platform';
import { downloadDesktopShortcut } from '@/lib/pwa/desktop-shortcut';
import { trackFunnel } from '@/lib/analytics/funnel-events';

const ICON_MAP: Record<InstallGuideIcon, typeof Share> = {
  share: Share,
  download: Download,
  menu: MoreVertical,
  browser: Globe,
};

/** **굵게** 마크업을 <strong> 로 렌더 (안내 단계 강조) */
function renderEmphasis(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-foreground">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

interface InstallGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resolution: InstallResolution;
}

export function InstallGuideDialog({ open, onOpenChange, resolution }: InstallGuideDialogProps) {
  const { platform, os, canDownloadShortcut } = resolution;

  // 열릴 때 1회 노출 계측 (installable 은 다이얼로그를 안 여니 제외)
  useEffect(() => {
    if (open && platform !== 'installable') {
      trackFunnel('pwa_install_guide_shown', { platform });
    }
  }, [open, platform]);

  if (platform === 'installable') return null;
  const guide = INSTALL_GUIDES[platform];
  const Icon = ICON_MAP[guide.icon];

  const handleDownload = () => {
    if (os !== 'windows' && os !== 'macos') return;
    downloadDesktopShortcut(os);
    trackFunnel('pwa_install_shortcut_download', { os });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* 웜톤 그라디언트 헤더 */}
        <div className="bg-gradient-to-br from-wedding-rose/15 via-wedding-rose-soft/40 to-primary/5 px-6 pt-6 pb-5">
          <DialogHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wedding-rose/20">
              <Icon className="h-6 w-6 text-wedding-rose" aria-hidden="true" />
            </div>
            <DialogTitle className="text-lg">{guide.title}</DialogTitle>
            <DialogDescription className="sr-only">
              현재 브라우저에서 웨딩셈을 홈 화면 또는 바탕화면에 추가하는 방법 안내
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* 단계 안내 */}
        <div className="px-6 pb-6 pt-1">
          <ol className="space-y-3">
            {guide.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{renderEmphasis(step)}</span>
              </li>
            ))}
          </ol>

          {canDownloadShortcut && (
            <Button variant="outline" className="mt-5 w-full h-11 rounded-xl" onClick={handleDownload}>
              <ArrowDownToLine className="mr-2 h-4 w-4" aria-hidden="true" />
              바탕화면 바로가기 파일 내려받기
            </Button>
          )}
          {canDownloadShortcut && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
              내려받은 파일을 바탕화면으로 옮기면 바로가기가 완성돼요
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
