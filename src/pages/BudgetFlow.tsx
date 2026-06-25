import { useState, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSEO } from '@/hooks/useSEO';
import { CoffeeDonationModal, CoffeeDonationFab } from '@/components/CoffeeDonationModal';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useMultipleBudgets } from '@/hooks/useMultipleBudgets';
import { BudgetTable } from '@/components/BudgetTable';
import { BudgetTableMobile } from '@/components/BudgetTableMobile';
import { SaveStatusIndicator } from '@/components/budget/SaveStatusIndicator';
import { BudgetComparisonDashboard } from '@/components/BudgetComparisonDashboard';
import { InsightPanel } from '@/components/budget/InsightPanel';
import { WeddingCountdown } from '@/components/WeddingCountdown';
import { RestoreProgressIndicator } from '@/components/RestoreProgressIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  Check, 
  X,
  ArrowLeft,
  BarChart3,
  Table2,
  Copy,
  ChevronDown,
  RotateCcw,
  History,
  Shield,
  ClipboardList,
  Sparkles,
  Lock,
  Users,
  UserPlus,
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VersionHistorySheet } from '@/components/VersionHistorySheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatedWon } from '@/components/budget/AnimatedWon'; // [CL-AUDIT-COUNTUP-ISOLATE-20260622] 카운트업 리프 격리
// [CL-COEDIT-E2E-20260620-130000] 개인/우리 모드 + 협업 관리 + 실시간 동기화
import { useWorkspace } from '@/hooks/useWorkspace';
import { CollaboratorManager } from '@/components/collaboration/CollaboratorManager';
// [CL-COEDIT-NICK-20260621] 파트너 이름 표출 + 닉네임 권유
import { useCollaboration } from '@/hooks/useCollaboration';
import { NicknameDialog } from '@/components/collaboration/NicknameDialog';
import { useRealtimeBudget } from '@/hooks/useRealtimeBudget';
import { useToast } from '@/hooks/use-toast'; // [CL-AUDIT-R3-SHARE-20260623-000000] 자동공유 실패 안내
// [CL-COEDIT-NUDGE-20260624-000000] 개선2/3/4: 파트너 2분 편집 알림 · 오프라인 변경 시머 · 회전 칭찬
import { usePartnerEditNotifier } from '@/hooks/usePartnerEditNotifier';
import { useGamificationState } from '@/hooks/useGamificationState';
import { computeChangedSince, lastSeenKey, HIGHLIGHT_HOLD_MS, maxUpdatedAt } from '@/lib/collab/changed-since';
import { crossedMilestone, makePraiseBag, type PraiseBag } from '@/lib/praise-messages';

