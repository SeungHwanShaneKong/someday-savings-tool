// [CL-TOP20-P1-CHATPRE-20260703-010000] ChatPreview 단위 테스트
// ① 칩 3개 + 미리보기 라벨 ② 칩 클릭 → 답변 출력(reduced-motion 즉시 / fake timer 타이핑)
// ③ 3칩 소진 시 chat_preview_limit 1회 + CTA 노출 ④ chat_preview_send 계측(gtag mock)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@/test/test-utils';
import { ChatPreview } from '../ChatPreview';
import { CHAT_PREVIEW_QAS } from '@/lib/chat-preview-data';

// useReducedMotion 을 테스트별로 제어 — true 면 즉시 전체 표시 경로
let reducedMotion = true;
vi.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: () => reducedMotion,
}));

function installGtag() {
  const gtag = vi.fn();
  (window as { gtag?: unknown }).gtag = gtag;
  return gtag;
}

describe('ChatPreview', () => {
  beforeEach(() => {
    reducedMotion = true;
  });

  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
    vi.useRealTimers();
  });

  it('질문 칩 3개와 정직한 미리보기 라벨을 렌더하고, 답변 전에는 CTA 가 없다', () => {
    render(<ChatPreview onSignupClick={vi.fn()} />);
    expect(screen.getByText('미리보기 — 실제 AI 답변 예시')).toBeInTheDocument();
    expect(CHAT_PREVIEW_QAS).toHaveLength(3);
    for (const qa of CHAT_PREVIEW_QAS) {
      expect(screen.getByRole('button', { name: qa.question })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /무료 가입/ })).not.toBeInTheDocument();
  });

  it('칩 클릭 시 답변 전체와 출처 라벨이 즉시 표시된다 (reduced-motion 경로)', () => {
    render(<ChatPreview onSignupClick={vi.fn()} />);
    const qa = CHAT_PREVIEW_QAS[0];
    fireEvent.click(screen.getByRole('button', { name: qa.question }));

    const lines = qa.answer.split('\n');
    expect(lines).toHaveLength(3); // 실제 AI 3-불릿 형식 유지 가드
    for (const line of lines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByText(`📎 출처: ${qa.source}`)).toBeInTheDocument();
    // 사용한 칩은 비활성화된다
    expect(screen.getByRole('button', { name: qa.question })).toBeDisabled();
  });

  it('모션 허용 시 setInterval 타이핑으로 점진 출력 후 완료된다 (fake timers)', () => {
    reducedMotion = false;
    vi.useFakeTimers();
    render(<ChatPreview onSignupClick={vi.fn()} />);
    const qa = CHAT_PREVIEW_QAS[1];
    fireEvent.click(screen.getByRole('button', { name: qa.question }));

    // 아직 타이핑 전 — 완료 시에만 붙는 출처 라벨이 없어야 한다
    expect(screen.queryByText(`📎 출처: ${qa.source}`)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(10_000); // 답변 전체 길이를 훨씬 넘는 시간
    });

    expect(screen.getByText(qa.answer.split('\n')[2])).toBeInTheDocument();
    expect(screen.getByText(`📎 출처: ${qa.source}`)).toBeInTheDocument();
  });

  it('칩 3개 소진 시 chat_preview_limit 1회 계측 + 무료 가입 CTA 가 노출된다', () => {
    const gtag = installGtag();
    const onSignupClick = vi.fn();
    render(<ChatPreview onSignupClick={onSignupClick} />);

    for (const qa of CHAT_PREVIEW_QAS) {
      fireEvent.click(screen.getByRole('button', { name: qa.question }));
    }

    const limitCalls = gtag.mock.calls.filter((c) => c[1] === 'chat_preview_limit');
    expect(limitCalls).toHaveLength(1);
    expect(limitCalls[0][2]).toMatchObject({ app_area: 'visitor_funnel' });
    expect(screen.getByText(/미리보기 질문을 모두 확인하셨어요/)).toBeInTheDocument();

    const cta = screen.getByRole('button', { name: '더 물어보고 싶다면 → 무료 가입' });
    fireEvent.click(cta);
    expect(onSignupClick).toHaveBeenCalledTimes(1);
  });

  it('칩 클릭 시 chat_preview_send 가 칩 인덱스와 함께 계측된다', () => {
    const gtag = installGtag();
    render(<ChatPreview onSignupClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: CHAT_PREVIEW_QAS[1].question }));
    expect(gtag).toHaveBeenCalledWith('event', 'chat_preview_send', {
      app_area: 'visitor_funnel',
      q: 1,
    });

    // 같은 칩 재클릭(disabled) 시 중복 계측 없음
    fireEvent.click(screen.getByRole('button', { name: CHAT_PREVIEW_QAS[1].question }));
    const sendCalls = gtag.mock.calls.filter((c) => c[1] === 'chat_preview_send');
    expect(sendCalls).toHaveLength(1);
  });
});
