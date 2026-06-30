import { useState, useEffect, useCallback, forwardRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
// [CL-ADSENSE-CONTENT-20260630] 홈 콘텐츠화 — 인기 가이드 카드용 아티클 레지스트리
import { ARTICLES } from '@/content/articles';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  ExternalLink,
  Copy,
  CheckCircle2,
  Sparkles,
  Calculator,
  CalendarCheck,
  Brain,
  MapPin,
  MessageCircle,
  Gift, // [CL-GIFT-CARD-20260418-240000]
} from 'lucide-react';
import Footer from '@/components/Footer';
import type { LucideIcon } from 'lucide-react';
import {
  getBrowserInfo,
  openInExternalBrowserWithFallback,
  copyToClipboard,
  getAppSpecificGuide,
} from '@/lib/kakao-browser';
import { useSEO } from '@/hooks/useSEO';
import { EXTERNAL_URLS, openExternalLink } from '@/lib/external-links'; // [CL-GIFT-CARD-20260418-240000]
// [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 이동 로딩 UX
import { AIExternalNavigationOverlay } from '@/components/AIExternalNavigationOverlay';
import { useAIExternalNavigation } from '@/hooks/useAIExternalNavigation';
// [CL-GAMIFY-INT-20260418-222329] 로그인 streak 노출
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { useStreak } from '@/hooks/useStreak';

/* ─── Feature Data ─── */
interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  isAI: boolean;
  gradient: string;
  iconColor: string;
  link?: string;
  externalLink?: string; // [CL-HONEYMOON-EXTERNAL-20260416-221500]
  // [CL-AI-EXTNAV-OVERLAY-20260418-205622] 존재 시 외부 이동 전 AI 로딩 오버레이 노출
  aiLoadingTitle?: string;
}

// [CL-GIFT-CARD-20260418-240000] 6개 카드 2×3 대칭 그리드 + 순서 재배치
const FEATURES: Feature[] = [
  {
    icon: Calculator,
    title: '예산 시뮬레이터',
    description: '카테고리별 비용 입력 → 평균과 비교 분석',
    isAI: false,
    gradient: 'from-blue-500/10 to-blue-600/5',
    iconColor: 'text-blue-500',
    link: '/budget',
  },
  {
    icon: CalendarCheck,
    title: 'D-day 체크리스트 AI',
    description: '결혼일 기준 AI 자동 생성 시기별 준비 리스트',
    isAI: true,
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconColor: 'text-emerald-500',
    link: '/checklist',
  },
  {
    icon: Gift,
    title: '선물 추천 AI',
    description: 'AI 기반 맞춤 선물 추천 + 예산별 큐레이션',
    isAI: true,
    gradient: 'from-pink-500/10 to-pink-600/5',
    iconColor: 'text-pink-500',
    externalLink: EXTERNAL_URLS.gift,
    aiLoadingTitle: 'AI가 완벽한 선물을 찾고 있어요', // [CL-AI-EXTNAV-OVERLAY-20260418-205622]
  },
  {
    icon: MapPin,
    title: 'AI 허니문 큐레이션',
    description: '취향 맞춤 여행지 AI 추천 + 지도 비교',
    isAI: true,
    gradient: 'from-amber-500/10 to-amber-600/5',
    iconColor: 'text-amber-500',
    externalLink: EXTERNAL_URLS.honeymoon,
    aiLoadingTitle: 'AI가 맞춤 여행지를 큐레이션하고 있어요', // [CL-AI-EXTNAV-OVERLAY-20260418-205622]
  },
  {
    icon: Brain,
    title: 'AI 비용 인사이트',
    description: '숨겨진 비용 경고 + 절약 팁 실시간 추천',
    isAI: true,
    gradient: 'from-violet-500/10 to-violet-600/5',
    iconColor: 'text-violet-500',
    link: '/budget',
  },
  {
    icon: MessageCircle,
    title: 'AI Q&A 챗봇',
    description: '결혼 준비 궁금증, AI에게 실시간 질문',
    isAI: true,
    gradient: 'from-rose-500/10 to-rose-600/5',
    iconColor: 'text-rose-500',
    link: '/chat',
  },
];

