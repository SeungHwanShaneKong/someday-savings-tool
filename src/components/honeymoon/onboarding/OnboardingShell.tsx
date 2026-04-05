/**
 * [CL-HONEYMOON-REDESIGN-20260316] 온보딩 공통 레이아웃
 * 프로그레스바, 뒤로가기 버튼, step 영역 래퍼
 */

import { ArrowLeft, Home } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { OnboardingStep } from '@/hooks/useHoneymoonOnboarding';

// [CL-HOME-BTN-ALL-20260403-223000] onHome prop 추가
interface OnboardingShellProps {
  step: OnboardingStep;
  progress: number;
  onBack: () => void;
  onHome?: () => void;
  children: React.ReactNode;
}

// [CL-MECE-TEST-20260330] budget 제거(월드컵 완료 후 되돌리기 차단), loading 추가
// [CL-HONEYMOON-JOURNEY-20260405-180000] compare/plan 뒤로가기 허용
// [CL-SKIP-SCHEDULE-20260405-220000] schedule 제거
const BACK_ENABLED_STEPS: OnboardingStep[] = ['worldcup', 'loading', 'results', 'compare', 'plan'];

export function OnboardingShell({ step, progress, onBack, onHome, children }: OnboardingShellProps) {
  const showBack = BACK_ENABLED_STEPS.includes(step);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center px-4 h-14 max-w-lg mx-auto">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="이전 단계"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" /> /* spacer */
          )}
          <div className="flex-1 mx-4">
            <Progress
              value={progress}
              className="h-1.5 transition-all duration-500"
            />
          </div>
          {/* [CL-HOME-BTN-ALL-20260403-223000] 홈 버튼 (모든 단계) */}
          {onHome ? (
            <button
              onClick={onHome}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="홈으로"
            >
              <Home className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center px-4 overflow-y-auto">
        <div className="w-full max-w-lg animate-wc-step-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
