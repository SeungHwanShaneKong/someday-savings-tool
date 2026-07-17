import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';
import { BudgetDonutChart } from '@/components/BudgetDonutChart';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { Button } from '@/components/ui/button';
import { Home, Lock, Sparkles, ArrowLeft } from 'lucide-react'; // [CL-HOME-BTN-20260315-140000]
import { useAuth } from '@/hooks/useAuth';
// [CL-SHARE-P1-20260717-170000] 공유 카드 P1 — 등급 히어로·호기심 CTA·바이럴 계측(설계 §2.3·§4.1)
import { ShareGradeCard } from '@/components/budget/ShareGradeCard';
import { computeShareGrade, type ShareGradeItem } from '@/lib/share-grade';
import { trackFunnel, trackFunnelOnce } from '@/lib/analytics/funnel-events';

interface BudgetItem {
  id: string;
  budget_id: string;
  category: string;
  sub_category: string;
  amount: number;
  is_paid: boolean;
  notes: string | null;
}

interface SharedBudgetData {
  items: BudgetItem[];
  budgetOwnerId: string | null;
}

// [CL-SHARE-P1-20260717-170000] get_shared_budget_items_by_token RPC 행 형태(any 제거용 명시 계약).
//  amount 는 Postgres numeric 이 문자열로 올 수 있어 unknown 폭으로 받고 호출측에서 Number 정규화.
interface SharedBudgetRow {
  budget_id: string;
  category: string;
  sub_category: string;
  amount: number | string | null;
  is_paid: boolean | null;
  notes: string | null;
  budget_owner_id: string | null;
}

