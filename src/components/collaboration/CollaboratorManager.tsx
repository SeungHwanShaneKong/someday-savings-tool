// [CL-COEDIT-E2E-20260620-130000] 공동 예산 초대/협업자 관리 UI
//
// 오너: "파트너 초대" → 초대 링크 발급·복사. 협업자 목록·해제.
// 협업자(비오너): 목록만 표시(초대/해제 불가 — RLS+UI 이중).
// ※ 추가형 — BudgetFlow/Summary 등에서 마운트해 사용.
import { useState, useEffect } from 'react';
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
}

export function CollaboratorManager({ budgetId, isOwner, autoInvite, onAutoInviteHandled }: CollaboratorManagerProps) {
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

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: '복사에 실패했어요', description: '링크를 길게 눌러 직접 복사해주세요.', variant: 'destructive' });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground">파트너와 공동관리</h3>
      </div>

      {/* 협업자 목록 */}
      {collaborators.length > 0 ? (
        <ul className="space-y-2 mb-3">
          {collaborators.map((c) => (
            <li key={c.user_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground truncate">👫 파트너 ({c.role})</span>
              {isOwner && (
                <button
                  onClick={() => removeCollaborator(c.user_id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="공동관리 해제"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground mb-3">
          아직 함께하는 파트너가 없어요. 초대 링크를 보내 같이 편집해보세요.
        </p>
      )}

      {/* 초대 (오너만) */}
      {isOwner && (
        <>
          <Button onClick={handleInvite} disabled={busy || !budgetId} className="w-full gap-2" size="sm">
            <UserPlus className="w-4 h-4" />
            {busy ? '링크 생성 중...' : '파트너 초대 링크 만들기'}
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
            </p>
          )}
        </>
      )}
    </Card>
  );
}
