// [CL-LOGIN-GATE-20260709-233447 | by:frontend-engineer]
// TrustChips — Google 로그인 거부감 최소화를 위한 신뢰 신호 3종 + 개인정보 안내 링크.
// 랜딩 HeroSignupCard 와 /auth 페이지가 공용으로 사용한다(카피 단일소스 — 중복 하드코딩 금지).
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const TRUST_CHIPS = [
  { emoji: '🔒', label: '이메일 주소만 사용해요' },
  { emoji: '⚡', label: '비밀번호 없이 10초' },
  { emoji: '💸', label: '평생 무료·카드 등록 없음' },
] as const;

interface TrustChipsProps {
  className?: string;
}

export function TrustChips({ className }: TrustChipsProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      <ul
        aria-label="안심하고 시작할 수 있는 이유"
        className="flex flex-wrap items-center justify-center gap-1.5"
      >
        {TRUST_CHIPS.map((chip) => (
          <li
            key={chip.label}
            className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
          >
            <span aria-hidden="true">{chip.emoji}</span>
            {chip.label}
          </li>
        ))}
      </ul>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground/80">
        개인정보는 예산 저장에만 사용돼요 ·{' '}
        <Link
          to="/privacy"
          className="underline underline-offset-2 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          개인정보처리방침
        </Link>
      </p>
    </div>
  );
}
