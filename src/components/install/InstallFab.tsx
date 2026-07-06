// [CL-PWA-A2HS-20260706-202600] 전역 플로팅 "홈 화면에 추가" 버튼 — 어느 페이지에서든 항상 접근 가능.
// 충돌 지도(실측): ChatFab=z-40 좌하단(로그인) · CoffeeFab=z-50 우하단(/budget 한정) · InstallPrompt 배너=z-40 하단 전폭(모바일).
//  → 우하단 z-40 배치, /budget 은 CoffeeFab 위로 수직 스택. 배너와 시간 배타(모바일 미억제=배너 소유 → FAB 숨김).
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInstallPromptSuppressed } from '@/hooks/usePWAInstall';
import { useInstallResolution } from '@/hooks/useInstallResolution';
import { InstallAppButton } from '@/components/install/InstallAppButton';

// 히어로·헤더가 프로미넌트 CTA 를 제공하는 라우트 → FAB 중복 억제(ChatFab 선례 준용)
const HIDDEN_PATHS = new Set(['/', '/auth']);

export function InstallFab() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const suppressed = useInstallPromptSuppressed();
  const { resolution, isStandalone } = useInstallResolution();

  // 이미 설치본이면 조기 종료(InstallAppButton 도 gating 하지만 위치 계산 낭비 방지)
  if (isStandalone) return null;
  // 표면 중복/배너 충돌 회피
  if (HIDDEN_PATHS.has(location.pathname)) return null;
  // 하단 배너(InstallPrompt)가 실제로 뜨는 경우에만 FAB 를 숨겨 겹침을 방지한다.
  // 배너 노출 조건 = 모바일 & 미억제 & (원터치 가능 OR iOS). 그 외(Android Firefox·인앱 등)는
  // 배너가 안 뜨므로 FAB 를 노출해 접근성을 보장한다. 데스크톱은 배너가 없어 항상 노출.
  const bannerWillShow = isMobile && !suppressed && (resolution.canOneTap || resolution.platform === 'ios');
  if (bannerWillShow) return null;

  const onBudget = location.pathname === '/budget';
  const positionClasses = cn(
    'fixed z-40',
    onBudget
      ? // CoffeeFab(우하단) 위로 수직 스택
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 sm:bottom-24 sm:right-6'
      : 'bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-3 sm:bottom-8 sm:right-6',
    'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300',
  );

  return <InstallAppButton placement="fab" className={positionClasses} />;
}
