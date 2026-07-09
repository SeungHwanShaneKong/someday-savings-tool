/**
 * [CL-GAMIFY-INT-20260418-222329] /profile 페이지 — Wedding Prep Passport
 * - 레벨 링 + 총 포인트 + streak 2종 + 뱃지 그리드
 * - 로그인 사용자 전용 (미로그인 시 /auth로 리다이렉트)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
// [CL-COEDIT-NICK-20260622-233012] 닉네임 상시 변경(개선8)
import { NicknameDialog } from '@/components/collaboration/NicknameDialog';
import { useGamificationState } from '@/hooks/useGamificationState';
import { useStreak } from '@/hooks/useStreak';
import { useBadgeUnlock, useUserEarnedBadges } from '@/hooks/useBadgeUnlock';
import { LevelRing } from '@/components/gamification/LevelRing';
// [CL-TOP20-P4-GAMIFY-20260703-040000] 스트릭 진행 링 승격 — StreakFlame 은 링 중앙에서 재사용
import { StreakProgressRing } from '@/components/gamification/StreakProgressRing';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import { BadgeUnlockModal } from '@/components/gamification/BadgeUnlockModal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';
import type { UserEarnedBadge } from '@/lib/gamification/types';

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation(); // [CL-LOGIN-GATE-20260709-233447] returnTo 원위치 캡처
  const { user, loading: authLoading } = useAuth();
  const { state, nextLevelPoints, isLoading: stateLoading } =
    useGamificationState();
  const streak = useStreak();
  const { definitions, pendingUnlock, dismissUnlock, triggerCheck } =
    useBadgeUnlock();
  const { data: earnedRaw } = useUserEarnedBadges();

  // [CL-COEDIT-NICK-20260622-233012] 닉네임 변경(개선8) — 현재 display_name 로드 + 다이얼로그
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [nickOpen, setNickOpen] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setDisplayName((data as { display_name?: string | null } | null)?.display_name ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // [CL-GAMIFY-INT-20260418-222329] 프로필 페이지 mount 시 백그라운드 뱃지 재평가
  // 사용자가 이전 세션에서 획득 조건을 충족했지만 trigger가 없었던 경우 catch-up
  const checkedRef = useRef(false);
  useEffect(() => {
    if (!user?.id || checkedRef.current || definitions.length === 0) return;
    checkedRef.current = true;
    (async () => {
      try {
        // 각 카운트를 병렬로 조회
        const [budgetsRes, checklistRes, snapshotRes, aiRes] =
          await Promise.all([
            supabase
              .from('budgets')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('user_checklist_items')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('is_completed', true),
            supabase
              .from('budget_snapshots')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
            supabase
              .from('ai_conversations')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id),
          ]);

        await triggerCheck({
          budgets_count: budgetsRes.count ?? 0,
          checklist_completed_count: checklistRes.count ?? 0,
          snapshot_count: snapshotRes.count ?? 0,
          ai_queries_total: aiRes.count ?? 0,
          budget_savings_pct: 0, // 예산 집행 분석은 별도 훅에서 주입
          login_streak_days: streak.loginStreakDays,
          checklist_streak_days: streak.checklistStreakDays,
          days_before_wedding: null, // 향후 확장
          already_unlocked_slugs: state.unlocked_badge_slugs,
        });
      } catch (err) {
        console.error('[Profile] badge auto-check error:', err);
      }
    })();
  }, [
    user?.id,
    definitions.length,
    triggerCheck,
    streak.loginStreakDays,
    streak.checklistStreakDays,
    state.unlocked_badge_slugs,
  ]);

  useSEO({
    title: '내 웨딩 여권 - 웨딩셈',
    description: '웨딩 준비 진행 상황과 획득한 뱃지를 확인하세요.',
    path: '/profile',
  });

  // [CL-LOGIN-GATE-20260709-233447] 로그인 후 원위치 복귀 — returnTo state 전달(Auth.tsx 살균과 한 쌍)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', {
        replace: true,
        state: { returnTo: location.pathname + location.search },
      });
    }
  }, [user, authLoading, navigate, location.pathname, location.search]);

  const earned = useMemo<UserEarnedBadge[]>(
    () =>
      (earnedRaw ?? []).map((row) => ({
        id: String(row.badge_id),
        user_id: user?.id ?? '',
        badge_id: String(row.badge_id),
        earned_at: row.earned_at,
      })),
    [earnedRaw, user?.id],
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          뒤로
        </Button>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
          내 웨딩 여권
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {user.email} 님의 웨딩 준비 여정
        </p>

        {/* ─── Header Stats ─── */}
        <Card className="p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <LevelRing totalPoints={state.total_points} size={120} />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="text-sm text-muted-foreground">
                다음 레벨까지 <span className="font-semibold text-foreground">{nextLevelPoints.toLocaleString()}</span>pt
              </div>
              <div className="text-xs text-muted-foreground">
                획득 뱃지 <span className="font-bold text-foreground">{earned.length}</span> / 전체 {definitions.length}
                {state.freeze_tokens > 0 && (
                  <span className="ml-3">❄️ freeze {state.freeze_tokens}</span>
                )}
              </div>
            </div>
          </div>
          {/* [CL-TOP20-P4-GAMIFY-20260703-040000] 스트릭 진행 링 — 다음 마일스톤(7/14/30/100/365)까지
              구간 진행률 시각화. 기존 StreakFlame(일수·아이콘·hot 상태)은 링 중앙에 그대로 유지(정보 유실 0). */}
          <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-4 justify-items-center">
            <StreakProgressRing
              days={streak.loginStreakDays}
              variant="login"
              size={124}
            />
            <StreakProgressRing
              days={streak.checklistStreakDays}
              variant="checklist"
              size={124}
            />
          </div>
        </Card>

        {/* ─── 닉네임 변경(개선8) ─── */}
        <Card className="p-5 sm:p-6 mb-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">닉네임</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                공동편집 시 파트너에게 보이는 이름이에요 ·{' '}
                <span className="font-medium text-foreground">{displayName?.trim() || '미설정'}</span>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setNickOpen(true)}>
              변경
            </Button>
          </div>
        </Card>

        {/* ─── Badge Collection ─── */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
            뱃지 컬렉션
          </h2>
          {stateLoading && !definitions.length ? (
            <p className="text-sm text-muted-foreground">뱃지 로드 중...</p>
          ) : definitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              뱃지 데이터가 없습니다. 관리자가 뱃지 카탈로그를 배포할 때까지 기다려주세요.
            </p>
          ) : (
            <BadgeGrid
              definitions={definitions}
              earned={earned}
              groupByCategory
              size="md"
            />
          )}
        </Card>

        {/* ─── Unlock Celebration Modal ─── */}
        <BadgeUnlockModal
          open={!!pendingUnlock}
          badge={pendingUnlock?.badge ?? null}
          pointsGained={pendingUnlock?.points_gained ?? 0}
          onClose={dismissUnlock}
          /* [CL-TOP20-P4-GAMIFY-20260703-040000] 생애 첫 배지 → 풀스크린 축하 변형 */
          fullscreen={!!pendingUnlock?.is_first_badge}
        />

        {/* [CL-COEDIT-NICK-20260622-233012] 닉네임 변경 다이얼로그(개선8) */}
        <NicknameDialog
          open={nickOpen}
          onOpenChange={setNickOpen}
          userId={user.id}
          initialValue={displayName}
          onSaved={(name) => setDisplayName(name)}
        />
      </div>
    </div>
  );
}