export default function SharedBudget() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  // [CL-SHARE-AUDIT-D4-20260717-190000] loading 구독 필수 — AuthProvider 는 user=null·loading=true 로
  //  출발해 getSession() 완료 후에야 user 를 확정한다. loading 을 무시하면 인증 미확정 윈도우에서
  //  '소유자 제외' 가드와 has_session 이 무력화돼(소유자 자기열람이 바이럴로 계측·has_session 항상 false)
  //  K-factor 가 오염된다. 기존 확립 패턴 [CL-AUDIT2-R2-AUTHGATE-20260628](usePageTracking) 동일 적용.
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<SharedBudgetData>({ items: [], budgetOwnerId: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSEO({
    title: '공유 예산표 - 웨딩셈',
    description: '공유된 결혼 예산표를 확인하세요. 항목별 비용과 총 예산을 한눈에 볼 수 있습니다.',
    path: `/shared/${token || ''}`,
    // [CL-SHARE-P1-20260717-170000] SEO 중복 콘텐츠 가드(설계 §6) — 토큰별 무한 URL 색인 차단.
    //  robots.txt Disallow: /shared/ 는 기존 존재하나, 이미 색인된 URL 을 내리려면 noindex 메타가 필요.
    noindex: true,
  });

  const isOwner = user && data.budgetOwnerId && user.id === data.budgetOwnerId;

  useEffect(() => {
    const fetchSharedBudget = async () => {
      if (!token) {
        setError('잘못된 링크예요');
        setLoading(false);
        return;
      }

      try {
        // Get the shared budget items using secure RPC function
        // This function bypasses RLS and returns items for valid share tokens
        const { data: budgetItems, error: itemsError } = await supabase
          .rpc('get_shared_budget_items_by_token', { p_share_token: token });

        if (itemsError) throw itemsError;
        
        if (!budgetItems || budgetItems.length === 0) {
          setError('공유 링크가 만료되었거나 존재하지 않아요');
          setLoading(false);
          return;
        }

        // Map the RPC response to match BudgetItem interface
        // [CL-SHARE-P1-20260717-170000] lint: no-explicit-any 해소 — RPC 행 형태를 명시(동작 불변).
        //  amount 는 방어적 Number 정규화(RPC numeric → 문자열 가능성) — 등급 산출이 NaN 오염되지 않도록.
        const mappedItems: BudgetItem[] = (budgetItems as SharedBudgetRow[]).map((item) => ({
          id: `${item.budget_id}-${item.sub_category}`,
          budget_id: item.budget_id,
          category: item.category,
          sub_category: item.sub_category,
          amount: Number(item.amount) || 0,
          is_paid: !!item.is_paid,
          notes: item.notes ?? null,
        }));

        setData({
          items: mappedItems,
          budgetOwnerId: (budgetItems as SharedBudgetRow[])[0]?.budget_owner_id || null,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했어요');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedBudget();
  }, [token]);

  const total = data.items.reduce((sum, item) => sum + item.amount, 0);
  const getCategoryTotal = (categoryId: string) =>
    data.items.filter(item => item.category === categoryId).reduce((sum, item) => sum + item.amount, 0);

  // [CL-SHARE-P1-20260717-170000] 등급 산출 — 순수 함수 위임(항목 배열 파생, 렌더마다 재계산 방지).
  const gradeItems: ShareGradeItem[] = useMemo(
    () => data.items.map((i) => ({ category: i.category, sub_category: i.sub_category, amount: i.amount })),
    [data.items],
  );
  const shareGrade = useMemo(() => computeShareGrade(gradeItems), [gradeItems]);

  // [CL-SHARE-P1-20260717-170000] share_open — RPC 성공(=항목 로드 완료) 직후 세션 1회.
  //  봇/스크래퍼는 JS 미실행이라 자연 배제. 소유자 본인 열람은 바이럴 지표 오염이라 제외.
  //  절대 금액·토큰 미전송(등급/레벨/세션여부만) — §4.1 금지 계약.
  // [CL-SHARE-AUDIT-D4-20260717-190000] 인증 확정(authLoading=false) 전에는 발사 보류 — 미확정 윈도우의
  //  user=null 로 소유자를 비소유자로 오계측하지 않는다.
  // [CL-SHARE-AUDIT-D3-20260717-190000] once 키에 token 을 인스턴스 차원으로 부여 — 같은 세션에서 다른
  //  공유 링크를 열면 각각 1회씩 집계(새로고침만 차단). token 은 **키(로컬 sessionStorage)에만** 쓰이며
  //  GA4 페이로드로는 절대 나가지 않는다(§4.1 금지 계약 — SB.4 스냅샷이 기계 검증).
  const openTracked = data.items.length > 0 && !loading && !error;
  useEffect(() => {
    if (!openTracked || authLoading || isOwner) return;
    trackFunnelOnce(
      'share_open',
      {
        grade: shareGrade.grade,
        privacy_level: 'full', // P1 시점 레거시 고정(P2 에서 실값) — 설계 §4.1 페이로드 계약
        has_session: !!user,
      },
      token,
    );
  }, [openTracked, authLoading, isOwner, shareGrade.grade, user, token]);

  // [CL-SHARE-P1-20260717-170000] 호기심 CTA — returnTo state 로 /auth 이동(Auth 는 쿼리파람 미판독).
  //  가입 후 첫 예산 위저드(wizard_enter)로 자연 연결. 공유 유입 귀속은 first-touch(share_card)가 담당.
  const handleShareCta = (cta: 'hero' | 'banner') => {
    trackFunnel('share_cta_click', { cta, grade: shareGrade.grade });
    navigate('/auth', { state: { returnTo: '/budget' } });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <div className="text-muted-foreground">예산 정보를 불러오고 있어요...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <span className="text-5xl mb-4 block">😢</span>
          <h1 className="text-heading text-foreground mb-2">앗, 문제가 생겼어요</h1>
          <p className="text-body text-muted-foreground mb-8">{error}</p>
          <Button onClick={() => navigate('/')} className="gap-2">
            <Home className="h-4 w-4" />
            홈으로 가기
          </Button>
        </div>
      </div>
    );
  }

  // Non-owner view: Static snapshot with conversion banner
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Conversion Banner */}
        <div className="bg-primary text-primary-foreground px-4 py-3">
          <div className="max-w-[400px] mx-auto flex items-center gap-3">
            <Sparkles className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">
              더 상세한 예산 관리를 원하시면 웨딩셈에 가입하세요
            </p>
          </div>
        </div>

        {/* Header — [CL-HOME-BTN-20260315-140000] */}
        <header className="px-4 py-5">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="홈으로">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">공유된 결혼 예산</h1>
            <p className="text-xs text-muted-foreground mt-1">웨딩셈으로 작성되었어요</p>
          </div>
        </header>

        {/* Main content - Slim vertical card */}
        <main className="flex-1 px-4 pb-6">
          <div className="max-w-[400px] mx-auto w-full">
            {/* [CL-SHARE-P1-20260717-170000] 등급 히어로 카드 — 수신자가 3초 안에 파악(설계 §2.3-1) */}
            <div className="mb-4">
              <ShareGradeCard grade={shareGrade} items={gradeItems} />
            </div>

            {/* [CL-SHARE-P1-20260717-170000] 미니 비교 티저 + 호기심 CTA(설계 §2.3-2·3) */}
            <div className="mb-5 text-center">
              <p className="mb-2 text-xs text-muted-foreground break-keep">
                나도 우리 예산 등급이 궁금하다면?
              </p>
              <Button onClick={() => handleShareCta('hero')} className="gap-2">
                <Sparkles className="h-4 w-4" />
                내 예산 등급 확인하기 ✨
              </Button>
            </div>

            {/* Static snapshot indicator */}
            <div className="flex items-center justify-center gap-2 mb-4 text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs">읽기 전용 스냅샷</span>
            </div>

            <div className="bg-card rounded-2xl shadow-lg p-5 pointer-events-none select-none">
              {/* Donut chart - smaller for slim layout */}
              <div className="scale-90 origin-top">
                <BudgetDonutChart items={data.items} />
              </div>

              {/* Category breakdown - vertical stacking */}
              <div className="mt-6 space-y-2">
                {BUDGET_CATEGORIES.map(category => {
                  const categoryTotal = getCategoryTotal(category.id);
                  if (categoryTotal === 0) return null;
                  
                  const percentage = total > 0 ? Math.round((categoryTotal / total) * 100) : 0;
                  
                  return (
                    <div 
                      key={category.id}
                      className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{category.icon}</span>
                        <span className="text-sm font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{formatKoreanWon(categoryTotal)}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="mt-5 p-3.5 bg-primary/10 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">총 예상 비용</span>
                  <span className="text-lg font-bold text-primary">{formatKoreanWon(total)}</span>
                </div>
              </div>
            </div>

            {/* CTA — [CL-SHARE-P1-20260717-170000] 호기심 CTA 로 교체(구 '무료로 시작하기' → 등급 확인) */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground mb-3">
                나도 결혼 예산을 정리해볼까요?
              </p>
              <Button onClick={() => handleShareCta('banner')} size="sm" className="gap-2">
                <Sparkles className="h-4 w-4" />
                내 예산 등급 확인하기 ✨
              </Button>
            </div>
          </div>
        </main>

        {/* Fixed CTA Footer */}
        <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 px-4">
          <p className="text-center text-xs text-muted-foreground">
            네이버나 구글에서 '<span className="font-semibold text-primary">웨딩셈</span>'을 검색해 보세요.
          </p>
        </footer>
      </div>
    );
  }

  // Owner view: Full interactive page (existing design but slimmer)
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header — [CL-HOME-BTN-20260315-140000] */}
      <header className="px-4 py-5">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 mb-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="홈으로">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">공유된 결혼 예산</h1>
          <p className="text-xs text-muted-foreground mt-1">웨딩셈으로 작성되었어요</p>
        </div>
      </header>

      {/* Main content - Slim vertical card */}
      <main className="flex-1 px-4 pb-6">
        <div className="max-w-[400px] mx-auto w-full">
          <div className="bg-card rounded-2xl shadow-lg p-5">
            {/* Donut chart - smaller for slim layout */}
            <div className="scale-90 origin-top">
              <BudgetDonutChart items={data.items} />
            </div>

            {/* Category breakdown - vertical stacking */}
            <div className="mt-6 space-y-2">
              {BUDGET_CATEGORIES.map(category => {
                const categoryTotal = getCategoryTotal(category.id);
                if (categoryTotal === 0) return null;
                
                const percentage = total > 0 ? Math.round((categoryTotal / total) * 100) : 0;
                
                return (
                  <div 
                    key={category.id}
                    className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{category.icon}</span>
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatKoreanWon(categoryTotal)}</span>
                      <span className="text-xs text-muted-foreground ml-1.5">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-5 p-3.5 bg-primary/10 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">총 예상 비용</span>
                <span className="text-lg font-bold text-primary">{formatKoreanWon(total)}</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 text-center">
            <Button onClick={() => navigate('/summary')} variant="outline" size="sm" className="gap-2">
              <Home className="h-4 w-4" />
              내 대시보드로 가기
            </Button>
          </div>
        </div>
      </main>

      {/* Fixed CTA Footer */}
      <footer className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border py-3 px-4">
        <p className="text-center text-xs text-muted-foreground">
          네이버나 구글에서 '<span className="font-semibold text-primary">웨딩셈</span>'을 검색해 보세요.
        </p>
      </footer>
    </div>
  );
}
