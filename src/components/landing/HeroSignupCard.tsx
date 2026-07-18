// [CL-LOGIN-GATE-20260709-233447 | by:frontend-engineer]
// HeroSignupCard — 비로그인 랜딩 히어로 가입 카드(구 LandingBudgetSimulator 슬롯).
// 구성: ① 논인터랙티브 미니 엑셀 요약(카테고리 소계·sample-budget 단일소스·recharts 금지)
//       ② Google 직접 로그인 주 CTA(랜딩에서 signInWithGoogle 즉시 호출)
//       ③ 신뢰 칩 3종(TrustChips 공용) ④ "다른 방법으로 시작" 보조 링크(/auth).
// 인앱 브라우저(카카오 등)에서는 OAuth 가 차단되므로 Landing 의 기존 탈출 플로우로 우회한다.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { trackFunnel } from '@/lib/analytics/funnel-events';
import { TrustChips } from '@/components/auth/TrustChips';
import { formatKoreanWon } from '@/lib/budget-categories';
import { buildSampleBudget, sampleBudgetTotal } from '@/lib/sample-budget';

/* ─── [CL-HERO-SUMMARY-20260718-153000] 미니 엑셀 요약(예시) — 실데이터 단일소스(sample-budget) 파생·하드코딩 0.
   카테고리 소계만 표시(서브항목 28개 상세는 로그인 후·아래 전체표) · 큰 금액 먼저 · 총액=전체표와 동일(6,496만원). ─── */
const SUMMARY = [...buildSampleBudget()].sort((a, b) => b.subtotal - a.subtotal);
const SUMMARY_TOTAL = sampleBudgetTotal(SUMMARY);

interface HeroSignupCardProps {
  /** 인앱 브라우저(카카오 등) 여부 — true 면 Google 직접 로그인 대신 외부 브라우저 탈출 플로우로 우회 */
  isInAppBrowser: boolean;
  /** 인앱 브라우저에서 CTA 클릭 시 실행할 탈출 핸들러(Landing 의 기존 브리지 플로우 재사용) */
  onInAppEscape: () => void;
  className?: string;
}

export function HeroSignupCard({ isInAppBrowser, onInAppEscape, className }: HeroSignupCardProps) {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    trackFunnel('landing_hero_cta_click', { method: 'google_direct' });
    // 인앱 브라우저에서는 Google OAuth 가 차단됨 → 기존 외부 브라우저 탈출 플로우로 우회
    if (isInAppBrowser) {
      onInAppEscape();
      return;
    }
    if (isGoogleLoading) return; // 더블서밋 동기 게이트
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Google 로그인 실패',
          description: error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAltSignIn = () => {
    trackFunnel('landing_hero_cta_click', { method: 'auth_page' });
    navigate('/auth');
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-wedding-rose/20 bg-card p-5 shadow-toss',
        className,
      )}
    >
      {/* 헤딩 */}
      <h2 className="text-lg font-bold text-foreground text-center mb-1">
        5초 만에 시작하는 우리 결혼 예산
      </h2>
      <p className="text-xs text-muted-foreground text-center mb-4">
        로그인하면 이런 예산표가 바로 만들어져요
      </p>

      {/* ─── 미니 엑셀 요약(정적·읽기전용) — 카테고리 소계 + 총액. 데이터 = sample-budget 단일소스. ─── */}
      <div className="rounded-xl border border-border/60 bg-secondary/40 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">
            내 결혼 예산 한눈에
          </p>
          <Badge
            variant="secondary"
            className="bg-primary/10 text-primary border-0 px-1.5 py-0 text-[10px] font-medium leading-tight"
          >
            예시
          </Badge>
        </div>
        {/* 2열 미니 엑셀 표(카테고리 | 예상금액) — 가로 오버플로 0 → 모바일~데스크톱 전 기기 안전 */}
        <Table aria-label="예시 예산 요약">
          <TableBody>
            {SUMMARY.map((cat) => (
              <TableRow key={cat.id} className="border-border/40 hover:bg-transparent">
                <TableCell className="py-1.5 pl-0 text-xs font-medium text-foreground break-keep">
                  <span className="mr-1.5" aria-hidden="true">{cat.icon}</span>
                  {cat.name}
                </TableCell>
                <TableCell className="py-1.5 pr-0 text-right text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                  {formatKoreanWon(cat.subtotal)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="mt-3 pt-3 border-t border-border/50 flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">총 예상</span>
          <span className="text-base font-bold text-foreground tabular-nums">
            {formatKoreanWon(SUMMARY_TOTAL)}
          </span>
        </div>
      </div>

      {/* ─── 주 CTA — Google 직접 로그인 (Auth.tsx handleGoogleSignIn 미러) ─── */}
      <Button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        aria-busy={isGoogleLoading}
        className="w-full h-12 text-base font-semibold rounded-xl flex items-center justify-center gap-2.5"
      >
        {/* Google 로고 — Auth.tsx 인라인 SVG 재사용(currentColor) */}
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {isGoogleLoading ? '연결 중...' : 'Google로 5초 만에 시작'}
      </Button>

      {/* ─── 신뢰 칩 + 개인정보 안내(공용 TrustChips) ─── */}
      <TrustChips className="mt-4" />

      {/* ─── 보조 경로 — /auth 페이지로 ─── */}
      <button
        type="button"
        onClick={handleAltSignIn}
        className="mt-3 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md py-1"
      >
        다른 방법으로 시작
      </button>
    </div>
  );
}
