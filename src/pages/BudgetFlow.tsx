import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// [CL-LOGIN-GATE-20260709-233447] 게이트 공용 리다이렉트 — 로그인 후 원위치 복귀(returnTo)
import { NavigateToAuth } from '@/components/auth/NavigateToAuth';
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
import { PartnerActivityChip } from '@/components/collaboration/PartnerActivityChip'; // [CL-TOP20-P4-COLLAB-20260703-040000]
// [CL-POKE-VIS-20260711-173901] 콕 찌르기 가시성 확대 — 헤더 컴팩트 버튼 + 비모달 넛지 카드
import { PokeButton } from '@/components/collaboration/PokeButton';
import { PokeNudgeCard } from '@/components/collaboration/PokeNudgeCard';
import { useRealtimeBudget } from '@/hooks/useRealtimeBudget';
import { useToast } from '@/hooks/use-toast'; // [CL-AUDIT-R3-SHARE-20260623-000000] 자동공유 실패 안내
// [CL-COEDIT-NUDGE-20260624-000000] 개선2/3/4: 파트너 2분 편집 알림 · 오프라인 변경 시머 · 회전 칭찬
import { usePartnerEditNotifier } from '@/hooks/usePartnerEditNotifier';
import { useGamificationState } from '@/hooks/useGamificationState';
import { computeChangedSince, lastSeenKey, HIGHLIGHT_HOLD_MS, maxUpdatedAt } from '@/lib/collab/changed-since';
import { crossedMilestone, makePraiseBag, type PraiseBag } from '@/lib/praise-messages';
// [CL-TOP20-P3-WIZARD-20260703-030000] 첫 예산 생성 위저드(Top 20 P3 #11) — 신규 사용자 빈 표 마찰 제거
import { BudgetSetupWizard } from '@/components/budget/BudgetSetupWizard';
import { isWizardDone, type WizardPrefill } from '@/lib/budget-wizard';

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

  // [CL-EDIT5-EDITOR-20260625-000000] 개선5 근본수정: 부재 중 '파트너가' 바꾼 항목만 강조.
  //   - last_edited_by 로 편집자 구분 → 내 편집은 절대 강조 안 됨(오표시 0).
  //   - items 변경(실시간 도착 포함)마다 재계산·union → 늦게 온 파트너 변경도 누락 없이 강조(예산당 1회 가드 제거).
  //   - 진입 시점 lastSeen 동결 + 다음 방문 baseline 은 서버 updated_at 단조 전진(클라 now 미사용 → 시계 스큐 무관).
  const myUserId = user?.id ?? null;
  const [changedItemIds, setChangedItemIds] = useState<Set<string>>(() => new Set());
  const lastSeenAtOpenRef = useRef<{ budgetId: string; lastSeen: string | null } | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewAwardedRef = useRef<string | null>(null);   // 예산별 보상 1회
  const summaryToastRef = useRef<string | null>(null);    // 예산별 요약 토스트 1회(개선4)
  const highlightDoneRef = useRef<string | null>(null);   // 3분 fade 후 재강조 중단(피로조절)

  // (a) 예산 전환/언마운트 → 강조·동결·가드 초기화 + 타이머 정리(고아 setState 방지)
  useEffect(() => {
    setChangedItemIds(new Set());
    lastSeenAtOpenRef.current = null;
    reviewAwardedRef.current = null;
    summaryToastRef.current = null;
    highlightDoneRef.current = null;
    if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    return () => {
      if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
    };
  }, [activeBudgetId]);

  // (b) items 로드/실시간 도착마다 파트너 변경분 재계산(union-add). 내 편집은 last_edited_by 로 자동 제외.
  useEffect(() => {
    if (!partnerPresent || !activeBudgetId) return;
    if (items.length === 0 || items[0].budget_id !== activeBudgetId) return; // 전환 직후 stale items 레이스 차단
    if (highlightDoneRef.current === activeBudgetId) return;                  // 3분 fade 끝 → 이번 세션 재강조 안 함

    // 진입 시점 lastSeen 1회 동결(이후 내 편집이 baseline 을 밀어도 강조 기준 불변)
    if (!lastSeenAtOpenRef.current || lastSeenAtOpenRef.current.budgetId !== activeBudgetId) {
      let stored: string | null = null;
      try { stored = localStorage.getItem(lastSeenKey(activeBudgetId)); } catch { /* noop */ }
      lastSeenAtOpenRef.current = { budgetId: activeBudgetId, lastSeen: stored };
    }
    const frozen = lastSeenAtOpenRef.current.lastSeen;

    // 다음 방문 baseline = max(stored, '파트너 변경'의 최신 updated_at) — 서버시각 단조.
    // [CL-EDIT5-R7BASELINE-20260626] 내 편집(myUserId)·미상(null)은 제외 — baseline 이 내 편집 시각으로 과전진해
    //  '내 편집보다 이르지만 이후 도착할' 파트너 변경을 마스킹/영구 미강조하던 문제(R7-1/R7-2) 차단.
    try {
      const snapMax = maxUpdatedAt(items, myUserId);
      if (snapMax) {
        const cur = localStorage.getItem(lastSeenKey(activeBudgetId));
        const advanceTo = cur && Date.parse(cur) > Date.parse(snapMax) ? cur : snapMax;
        localStorage.setItem(lastSeenKey(activeBudgetId), advanceTo);
      }
    } catch { /* noop */ }

    // 파트너 변경분만(내 편집·미상(null) 제외)
    const partnerChanged = computeChangedSince(items, frozen, myUserId);
    if (partnerChanged.size === 0) return;

    setChangedItemIds(prev => {
      let grew = false;
      const next = new Set(prev);
      for (const id of partnerChanged) if (!next.has(id)) { next.add(id); grew = true; }
      return grew ? next : prev;
    });

    // 보상 + 요약 토스트(개선4) — 예산별 재접속 1회
    if (reviewAwardedRef.current !== activeBudgetId) {
      reviewAwardedRef.current = activeBudgetId;
      increment({ partner_reviews: 1, total_points: 3 });
    }
    if (summaryToastRef.current !== activeBudgetId) {
      summaryToastRef.current = activeBudgetId;
      toast({ title: `👀 파트너가 ${partnerChanged.size}개 항목을 수정했어요`, description: '바뀐 항목이 잠시 강조돼요' });
    }

    // 3분 후 자동 소거(세션당 1 타이머) + 이후 재강조 중단(피로조절)
    if (!highlightTimerRef.current) {
      highlightTimerRef.current = setTimeout(() => {
        highlightDoneRef.current = activeBudgetId;
        setChangedItemIds(new Set());
        highlightTimerRef.current = null;
      }, HIGHLIGHT_HOLD_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerPresent, activeBudgetId, items, myUserId]);

  // [CL-EDIT5-R7PARTNERGONE-20260626-000000] 파트너 해지/마지막 협업자 제거(partnerPresent true→false) 시
  //  활성 강조를 즉시 소거(3분 타이머 만료 전 잔존 방지). 재페어링 시 정상 재강조되도록 예산별 가드도 리셋(R7-7).
  useEffect(() => {
    if (partnerPresent) return;
    setChangedItemIds(new Set());
    reviewAwardedRef.current = null;
    summaryToastRef.current = null;
    highlightDoneRef.current = null;
    if (highlightTimerRef.current) { clearTimeout(highlightTimerRef.current); highlightTimerRef.current = null; }
  }, [partnerPresent]);

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

  // ────────────────────────────────────────────────────────────────────────────
  // [CL-TOP20-P3-WIZARD-20260703-030000] 첫 예산 생성 위저드 노출 게이트.
  //   개인 모드 && 로딩 완료 && 활성 개인 예산의 항목이 로드됨 && 전 항목 amount=0 && custom 0
  //   && 완료 플래그(wedsem_wizard_done_v1) 미설정일 때만 1회 노출. 공유(우리) 모드에선 절대 미노출.
  //   items.length>0 + budget_id 일치 가드 = 항목 로딩 완료 판별(빈 배열/전환 직후 stale 로 오판 방지).
  //   세션당 1회만 평가(decidedRef) — 값 입력 후 다시 지워도 재팝업하지 않음(피로 방지).
  // ────────────────────────────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const wizardDecidedRef = useRef(false);
  useEffect(() => {
    if (wizardDecidedRef.current || wizardOpen) return;
    if (budgetLoading || !user) return;
    if (mode !== 'personal') return; // 공유(coedit) 모드 절대 미노출
    if (!activeBudget || activeBudget.isShared || activeBudget.user_id !== user.id) return;
    if (items.length === 0 || items[0].budget_id !== activeBudget.id) return; // 항목 로딩 완료 대기
    wizardDecidedRef.current = true;
    if (isWizardDone()) return;
    const untouched = items.every(i => (i.amount ?? 0) === 0 && !i.is_custom);
    if (untouched) setWizardOpen(true);
  }, [wizardOpen, budgetLoading, user, mode, activeBudget, items]);

  // 위저드 적용 = 기존 낙관적 업데이트·ACK 경로(updateAmount→updateItem) 순회 재사용. 새 DB 경로 없음.
  // 개별 실패는 updateItem 이 토스트+롤백으로 처리 → 앱은 항상 정상.
  const handleWizardApply = async (prefills: WizardPrefill[]) => {
    for (const p of prefills) {
      await updateAmount(p.category, p.subCategory, p.amount);
    }
  };

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

  // Auth check — [CL-LOGIN-GATE-20260709-233447] returnTo state 전달
  if (!authLoading && !user) {
    return <NavigateToAuth />;
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
              {/* [CL-BTNAUDIT3-20260704 | 뒤로가기 접근명] */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                aria-label="홈으로 돌아가기"
                className="rounded-full h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
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
              {/* [CL-BTNAUDIT3-20260704 | 뷰토글 aria-pressed] 활성상태를 시각대비 외 스크린리더에도 전달 */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  aria-pressed={viewMode === 'table'}
                  className="gap-1"
                >
                  <Table2 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">표</span>
                </Button>
                <Button
                  variant={viewMode === 'comparison' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('comparison')}
                  aria-pressed={viewMode === 'comparison'}
                  className="gap-1"
                >
                  <BarChart3 className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">비교</span>
                </Button>
              </div>

              {/* [CL-POKE-VIS-20260711-173901] 파트너 콕 찌르기 — 상시 노출(비교 뷰 포함, 무파트너 시 자체 null) */}
              <PokeButton
                compact
                budgetId={activeBudget?.id ?? null}
                partner={collaboration.myPartner}
                onPoked={() => increment({ total_points: 2 })}
              />

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
            {/* [CL-TOP20-P4-COLLAB-20260703-040000] 파트너 최근 활동 칩(2분) — 기존 items 재사용, 신규 구독 0 */}
            <PartnerActivityChip items={items} myUserId={myUserId} partnerName={partnerName} active={partnerPresent} />
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
                      {/* [CL-BTNAUDIT3-20260704 | 인라인편집 접근명] */}
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit} aria-label="이름 저장">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit} aria-label="편집 취소">
                        <X className="h-3 w-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="font-medium text-sm whitespace-nowrap">{budget.name}</span>
                      {activeBudgetId === budget.id && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* [CL-BTNAUDIT3-20260704 | 이름수정 접근명] */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 hover:bg-primary-foreground/20"
                            onClick={() => handleStartEdit(budget.id, budget.name)}
                            aria-label={`${budget.name} 이름 수정`}
                          >
                            <Pencil className="h-3 w-3" aria-hidden="true" />
                          </Button>
                          {/* [CL-OWNERDEL-GUARD-20260622-233012] 개선7: 옵션 삭제는 소유자만(비소유자에겐 숨김) */}
                          {budgets.length > 1 && budget.user_id === user?.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                {/* [CL-BTNAUDIT3-20260704 | 옵션삭제 접근명] */}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 hover:bg-destructive/20"
                                  aria-label={`${budget.name} 옵션 삭제`}
                                >
                                  <Trash2 className="h-3 w-3" aria-hidden="true" />
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
                  /* [CL-POKE-20260709-231909] 콕 찌르기 실발송(sent:true)에만 +2p — 증분(increment)이라 동시 보상 유실 없음 */
                  onPoked={() => increment({ total_points: 2 })}
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
                myUserId={myUserId}
                partnerName={partnerName}
                showEditorLabels={partnerPresent}
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
                    myUserId={myUserId}
                    partnerName={partnerName}
                    showEditorLabels={partnerPresent}
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

      {/* [CL-TOP20-P3-WIZARD-20260703-030000] 첫 예산 생성 위저드 — 신규 사용자(전 항목 0)에게 1회 */}
      <BudgetSetupWizard open={wizardOpen} onOpenChange={setWizardOpen} onApply={handleWizardApply} />

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

      {/* [CL-POKE-VIS-20260711-173901] 비모달 넛지 — 내 편집 + 파트너 3일+ 조용 시 하단 카드 1회 제안 */}
      <PokeNudgeCard
        active={partnerPresent}
        partner={collaboration.myPartner}
        budgetId={activeBudget?.id ?? null}
        items={items}
        myUserId={myUserId}
        myEditedThisSession={editSignal > 0}
        onPoked={() => increment({ total_points: 2 })}
      />
    </div>
  );
}