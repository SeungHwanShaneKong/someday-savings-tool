// [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대/협업자 관리 UI
//
// 오너: "파트너 초대" → 초대 링크 발급·복사. 협업자 목록·해제.
// 협업자(비오너): 목록만 표시(초대/해제 불가 — RLS+UI 이중).
// ※ 추가형 — BudgetFlow 등에서 마운트해 사용.
// [CL-PARTNER-1TO1-20260622-233012] 전역 1:1 파트너(현재 파트너·이메일·해지) + [CL-COEDIT-NICK] 내 닉네임 변경.
import { useState, useEffect, useRef } from 'react';
import { UserPlus, Copy, Check, Users, X, UserMinus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCollaboration, type UseCollaborationResult } from '@/hooks/useCollaboration';

interface CollaboratorManagerProps {
  budgetId: string | null;
  /** 현재 사용자가 이 예산의 소유자인지(초대/해제 권한) */
  isOwner: boolean;
  /** [CL-COEDIT-INVITE-DISCOVER-20260620] 진입 즉시 초대 링크 1회 자동 생성('파트너 초대하기' 바로가기용) */
  autoInvite?: boolean;
  /** autoInvite 1회 처리 완료 콜백 — 부모가 플래그를 내린다 */
  onAutoInviteHandled?: () => void;
  /** [CL-COEDIT-COPY-20260620] 개인 예산일 때 "복사하여 공동편집(원본 보존)" 1순위 버튼 노출 */
  showCopyToCoedit?: boolean;
  onCopyToCoedit?: () => void;
  /** [CL-COEDIT-NICK-20260622-233012] 내 닉네임 변경 트리거(상위가 NicknameDialog 오픈). 없으면 미노출(개선8) */
  onEditMyNickname?: () => void;
  /** [CL-AUDIT-RPC-DEDUP-20260622] 상위에서 단일 useCollaboration 을 주입(중복 RPC 제거). */
  external?: UseCollaborationResult;
}

