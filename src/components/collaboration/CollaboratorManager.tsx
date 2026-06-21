// [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대/협업자 관리 UI
//
// 오너: "파트너 초대" → 초대 링크 발급·복사. 협업자 목록·해제.
// 협업자(비오너): 목록만 표시(초대/해제 불가 — RLS+UI 이중).
// ※ 추가형 — BudgetFlow/Summary 등에서 마운트해 사용.
import { useState, useEffect, useRef } from 'react';
import { UserPlus, Copy, Check, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCollaboration } from '@/hooks/useCollaboration';

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
}

export function CollaboratorManager({ budgetId, isOwner, autoInvite, onAutoInviteHandled, showCopyToCoedit, onCopyToCoedit }: CollaboratorManagerProps) {
  const { collaborators, inviteUrl, busy, createInvite, removeCollaborator } = useCollaboration(budgetId);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // [CL-COEDIT-INVITE-DISCOVER-20260620] '파트너 초대하기' 바로가기: 소유자·예산이 준비되면 초대 링크를 1회 자동 생성.
  // 멱등(409 시 기존 토큰 재노출)·소유자 한정·inviteUrl/busy 가드로 중복 발사 없음. onAutoInviteHandled 로 부모 플래그 해제.
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

  // [CL-COEDIT-PARTICIPANTS-20260620] 나를 제외한 "상대" 참여자(오너 시 협업자들 / 협업자 시 오너+다른협업자).
  // get_budget_participants RPC 가 display_name 제공 → 실제 이름 표시. 폴백 시 '파트너'.
  const others = collaborators.filter((c) => !c.isMe);
  const roleLabel = (role: string) => (role === 'owner' ? '관리자' : role === 'viewer' ? '뷰어' : '편집');

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">파트너와 공동관리</h3>
      </div>

      {/* 참여자 목록 — 본인 제외, 실제 이름(닉네임) 표시 */}
      {others.length > 0 ? (
        <ul className="space-y-2 mb-3">
          {others.map((c) => {
            const name = c.display_name?.trim() || '파트너';
            return (
              <li key={c.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground truncate">
                  {c.role === 'owner' ? '👑' : '👫'} {name}
                  <span className="ml-1 text-[11px] text-muted-foreground/60">· {roleLabel(c.role)}</span>
                </span>
                {/* 해제: 오너만, 협업자(오너 row 제외)만 */}
                {isOwner && c.role !== 'owner' && (
                  <button
                    onClick={() => removeCollaborator(c.user_id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`${name} 공동관리 해제`}
                  >
                    <X className="w-4 h-4" />
                  </button>
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
    </Card>
  );
}