export default function BudgetFlow() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  // [CL-SEC-ADMIN-GATE-20260621] 운영자 이메일 하드코딩 제거 → user_roles RLS 기반 isAdmin(번들에 PII 미노출)
  const { isAdmin } = useAdmin();

  useSEO({
    title: '예산 관리 - 웨딩셈',
    description: '결혼 예산을 항목별로 입력하고 관리하세요. 스드메, 식대, 혼수까지 실시간 계산되는 웨딩 예산 관리 도구.',
    path: '/budget',
  });
  const { 
    budgets, 
    activeBudgetId, 
    setActiveBudgetId, 
    items, 
    loading: budgetLoading,
    createNewBudget,
    copyBudget,
    renameBudget,
    deleteBudget,
    updateAmount,
    togglePaid,
    updateNotes,
    renameItem,
    updateCostSplit,
    addCustomItem,
    deleteCustomItem,
    deleteItem,
    getTotal,
    getBudgetsForComparison,
    // [CL-ANIM-UPGRADE-20260621-150000] 앰비언트 저장 상태
    saveState,
    // [CL-COEDIT-NUDGE-20260624-000000] 성공 편집 누계 신호(개선2 알림 + 개선4 칭찬 단일 신호원)
    editSignal,
    // [CL-COEDIT-E2E-20260620-130000] 실시간 공동편집 applier
    realtimeApplier,
    // New snapshot/reset functions
    snapshots,
    resetBudget,
    restoreFromSnapshot,
    deleteSnapshot,
    isFullBackupData,
    // Optimized version recovery
    undoLastRestore,
    isRestoring,
    restoreProgress,
    canUndoRestore,
  } = useMultipleBudgets();

  const isMobile = useIsMobile();
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'comparison'>('table');
  const [isResetting, setIsResetting] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDonation, setShowDonation] = useState(false);

  // [CL-COEDIT-E2E-20260620-130000] 개인/우리 워크스페이스 모드 (예산별 공유의 뷰 필터)
  const { mode, setMode, visibleBudgets } = useWorkspace(budgets);
  // [CL-COEDIT-INVITE-DISCOVER-20260620] '우리' 빈 화면 → '파트너 초대하기': 개인 전환 + 첫 예산 초대 링크 1회 자동 생성 트리거
  const [autoInvite, setAutoInvite] = useState(false);
  // 모드 전환 시 활성 예산이 현재 모드에 없으면 보정 → 개인↔공동 데이터 누수 0
  useEffect(() => {
    if (activeBudgetId && visibleBudgets.some(b => b.id === activeBudgetId)) return;
    setActiveBudgetId(visibleBudgets[0]?.id ?? null);
  }, [mode, visibleBudgets, activeBudgetId, setActiveBudgetId]);
  const activeBudget = visibleBudgets.find(b => b.id === activeBudgetId) ?? null;
  const isOwnerOfActive = !!activeBudget && activeBudget.user_id === user?.id;
  // [CL-COEDIT-OPTADD-20260622-233012] 개선4: 우리탭 옵션추가 드롭다운에 '개인 옵션에서 가져오기'로 노출할 내 개인 예산
  const personalBudgets = budgets.filter(b => !b.isShared && b.user_id === user?.id);

  // [CL-COEDIT-E2E-20260620-130000] 실시간 구독 = '우리' 모드 활성 예산에서만.
  // 개인 모드(또는 활성 예산 없음) → null → 구독 안 함 = 개인↔공동 완전 분리(개인 예산 절대 비동기화).
  const realtimeBudgetId = mode === 'shared' ? (activeBudget?.id ?? null) : null;
  useRealtimeBudget(realtimeBudgetId, realtimeApplier);

  // [CL-COEDIT-NICK-20260621] 활성 예산의 참여자 → 파트너 이름 표출 + 소유자 닉네임 1회 권유.
  // [CL-AUDIT-RPC-DEDUP-20260622] activeBudget 기준 단일 useCollaboration → CollaboratorManager 에 주입(중복 RPC 제거).
  const collaboration = useCollaboration(activeBudget?.id ?? null);
  const participants = collaboration.collaborators;
  const meParticipant = participants.find(p => p.isMe);
  // [CL-AUDIT-NICK-EFFECT-20260622] effect 의존성을 원시값으로 축소 → 매 렌더 재실행 방지(meParticipant 는 매 렌더 신규 객체)
  const meUserId = meParticipant?.user_id;
  const meDisplayName = meParticipant?.display_name?.trim() || '';
  const partnerName = participants.find(p => !p.isMe && p.display_name?.trim())?.display_name?.trim() || null;
  const [ownNickOpen, setOwnNickOpen] = useState(false);
  useEffect(() => {
    if (mode !== 'shared' || !user || !meUserId) return;
    if (meDisplayName) return; // 이미 닉네임 있음
    const guard = `nick_prompt_${user.id}`;
    try { if (localStorage.getItem(guard)) return; } catch { /* noop */ }
    try { localStorage.setItem(guard, '1'); } catch { /* noop */ }
    setOwnNickOpen(true);
  }, [mode, user, meUserId, meDisplayName]);

  // ────────────────────────────────────────────────────────────────────────────
  // [CL-COEDIT-NUDGE-20260624-000000] 개선2·3·4 배선 — 모두 degrade-safe(키/마이그 미배포여도 앱 무영향).
  //   2) 파트너 2분 연속 편집 → notify-partner(이메일, 서버가 1일1회·글로벌캡 강제)
  //   3) 재접속 시 부재 중 파트너 변경분 시머 강조(3분 유지 후 자동 소거)
  //   4) 적극 편집자 마일스톤 칭찬(회전 토스트 + 소량 점수)
  // ────────────────────────────────────────────────────────────────────────────
  // [CL-VULN-V3-GAMIFY-RACE-20260624] increment(델타)로 보상 — 절대값(클로저 스냅샷) lost-update 제거.
  const { addPoints, increment } = useGamificationState();
  // '우리' 모드 + 현재 파트너 존재 시에만 알림·강조 활성(개인 모드/무파트너 → 완전 미동작)
  const partnerPresent = mode === 'shared' && !!collaboration.myPartner;

  // 개선2: editSignal(성공 편집 누계)을 구독 → 2분 세션 감지 시 Edge Function 1회 호출
  usePartnerEditNotifier({
    editSignal,
    active: partnerPresent,
    budgetId: activeBudget?.id ?? null,
    onNudged: () => {
      // 게이미피케이션: 파트너 소환 누계 + 보상(증분 누적·직렬화 — 동시 보상 유실 없음). 배지는 Profile catch-up.
      increment({ coedit_nudges_sent: 1, total_points: 5 });
    },
  });

  // 개선3: 부재 중 파트너 변경분 시머 강조 — 예산당 1회 스냅샷, 3분 유지 후 자동 소거.
  const [changedItemIds, setChangedItemIds] = useState<Set<string>>(() => new Set());
  const snapshotBudgetRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // (a) 예산 전환/언마운트 → 이전 강조 즉시 제거 + 타이머 정리 + 재스냅샷 허용(고아 setState 방지)
  useEffect(() => {
    snapshotBudgetRef.current = null;
    setChangedItemIds(new Set());
    if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    return () => {
      if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    };
  }, [activeBudgetId]);

  // (b) 활성 예산 items 로드 완료 시 1회 스냅샷(스위치 직후 stale items 레이스는 budget_id 가드로 차단)
  useEffect(() => {
    if (!partnerPresent || !activeBudgetId) return;
    if (items.length === 0 || items[0].budget_id !== activeBudgetId) return;
    if (snapshotBudgetRef.current === activeBudgetId) return; // 예산당 1회
    snapshotBudgetRef.current = activeBudgetId;

    let lastSeen: string | null = null;
    try { lastSeen = localStorage.getItem(lastSeenKey(activeBudgetId)); } catch { /* noop */ }
    const changed = computeChangedSince(items, lastSeen);
    // [CL-VULN-V6-LASTSEEN-MAX-20260624] last-seen 을 now 가 아니라 '스냅샷 항목의 max(updated_at)'로 전진
    //  (역행 금지: 기존 lastSeen 과 비교해 더 큰 값). 그래야 스냅샷 직후 도착한 더 늦은 파트너 변경이
    //  다음 open 에서 strict-> 게이트를 통과해 보존된다(now 전진은 그 사이 변경을 영구 유실).
    const snapMax = maxUpdatedAt(items);
    if (snapMax) {
      const advanceTo =
        lastSeen && Date.parse(lastSeen) > Date.parse(snapMax) ? lastSeen : snapMax;
      try { localStorage.setItem(lastSeenKey(activeBudgetId), advanceTo); } catch { /* noop */ }
    }

    if (changed.size > 0) {
      setChangedItemIds(changed);
      // 게이미피케이션: 파트너 변경 확인 누계 + 보상(증분 누적 — 동시 보상 유실 없음)
      increment({ partner_reviews: 1, total_points: 3 });
      // 3분 유지 후 클래스 제거 → CSS transition 으로 부드럽게 fade-out
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setChangedItemIds(new Set());
        highlightTimerRef.current = null;
      }, HIGHLIGHT_HOLD_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerPresent, activeBudgetId, items]);

  // 개선3 보강: 내 편집마다 내 last-seen 을 전진시킨다 → 재방문 시 '내 편집'을 파트너 변경분으로 오강조하지 않음.
  //   (부재 = 내가 편집 안 함 → lastSeen 정지 → 그 사이 파트너 변경분만 다음 open 에서 강조됨.)
  //   editSignal 은 '활성 예산에 대한 내 성공 편집'에서만 +1 → 전환 시엔 미발화(스냅샷 effect 와 무경합).
  // [CL-VULN-R6D-LASTSEEN-MONO-20260625] 스냅샷 effect(maxUpdatedAt)와 동일하게 '역행 금지(단조)' 가드 적용.
  //   클라 시계가 서버보다 느리면 무가드 now 쓰기가 lastSeen 을 후퇴시켜 파트너 변경분이 재강조·중복보상되던 문제 차단.
  useEffect(() => {
    if (!partnerPresent || !activeBudgetId || editSignal === 0) return;
    try {
      const key = lastSeenKey(activeBudgetId);
      const prev = localStorage.getItem(key);
      const nowISO = new Date().toISOString();
      // 더 큰(최신) 값으로만 전진 — 역행 금지(클라 시계 스큐로 인한 lastSeen 후퇴 차단)
      if (!prev || Date.parse(nowISO) > Date.parse(prev)) {
        localStorage.setItem(key, nowISO);
      }
    } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSignal]);

  // 개선4: 마일스톤마다 회전 칭찬 토스트(은은) + 소량 점수. 매 편집이 아니라 점증 간격 → 피로 최소.
  const praiseBagRef = useRef<PraiseBag | null>(null);
  if (!praiseBagRef.current) praiseBagRef.current = makePraiseBag();
  const lastPraisedRef = useRef(0);
  useEffect(() => {
    if (editSignal === 0) return;
    // [CL-VULN-V9-MILESTONE-CROSS-20260624] 정확일치 대신 '범위 통과' — 배치 리렌더로 editSignal 이
    //  마일스톤을 건너뛰어도(예: 6→8) 누락 없이 1회 보상. lastPraisedRef 는 '마지막 평가한 editSignal'.
    const crossed = crossedMilestone(lastPraisedRef.current, editSignal);
    lastPraisedRef.current = editSignal; // 다음 비교 base (통과 여부와 무관하게 항상 전진)
    if (crossed === null) return;
    const msg = praiseBagRef.current!.next();
    toast({ title: `${msg.emoji} ${msg.title}`, description: msg.description });
    addPoints(2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSignal]);

  // [CL-COEDIT-COPY-20260622-233012] 개선2+3: '복사하여 공동편집'은 탭 무관하게 항상 '우리' 옵션(shared:true)을 만든다.
  //  (기존 버그: shared 미전달 → 복사본이 개인탭에 떨어져 "우리로 안 됨".) 생성 후 우리탭 전환 +
  //  파트너 있으면 자동 공유(개선6), 없으면 초대 링크 자동 생성.
  // [CL-AUDIT-R3-SHARE-20260623-000000] 파트너 자동공유 — 실패 시 침묵하지 않고 안내(이전엔 결과 미검사). 성공 여부 반환.
  const autoShareToPartner = async (budgetId: string): Promise<boolean> => {
    const ok = await collaboration.shareBudgetWithPartner(budgetId);
    if (ok) {
      await collaboration.refresh();
    } else {
      toast({
        title: '파트너 공유에 실패했어요',
        description: '잠시 후 다시 시도하거나, 초대 링크로 직접 공유해주세요.',
        variant: 'destructive',
      });
    }
    return ok;
  };

  const handleCopyToCoedit = async () => {
    if (!activeBudget) return;
    const copy = await copyBudget(activeBudget.id, `${activeBudget.name} (공동편집)`, { shared: true });
    if (copy) {
      setMode('shared');
      if (collaboration.myPartner) {
        // 자동공유 실패 시 초대 링크로 폴백(파트너가 못 보는 채로 방치되지 않게)
        const ok = await autoShareToPartner(copy.id);
        if (!ok) setAutoInvite(true);
      } else {
        setAutoInvite(true);
      }
    }
  };

  // [CL-COEDIT-OPTADD-20260621] 현재 탭(개인/우리)에 귀속되도록 mode 전달 + 탭 내 번호
  // [CL-PARTNER-1TO1-20260622-233012] 우리탭 신규 옵션은 현재 파트너에게 자동 공유(워크스페이스 일관).
  const handleCreateBudget = async () => {
    const newName = `옵션 ${visibleBudgets.length + 1}`;
    const created = await createNewBudget(newName, { shared: mode === 'shared' });
    if (created && mode === 'shared' && collaboration.myPartner) {
      await autoShareToPartner(created.id);
    }
  };

  const handleCopyBudget = async (sourceBudgetId: string) => {
    const sourceBudget = budgets.find(b => b.id === sourceBudgetId);
    if (sourceBudget) {
      const newName = `${sourceBudget.name} (복사본)`;
      const created = await copyBudget(sourceBudgetId, newName, { shared: mode === 'shared' });
      if (created && mode === 'shared' && collaboration.myPartner) {
        await autoShareToPartner(created.id);
      }
    }
  };

  const handleStartEdit = (budgetId: string, currentName: string) => {
    setEditingBudgetId(budgetId);
    setEditingName(currentName);
  };

  const handleSaveEdit = async () => {
    if (editingBudgetId && editingName.trim()) {
      await renameBudget(editingBudgetId, editingName.trim());
    }
    setEditingBudgetId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingBudgetId(null);
    setEditingName('');
  };

  const handleResetBudget = async () => {
    setIsResetting(true);
    await resetBudget(true);
    setIsResetting(false);
  };

  const handleRestore = async (snapshotId: string) => {
    await restoreFromSnapshot(snapshotId);
    setIsHistoryOpen(false);
  };

  // Auth check
  if (!authLoading && !user) {
    return <Navigate to="/auth" replace />;
  }

  // Loading state
  if (authLoading || budgetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">💒</div>
          <div className="text-muted-foreground">예산 정보를 불러오고 있어요...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Restore Progress Indicator */}
      <RestoreProgressIndicator progress={restoreProgress} />
      
      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-lg z-30 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* Top Row: D-Day Countdown (if set) */}
          <div className="flex items-center justify-center mb-2 sm:mb-3">
            <WeddingCountdown />
          </div>
          
          {/* Mobile: Two rows, Desktop: Single row */}
          <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:items-center sm:justify-between">
            {/* Top Row: Back + Title */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-xl font-bold truncate">결혼 예산 시뮬레이터</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  여러 옵션을 비교해보세요
                </p>
              </div>
            </div>
            
            {/* Bottom Row on Mobile: Action Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="gap-1"
                >
                  <Table2 className="h-4 w-4" />
                  <span className="hidden sm:inline">표</span>
                </Button>
                <Button
                  variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('comparison')}
                  className="gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">비교</span>
                </Button>
              </div>

              {/* History Sheet - Snapshots */}
              <VersionHistorySheet
                isOpen={isHistoryOpen}
                onOpenChange={setIsHistoryOpen}
                snapshots={snapshots}
                canUndoRestore={canUndoRestore}
                isRestoring={isRestoring}
                onRestore={handleRestore}
                onDelete={deleteSnapshot}
                onUndoRestore={undoLastRestore}
                isFullBackupData={isFullBackupData}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">버전 기록</span>
                  </Button>
                }
              />

              {/* Reset Button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/50">
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">초기화</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>처음 상태로 초기화</AlertDialogTitle>
                    <AlertDialogDescription>
                      모든 옵션 탭이 삭제되고 기본 카테고리로 구성된 "옵션 1"만 새로 생성됩니다.
                      현재 모든 데이터는 자동으로 백업되어 "버전 기록"에서 복원할 수 있어요.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleResetBudget}
                      disabled={isResetting}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isResetting ? '초기화 중...' : '초기화'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                onClick={() => navigate('/summary')}
                variant="outline"
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
              >
                <span className="hidden sm:inline">요약 보기</span>
                <span className="sm:hidden">요약</span>
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => navigate('/admin')}
                  variant="outline"
                  size="sm"
                  className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">관리자</span>
                  <span className="sm:hidden">관리</span>
                </Button>
              )}
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Tabs section - Budget Options (hidden in comparison mode) */}
      {viewMode === 'table' && (
        <div className="bg-secondary/50 border-b border-border overflow-x-hidden">
          <div className="max-w-6xl mx-auto px-3 sm:px-4">
            {/* [CL-COEDIT-E2E-20260620-130000] 개인/우리 모드 토글 */}
          <div className="flex items-center gap-2 pt-2 sm:pt-3">
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={mode === 'personal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('personal')}
                className="gap-1 h-8"
              >
                <Lock className="h-3.5 w-3.5" /> 개인
              </Button>
              <Button
                variant={mode === 'shared' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('shared')}
                className="gap-1 h-8"
              >
                <Users className="h-3.5 w-3.5" /> 우리
              </Button>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {/* [CL-COEDIT-NICK-20260621] 파트너 닉네임 표출(미상 시 '파트너' 폴백) */}
              {mode === 'personal'
                ? '나만 보는 예산'
                : partnerName
                  ? `${partnerName}님과 함께 보는 예산`
                  : '파트너와 함께 보는 예산'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-3 overflow-x-auto scrollbar-hide -mx-1 px-1 sm:mx-0 sm:px-0">
              {visibleBudgets.map((budget) => (
                <div
                  key={budget.id}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all
                    ${activeBudgetId === budget.id 
                      ? 'bg-primary text-primary-foreground shadow-md' 
                      : 'bg-background hover:bg-muted border border-border'
                    }
                  `}
                  onClick={() => setActiveBudgetId(budget.id)}
                >
                  {editingBudgetId === budget.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-7 w-24 text-sm bg-white text-foreground"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-sm whitespace-nowrap">{budget.name}</span>
                      {activeBudgetId === budget.id && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 hover:bg-primary-foreground/20"
                            onClick={() => handleStartEdit(budget.id, budget.name)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {/* [CL-OWNERDEL-GUARD-20260622-233012] 개선7: 옵션 삭제는 소유자만(비소유자에겐 숨김) */}
                          {budgets.length > 1 && budget.user_id === user?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 hover:bg-destructive/20"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>예산 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    "{budget.name}"을(를) 정말 삭제하시겠어요? 이 작업은 되돌릴 수 없어요.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteBudget(budget.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 whitespace-nowrap"
                  >
                    <Plus className="h-4 w-4" />
                    옵션 추가
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover z-50">
                  <DropdownMenuItem onClick={handleCreateBudget}>
                    <Plus className="h-4 w-4 mr-2" />
                    새 옵션 추가
                  </DropdownMenuItem>
                  {/* [CL-COEDIT-OPTADD-20260621] 현재 탭 옵션 복사 */}
                  {visibleBudgets.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        기존 옵션 복사
                      </div>
                      {visibleBudgets.map(budget => (
                        <DropdownMenuItem
                          key={budget.id}
                          onClick={() => handleCopyBudget(budget.id)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {budget.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {/* [CL-COEDIT-OPTADD-20260622-233012] 개선4: 우리탭에선 '개인 옵션에서 가져오기'도 함께(Lock 아이콘으로 구분) */}
                  {mode === 'shared' && personalBudgets.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                        개인 옵션에서 가져오기
                      </div>
                      {personalBudgets.map(budget => (
                        <DropdownMenuItem
                          key={`personal-${budget.id}`}
                          onClick={() => handleCopyBudget(budget.id)}
                          className="text-muted-foreground"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          {budget.name}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      {/* pb-32: 모바일/태블릿에서 FAB 버튼과 총계 카드 중첩 방지를 위한 하단 여백, lg(1024px+)부터 축소 */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 pt-4 sm:pt-6 pb-32 lg:pb-6 overflow-x-hidden">
        {/* Checklist shortcut + Insight Panel */}
        {viewMode === 'table' && items.length > 0 && (
          <div className="space-y-3 mb-4">
            {/* [CL-AI-BTN-GLOW-20260308-175200] 눈에 띄는 AI 체크리스트 버튼 */}
            <button
              onClick={() => navigate('/checklist')}
              className="w-full flex items-center gap-3 bg-gradient-to-r from-primary/10 via-blue-50 to-emerald-50/80 rounded-xl border-2 border-primary/40 p-3.5 sm:p-4 hover:from-primary/15 hover:via-blue-100 hover:to-emerald-100 hover:border-primary/60 hover:shadow-primary-glow hover:scale-[1.02] transition-all duration-200 ai-glow-strong"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5 text-primary animate-[glow-pulse_2s_ease-in-out_infinite]" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-foreground">D-day 체크리스트 AI</p>
                  <span className="ai-badge-shimmer bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 text-primary text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-primary/30">AI</span>
                </div>
                <p className="text-xs text-muted-foreground">결혼 준비 진행 상황을 확인하세요</p>
              </div>
              <ChevronDown className="w-4 h-4 text-primary -rotate-90" />
            </button>
            <InsightPanel items={items} />
          </div>
        )}

        {viewMode === 'table' ? (
          mode === 'shared' && visibleBudgets.length === 0 ? (
            /* [CL-COEDIT-E2E-20260620-130000] 우리 모드 빈 상태 */
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">아직 공동 예산이 없어요</h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                개인 예산에서 파트너를 초대하면, 여기 '우리'에 나타나 함께 편집할 수 있어요.
              </p>
              {/* [CL-COEDIT-INVITE-DISCOVER-20260620] 발견성 개선: 빈 화면에서 바로 초대(개인 전환+자동 링크 생성) */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  onClick={() => { setMode('personal'); setAutoInvite(true); }}
                  className="gap-1.5"
                >
                  <UserPlus className="w-4 h-4" /> 파트너 초대하기
                </Button>
                <Button onClick={() => setMode('personal')} variant="outline" className="gap-1.5">
                  <Lock className="w-4 h-4" /> 개인 예산으로 가기
                </Button>
              </div>
            </div>
          ) : (
          <>
            {/* [CL-COEDIT-E2E-20260620-130000] 협업 관리(활성 예산) — 초대/협업자 */}
            {activeBudget && (
              <div className="mb-4">
                <CollaboratorManager
                  budgetId={activeBudget.id}
                  isOwner={isOwnerOfActive}
                  autoInvite={autoInvite}
                  onAutoInviteHandled={() => setAutoInvite(false)}
                  showCopyToCoedit={isOwnerOfActive && !activeBudget.isShared}
                  onCopyToCoedit={handleCopyToCoedit}
                  /* [CL-COEDIT-NICK-20260622-233012] 개선8: 내 닉네임 상시 변경 트리거 */
                  onEditMyNickname={() => setOwnNickOpen(true)}
                  /* [CL-AUDIT-RPC-DEDUP-20260622] 상위 단일 useCollaboration 주입 → 중복 RPC 제거 */
                  external={collaboration}
                />
              </div>
            )}
            {/* [CL-ANIM-UPGRADE-20260621-150000] 앰비언트 저장 상태 — 표 편집 침묵 해소 */}
            <div className="flex justify-end mb-2 pr-1">
              <SaveStatusIndicator state={saveState} />
            </div>
            {isMobile ? (
              <BudgetTableMobile
                items={items}
                onAmountChange={updateAmount}
                onTogglePaid={togglePaid}
                onNotesChange={updateNotes}
                onRenameItem={renameItem}
                onCostSplitChange={updateCostSplit}
                onAddCustomItem={addCustomItem}
                onDeleteItem={deleteItem}
                changedItemIds={changedItemIds}
              />
            ) : (
              <>
                <div className="bg-card rounded-xl border border-border shadow-toss overflow-hidden">
                  <BudgetTable
                    items={items}
                    onAmountChange={updateAmount}
                    onTogglePaid={togglePaid}
                    onNotesChange={updateNotes}
                    onRenameItem={renameItem}
                    onCostSplitChange={updateCostSplit}
                    onAddCustomItem={addCustomItem}
                    onDeleteItem={deleteItem}
                    changedItemIds={changedItemIds}
                  />
                </div>

                {/* Total summary card - Desktop Only */}
                <div className="mt-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">현재 예산 총액</p>
                      {/* [CL-AUDIT-COUNTUP-ISOLATE-20260622] 카운트업 리프 — 페이지/테이블 리렌더 비전파 */}
                      <p className="text-3xl font-bold text-primary">
                        <AnimatedWon value={getTotal()} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">원화</p>
                      <p className="text-xl font-semibold text-foreground">
                        ₩{getTotal().toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
          )
        ) : (
          <BudgetComparisonDashboard budgets={getBudgetsForComparison()} />
        )}
      </main>

      {/* Coffee Donation */}
      <CoffeeDonationFab onClick={() => setShowDonation(true)} />
      <CoffeeDonationModal open={showDonation} onOpenChange={setShowDonation} />

      {/* [CL-COEDIT-NICK-20260621] 소유자 닉네임 권유 — 상대에게 '파트너' 대신 이름 표시 */}
      {user && (
        <NicknameDialog
          open={ownNickOpen}
          onOpenChange={setOwnNickOpen}
          userId={user.id}
          initialValue={meParticipant?.display_name}
          onSaved={() => { void collaboration.refresh(); }}
        />
      )}
    </div>
  );
}