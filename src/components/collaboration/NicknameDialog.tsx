// [CL-COEDIT-NICK-20260621] 표시 이름(닉네임) 지정 다이얼로그 — 파트너/소유자 모두 사용.
// 상대방에게 '파트너' 대신 이 이름이 보인다. profiles.display_name 에 저장(RLS=본인만, 행은 handle_new_user 트리거가 보장).
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

// [CL-COEDIT-NICK-MAX-20260622-233012] 서버 CHECK(≤40, 20260622091000)와 정합 — 클라/서버 상한 일치(개선8)
const MAX = 40;

interface NicknameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initialValue?: string | null;
  /** 저장 성공 시(예: 참여자 목록 새로고침) */
  onSaved?: (name: string) => void;
}

export function NicknameDialog({ open, onOpenChange, userId, initialValue, onSaved }: NicknameDialogProps) {
  const [name, setName] = useState(initialValue?.trim() ?? '');
  const [saving, setSaving] = useState(false);

  // 열릴 때 기존 값으로 프리필
  useEffect(() => {
    if (open) setName(initialValue?.trim() ?? '');
  }, [open, initialValue]);

  const trimmed = name.trim();
  const canSave = trimmed.length >= 1 && trimmed.length <= MAX && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // [CL-AUDIT-NICK-ERR-20260622] Supabase 는 RLS/DB 오류를 throw 가 아닌 {error} 로 반환 →
      //   error 없을 때만 onSaved 호출(미저장인데 참여자 목록을 거짓 갱신하지 않도록).
      const { error } = await supabase.from('profiles').update({ display_name: trimmed }).eq('user_id', userId);
      if (!error) onSaved?.(trimmed);
    } catch {
      /* 네트워크 예외 — 흐름은 진행(닉네임은 나중에 다시 설정 가능) */
    } finally {
      setSaving(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>닉네임을 정해 주세요 👋</DialogTitle>
          <DialogDescription>
            함께 쓰는 상대방에게 이 이름으로 표시돼요. (예: 신랑, 신부, 자기)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, MAX))}
            placeholder="예: 신랑"
            maxLength={MAX}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSave) handleSave();
            }}
          />
          {/* 상대방 미리보기 */}
          <p className="text-xs text-muted-foreground">
            상대방 화면: <span className="font-medium text-foreground">{trimmed || '파트너'}</span>님과 함께 보는 예산
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            나중에
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