export function CollaboratorManager({ budgetId, isOwner, autoInvite, onAutoInviteHandled, showCopyToCoedit, onCopyToCoedit, onEditMyNickname, external }: CollaboratorManagerProps) {
  // external 주입 시 내부 훅은 null 로 비활성(RPC 최소화). 미주입 시 자체 조회(독립 사용·테스트 호환).
  const internal = useCollaboration(external ? null : budgetId);
  const { collaborators, inviteUrl, busy, myPartner, createInvite, removeCollaborator, releasePartner } = external ?? internal;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // [CL-COEDIT-INVITE-DISCOVER-20260620] '파트너 초대하기' 바로가기: 소유자·예산이 준비되면 초대 링크를 1회 자동 생성.
  useEffect(() => {
    if (!autoInvite) return;
    if (isOwner && budgetId && !inviteUrl && !busy) {
      void createInvite().then((url) => {
        if (!url) toast({ title: '초대 링크 생성에 실패했어요', variant: 'destructive' });
      });
      onAutoInviteHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInvite, isOwner, budgetId, inviteUrl, busy]);

  const handleInvite = async () => {
    const url = await createInvite();
    if (!url) {
      toast({ title: '초대 링크 생성에 실패했어요', variant: 'destructive' });
    }
  };

  // [CL-QUALITY-TIMER-20260621] '복사됨' 배지 타이머 — 언마운트/연속클릭 시 정리(고아 setState·조기복귀 방지)
  const copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: '복사에 실패했어요', description: '링크를 길게 눌러 직접 복사해주세요.', variant: 'destructive' });
    }
  };

  // [CL-PARTNER-1TO1-20260622-233012] 파트너 해지 — 양방향 링크 제거(예산 본문은 소유자 보관)
  const handleRelease = async () => {
    const ok = await releasePartner();
    toast(
      ok
        ? { title: '파트너를 해지했어요', description: '이제 다른 분과 새로 함께할 수 있어요.' }
        : { title: '해지 중 오류가 발생했어요', variant: 'destructive' },
    );
  };

  // [CL-COEDIT-PARTICIPANTS-20260620] 나를 제외한 "상대" 참여자. display_name 우선('파트너' 폴백) + 이메일(개선5).
  const others = collaborators.filter((c) => !c.isMe);
  const roleLabel = (role: string) => (role === 'owner' ? '관리자' : role === 'viewer' ? '뷰어' : '편집');

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-foreground">파트너와 공동관리</h3>
        </div>
        {/* [CL-COEDIT-NICK-20260622-233012] 내 닉네임 상시 변경(개선8) */}
        {onEditMyNickname && (
          <button
            onClick={onEditMyNickname}
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            aria-label="내 닉네임 변경"
          >
            <Pencil className="w-3 h-3" /> 내 닉네임
          </button>
        )}
      </div>

      {/* 참여자 목록 — 본인 제외, 실제 이름(닉네임)+이메일 표시 */}
      {others.length > 0 ? (
        <ul className="space-y-2 mb-3">
          {others.map((c) => {
            const name = c.display_name?.trim() || '파트너';
            return (
              <li key={c.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground truncate">
                  {c.role === 'owner' ? '👑' : '👫'} {name}
                  {c.email && <span className="ml-1 text-[11px] text-muted-foreground/70">· {c.email}</span>}
                  <span className="ml-1 text-[11px] text-muted-foreground/60">· {roleLabel(c.role)}</span>
                </span>
                {/* 해제: 오너만, 협업자(오너 row 제외)만 — [CL-BTNPERFECT-20260629] 파괴적 액션 → 확인 다이얼로그(실수 제거 방지) */}
                {isOwner && c.role !== 'owner' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`${name} 공동관리 해제`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{name}님과의 공동관리를 해제할까요?</AlertDialogTitle>
                        <AlertDialogDescription>
                          해제하면 이 분은 더 이상 함께 편집할 수 없어요. 내가 만든 옵션은 그대로 보관돼요.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeCollaborator(c.user_id)} className="bg-destructive hover:bg-destructive/90">
                          해제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground mb-3">
          아직 함께하는 파트너가 없어요. 초대 링크를 보내 같이 편집해보세요.
        </p>
      )}

      {/* [CL-PARTNER-1TO1-20260622-233012] 현재 파트너(전역 1:1) + 해지 — 오너/협업자 공통 */}
      {myPartner && (
        <div className="mb-3 p-2.5 bg-secondary/60 rounded-lg">
          <p className="text-[11px] text-muted-foreground mb-1.5">
            현재 파트너:{' '}
            <span className="font-medium text-foreground">{myPartner.display_name?.trim() || '파트너'}</span>
            {myPartner.email && <span className="text-muted-foreground/70"> · {myPartner.email}</span>}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-destructive hover:text-destructive">
                <UserMinus className="w-3.5 h-3.5" /> 파트너 해지
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>파트너를 해지할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  해지하면 함께 보던 '우리' 옵션에서 서로의 접근이 끊겨요. 내가 만든 옵션은 그대로 보관돼요.
                  다른 분과 새로 공동편집하려면 먼저 해지해야 해요.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleRelease} className="bg-destructive hover:bg-destructive/90">
                  파트너 해지
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* 초대 (오너만) */}
      {isOwner && (
        <>
          {/* [CL-COEDIT-COPY-20260620] 개인 예산: 원본 보존하고 복사본을 공유(1순위) */}
          {showCopyToCoedit && (
            <>
              <Button onClick={onCopyToCoedit} className="w-full gap-2" size="sm">
                <Copy className="w-4 h-4" />
                복사하여 공동편집 (원본 보존)
              </Button>
              <p className="text-[11px] text-muted-foreground/70 mt-1.5 mb-2.5">
                이 개인 예산을 복사해 공동편집본을 만들어요. 원본은 '개인'에 그대로 남아요.
              </p>
            </>
          )}

          {/* [CL-PARTNER-1TO1-20260622-233012] 1:1 — 이미 파트너가 있으면 신규 초대 비노출(교체는 '해지' 후) */}
          {myPartner ? (
            <p className="text-[11px] text-muted-foreground/70">
              이미 파트너와 함께하고 있어요. 다른 분과 함께하려면 위 '파트너 해지' 후 초대해주세요.
            </p>
          ) : (
            <>
              <Button
                onClick={handleInvite}
                disabled={busy || !budgetId}
                className="w-full gap-2"
                size="sm"
                variant={showCopyToCoedit ? 'outline' : 'default'}
              >
                <UserPlus className="w-4 h-4" />
                {busy ? '링크 생성 중...' : showCopyToCoedit ? '이 예산 그대로 공유' : '파트너 초대 링크 만들기'}
              </Button>

              {inviteUrl && (
                <div className="mt-3 flex items-center gap-2 p-2.5 bg-secondary rounded-lg">
                  <span className="flex-1 text-xs font-mono text-foreground truncate">{inviteUrl}</span>
                  <Button onClick={handleCopy} size="sm" variant="secondary" className="h-8 gap-1.5 flex-shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? '복사됨' : '복사'}
                  </Button>
                </div>
              )}
              {inviteUrl && (
                <p className="text-[11px] text-muted-foreground/70 mt-2">
                  이 링크를 받은 사람은 구글 로그인 후 이 예산을 함께 편집할 수 있어요. (7일간 유효)
                  <br />💡 카톡 등 앱 안에서 링크가 안 열리면 사파리·크롬 등 외부 브라우저로 열어주세요.
                </p>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}