/* ─── Landing Page ─── */
export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useSEO({
    title: '웨딩셈 - 결혼 예산 계산기, 결혼 비용 계산기',
    description: '결혼 준비의 시작, 결혼 예산 관리부터 결혼 체크 리스트까지 스마트하게! 웨딩셈으로 복잡한 결혼 비용을 항목별로 깔끔하게 정리하세요. 스드메, 식대, 혼수까지 실시간 계산.',
    path: '/',
  });
  const [browserInfo] = useState(() => getBrowserInfo());
  const [showBridgeUI, setShowBridgeUI] = useState(false);
  const [copied, setCopied] = useState(false);

  // [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 카드 이동 대기 UX
  const { overlayProps, startNavigation } = useAIExternalNavigation();

  // [CL-GAMIFY-INT-20260418-222329] 로그인 streak 계산 (인증 시에만 활성화)
  const streak = useStreak();

  // 랜딩 페이지 진입 시 인앱 브라우저 감지 → 다중 탈출 전략 실행
  useEffect(() => {
    if (browserInfo.isInAppBrowser) {
      openInExternalBrowserWithFallback(
        window.location.href,
        () => setShowBridgeUI(true)
      );
    }
  }, [browserInfo.isInAppBrowser]);

  // [CL-AI-EXTNAV-OVERLAY-20260418-205622] 외부 AI 도메인 preconnect → 실제 이동 지연 200~400ms 단축
  useEffect(() => {
    const origins = [EXTERNAL_URLS.gift, EXTERNAL_URLS.honeymoon];
    const appended: HTMLLinkElement[] = [];
    origins.forEach((url) => {
      try {
        const origin = new URL(url).origin;
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        appended.push(link);
      } catch {
        // URL 파싱 실패 시 무시 (안전장치)
      }
    });
    return () => {
      appended.forEach((link) => {
        if (link.parentNode) link.parentNode.removeChild(link);
      });
    };
  }, []);

  const handleCopyUrl = useCallback(async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  const handleRetryBreakout = useCallback(() => {
    openInExternalBrowserWithFallback(
      window.location.href,
      () => setShowBridgeUI(true)
    );
  }, []);

  const handleStart = () => {
    if (user) {
      navigate('/budget');
    } else {
      navigate('/auth');
    }
  };

  const guide = getAppSpecificGuide(
    browserInfo.detectedApp,
    browserInfo.isIOS,
    browserInfo.isAndroid
  );

  // 인앱 브라우저 + 자동 전환 실패 → 브릿지 UI
  if (showBridgeUI && browserInfo.isInAppBrowser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-8">
        <div className="text-center max-w-sm w-full">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <ExternalLink className="w-10 h-10 text-primary" />
            </div>
          </div>

          <h1 className="text-xl font-semibold text-foreground mb-2">
            외부 브라우저에서 열어주세요
          </h1>
          <p className="text-muted-foreground mb-6 text-sm">
            {browserInfo.detectedApp
              ? `${browserInfo.detectedApp} 내`
              : '현재'}{' '}
            브라우저에서는 일부 기능이 제한됩니다.
            <br />
            아래 방법으로 {browserInfo.isIOS ? 'Safari' : 'Chrome'}에서
            접속해주세요.
          </p>

          <div className="space-y-3 mb-6">
            <Button onClick={handleRetryBreakout} className="w-full h-12">
              <ExternalLink className="w-4 h-4 mr-2" />
              외부 브라우저로 열기
            </Button>

            <Button
              variant="outline"
              onClick={handleCopyUrl}
              className="w-full h-12 border-2 border-primary/30"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
                  복사완료! 브라우저에 붙여넣기
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  URL 복사 후 Safari에 붙여넣기
                </>
              )}
            </Button>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-left">
            <p className="text-sm font-medium text-foreground mb-3">
              📱{' '}
              {browserInfo.detectedApp
                ? `${browserInfo.detectedApp}에서`
                : '직접'}{' '}
              여는 방법
            </p>
            <ol className="text-sm text-muted-foreground space-y-2">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 flex flex-col items-center px-6 pt-16 pb-12">
        {/* ─── Hero Section ─── */}
        <section className="flex flex-col items-center w-full max-w-lg">
          {/* Hero Icon */}
          <div
            className="animate-fade-up animate-float"
            style={{ animationDelay: '0s' }}
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-10 h-10 text-primary" aria-hidden="true" />
            </div>
          </div>

          {/* AI Badge */}
          <div
            className="animate-fade-up mb-6"
            style={{ animationDelay: '0.1s' }}
          >
            <Badge
              variant="outline"
              className="animate-shimmer bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 px-3 py-1"
              role="status"
            >
              <Sparkles
                className="w-3 h-3 mr-1.5 text-primary"
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-primary">
                AI 기반 웨딩 플래너
              </span>
            </Badge>
          </div>

          {/* Title */}
          <div
            className="text-center mb-4 space-y-1 animate-fade-up"
            style={{ animationDelay: '0.15s' }}
          >
            <p className="text-2xl sm:text-3xl font-medium text-muted-foreground tracking-wide">
              결혼 준비,
            </p>
            <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              꼼꼼한 셈 법
            </p>
            <h1 className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent tracking-tighter">
              웨딩셈
            </h1>
          </div>

          {/* Subtitle */}
          <p
            className="animate-fade-up text-sm sm:text-base text-muted-foreground text-center mb-10 max-w-xs leading-relaxed"
            style={{ animationDelay: '0.2s' }}
          >
            AI가 분석하고, 함께 준비하는
            <br />
            스마트 결혼 준비 플랫폼
          </p>
        </section>

        {/* ─── Feature Cards Section ─── */}
        <section
          className="w-full max-w-lg mb-10 animate-fade-up"
          style={{ animationDelay: '0.25s' }}
        >
          <h2 className="text-sm font-semibold text-muted-foreground text-center mb-4 tracking-wider uppercase">
            주요 기능
          </h2>
          {/* [CL-GIFT-CARD-20260418-240000] 6개 카드: 2×3 대칭 그리드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((feature, idx) => (
              <div key={feature.title} className={cn(idx === FEATURES.length - 1 && FEATURES.length % 2 === 1 && 'sm:col-span-2')}>
                <FeatureCard
                  feature={feature}
                  onNavigate={
                    // [CL-AI-EXTNAV-OVERLAY-20260418-205622] 외부 이동 + AI 로딩 Opt-in
                    feature.externalLink && feature.aiLoadingTitle
                      ? () =>
                          startNavigation({
                            url: feature.externalLink!,
                            title: feature.aiLoadingTitle!,
                          })
                      : feature.externalLink
                        ? () => openExternalLink(feature.externalLink!)
                        : feature.link
                          ? () => navigate(feature.link!)
                          : undefined
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* ─── Social Proof ─── */}
        <div
          className="w-full max-w-lg mb-10 animate-fade-up"
          style={{ animationDelay: '0.35s' }}
        >
          <div className="bg-secondary/50 rounded-2xl py-4 px-6 flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                5,000+
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                실제 비용 데이터
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              <p className="text-lg sm:text-2xl font-bold text-foreground">
                6개
              </p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                AI 기능
              </p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center flex-1">
              {/* [CL-GAMIFY-INT-20260418-222329] 로그인 streak 노출 — 로그인 유저만 */}
              {user && !streak.isLoading && streak.loginStreakDays > 0 ? (
                <div className="flex flex-col items-center justify-center gap-1">
                  <StreakFlame
                    days={streak.loginStreakDays}
                    variant="login"
                    size="sm"
                  />
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    연속 로그인
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-lg sm:text-2xl font-bold text-primary">무료</p>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    평생 비용
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ─── CTA Section ─── */}
        <div
          className="w-full max-w-sm animate-fade-up"
          style={{ animationDelay: '0.4s' }}
        >
          <Button
            onClick={handleStart}
            disabled={loading}
            size="lg"
            className={cn(
              'w-full h-16 text-lg font-bold rounded-xl',
              'bg-gradient-to-r from-blue-700 to-blue-600',
              'text-white',
              'shadow-primary-glow',
              'hover:shadow-primary-glow-lg',
              'hover:scale-[1.02]',
              'active:scale-[0.98]',
              'transition-all duration-200 ease-out',
              'animate-pulse-subtle'
            )}
          >
            {loading
              ? '로딩 중...'
              : user
                ? '예산 관리하기'
                : '무료로 시작하기'}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-3">
            30초면 시작할 수 있어요 · 카드 등록 없음
          </p>

          {!loading && !user && (
            <button
              onClick={() => navigate('/auth')}
              className="mt-3 w-full text-sm text-muted-foreground hover:text-primary transition-colors text-center"
            >
              이미 계정이 있으신가요?
            </button>
          )}
        </div>

        {/* ─── [CL-ADSENSE-CONTENT-20260630] 공개 콘텐츠 섹션 (비로그인·크롤 가능·프리렌더) ─── */}
        <section className="w-full max-w-lg mt-16 animate-fade-up" style={{ animationDelay: '0.45s' }}>
          {/* 서비스 설명(실텍스트) */}
          <h2 className="text-xl font-bold text-foreground mb-3">웨딩셈은 결혼 준비를 이렇게 도와드려요</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            결혼 준비는 정보 비대칭이 큰 영역입니다. "결혼 비용이 얼마"라는 숫자는 신혼집 포함 여부에 따라 수천만 원에서 수억 원까지
            갈리고, 무엇을 언제부터 해야 할지도 막막합니다. 웨딩셈은 <strong className="text-foreground">공개 통계와 실제 견적 사례</strong>를
            바탕으로 항목별 예산을 투명하게 계획하고, D-day 기준 체크리스트와 AI 상담으로 준비 과정을 단계별로 안내합니다.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            아래는 한국소비자원·통계청·결혼정보회사의 공개 자료로 정리한 결혼 비용 개요입니다. 모든 수치는 범위로 보고
            지역·시기·업체에 따라 달라질 수 있으니, 자세한 산정 기준은 <Link to="/guide/wedding-cost-data/" className="text-primary hover:underline">결혼 비용 데이터·방법론</Link> 페이지를 참고하세요.
          </p>

          {/* 결혼 비용 한눈에 (실데이터 스냅샷) */}
          <h3 className="text-base font-semibold text-foreground mb-3">결혼 비용 한눈에 (공개 자료 기준)</h3>
          <div className="overflow-x-auto mb-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-foreground border-b border-border py-2 px-2">항목</th>
                  <th className="text-left font-semibold text-foreground border-b border-border py-2 px-2">평균 (개요)</th>
                  <th className="text-left font-semibold text-foreground border-b border-border py-2 px-2 whitespace-nowrap">자료</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['결혼식 비용(예식장+스드메)', '약 2,074만 원', '한국소비자원'],
                  ['신혼집 제외 결혼 비용', '약 5,765만 원', '듀오 2024'],
                  ['신혼집 포함 총비용', '약 3억 6,173만 원', '듀오 2024'],
                  ['하객 1인 식대(중간값)', '약 5만 8천 원', '한국소비자원'],
                  ['평균 하객 수', '약 279명', '듀오'],
                  ['평균 축의금', '약 11만 7천 원', 'NH농협 2025'],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td className="text-muted-foreground border-b border-border/50 py-2 px-2 align-top">{r[0]}</td>
                    <td className="text-foreground border-b border-border/50 py-2 px-2 align-top font-medium tabular-nums">{r[1]}</td>
                    <td className="text-muted-foreground border-b border-border/50 py-2 px-2 align-top whitespace-nowrap">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/70 mb-8">
            ※ 신혼집이 전체 비용의 약 84%를 차지합니다(듀오 2024). 출처와 산정 기준은 각 가이드 하단 "참고 자료"에 표기합니다.
          </p>

          {/* 인기 가이드 카드 */}
          <h3 className="text-base font-semibold text-foreground mb-3">인기 결혼 준비 가이드</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {ARTICLES.slice(0, 6).map((a) => (
              <Link
                key={a.slug}
                to={`/guide/${a.slug}/`}
                className="block p-4 rounded-xl bg-card border border-border/50 hover:border-primary/40 transition-colors"
              >
                <p className="text-sm font-semibold text-foreground mb-1 leading-snug">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{a.description}</p>
              </Link>
            ))}
          </div>
          <Link to="/guide/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
            결혼 예산 가이드 전체 보기 →
          </Link>

          {/* FAQ 프리뷰 */}
          <h3 className="text-base font-semibold text-foreground mb-3 mt-4">자주 묻는 질문</h3>
          <div className="space-y-2 mb-3">
            {[
              ['결혼 비용은 보통 얼마인가요?', '신혼집을 제외한 결혼식·혼수 비용은 평균 약 2,100만~7,700만 원 범위이며, 신혼집을 포함하면 수도권 기준 수억 원에 이릅니다. 하객 규모와 신혼집 마련 방식이 총비용을 크게 좌우합니다.'],
              ['결혼 준비는 무엇부터 시작하나요?', '예식일과 총예산을 먼저 정한 뒤 예식장 → 스드메 → 혼수·예단 순으로 진행하는 것이 일반적입니다. 웨딩셈의 D-day 체크리스트가 시기별 할 일을 자동으로 안내합니다.'],
              ['스드메 비용은 어느 정도인가요?', '스튜디오·드레스·메이크업 패키지는 구성에 따라 차이가 크며, 한국소비자원 참가격 기준 전국 중간값은 약 292만 원 수준입니다. 헬퍼비·교통비 등 숨은 비용까지 견적서로 비교하는 것이 중요합니다.'],
            ].map((qa) => (
              <details key={qa[0]} className="group bg-card border border-border/50 rounded-xl px-4 py-3">
                <summary className="text-sm font-semibold text-foreground cursor-pointer list-none">{qa[0]}</summary>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">{qa[1]}</p>
              </details>
            ))}
          </div>
          <Link to="/faq/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            자주 묻는 질문 더 보기 →
          </Link>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <Footer />

      {/* [CL-AI-EXTNAV-OVERLAY-20260418-205622] AI 외부 이동 로딩 오버레이 */}
      <AIExternalNavigationOverlay {...overlayProps} />
    </div>
  );
}

/* ─── Feature Card Component ─── */
// [FIX-20260418-051200] forwardRef 적용 — Landing의 ref 경고 해소
const FeatureCard = forwardRef<HTMLDivElement, { feature: Feature; onNavigate?: () => void }>(function FeatureCard({ feature, onNavigate }, ref) {
  const Icon = feature.icon;

  return (
    <Card
      ref={ref}
      className={cn(
        'p-4 transition-all duration-200 hover:shadow-toss hover:scale-[1.02]',
        feature.isAI && 'ai-glow border-primary/20',
        onNavigate && 'cursor-pointer'
      )}
      role="article"
      onClick={onNavigate}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0',
            feature.gradient
          )}
        >
          <Icon
            className={cn('w-5 h-5', feature.iconColor)}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-sm font-semibold text-foreground leading-tight">
              {feature.title}
            </h3>
            {feature.isAI && (
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary border-0 px-1.5 py-0 text-[10px] font-medium leading-tight"
              >
                AI
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
          {onNavigate && (
            <p className="text-xs text-primary font-medium mt-1.5">
              체험하기 →
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});
