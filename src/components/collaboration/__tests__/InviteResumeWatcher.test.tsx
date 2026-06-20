// [CL-COEDIT-QA200-20260620] InviteResumeWatcher — OAuth 복귀 후 초대 토큰 재개 워처
// 계약: user null→set 전이 시 consumeInviteToken(sessionStorage, Date.now()) → 토큰 있으면 navigate(/invite/:token, {replace}).
// handledRef 로 1회만 재개(StrictMode 이중마운트·재마운트 무내비). useAuth/useNavigate 모킹 + sessionStorage 시드.
// 순수 분기(TTL/형식/consume-once)는 invite-resume 단위테스트에서 별도 검증 — 여기선 워처 통합 계약만.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  INVITE_TOKEN_KEY,
  INVITE_TS_KEY,
  INVITE_RESUME_TTL_MS,
} from '@/lib/collab/invite-resume';
import { InviteResumeWatcher } from '../InviteResumeWatcher';

// vi.mock 팩토리는 호이스팅 → 제어 상태는 vi.hoisted 로 안전 주입
const h = vi.hoisted(() => ({
  auth: { user: null as null | { id: string } },
  navigate: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => h.auth }));

// react-router-dom 의 나머지(MemoryRouter 등)는 보존하고 useNavigate 만 스파이로 교체
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => h.navigate };
});

const VALID = 'tok_abcdef0123456789'; // 17자 [A-Za-z0-9_-] → 유효
const NOW = new Date('2026-06-20T00:00:00Z');

/** sessionStorage 에 stash 한 토큰 시드(ts 오프셋 분 단위, 음수=과거) */
function seedToken(token: string, ageMs = 0) {
  sessionStorage.setItem(INVITE_TOKEN_KEY, token);
  sessionStorage.setItem(INVITE_TS_KEY, String(NOW.getTime() - ageMs));
}

/** MemoryRouter 로 감싼 워처 렌더(StrictMode 옵션) */
function renderWatcher(strict = false) {
  const tree = (
    <MemoryRouter initialEntries={['/auth']}>
      <InviteResumeWatcher />
    </MemoryRouter>
  );
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  h.auth.user = null;
  h.navigate = vi.fn();
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('InviteResumeWatcher (초대 재개 워처)', () => {
  // 주의: vi.useFakeTimers() 하에서 RTL waitFor 는 폴링 타이머가 멈춰 영원히 대기한다.
  //       InviteResumeWatcher 의 effect 는 render/rerender 의 act() 래핑 안에서 동기 실행되므로
  //       (마운트 직후 1회) waitFor 없이 호출 직후 단언이 결정론적이고 안전하다.

  it('I46 user null→set 전이 + 보존 토큰 → consume 후 /invite/:token replace 내비', () => {
    seedToken(VALID);
    h.auth.user = null;
    const { rerender } = renderWatcher();

    // 미로그인: effect 의 user 가드(!user)로 아직 어떤 내비도 없음
    expect(h.navigate).not.toHaveBeenCalled();

    // OAuth 복귀: user 전이 → effect 의존성([user]) 변화로 재개
    h.auth.user = { id: 'partner-1' };
    rerender(
      <MemoryRouter initialEntries={['/auth']}>
        <InviteResumeWatcher />
      </MemoryRouter>,
    );

    expect(h.navigate).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith(`/invite/${VALID}`, { replace: true });
    // consume-once: stash 가 정리되어 재개 흔적이 남지 않음
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(INVITE_TS_KEY)).toBeNull();
  });

  it('I47 로그인 상태이나 보존 토큰 없음 → 무내비(consume 결과 null)', () => {
    // sessionStorage 비어 있음(seed 생략) → consumeInviteToken 이 null 반환
    h.auth.user = { id: 'partner-1' };
    renderWatcher();

    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('I48 TTL 만료 stash(30분 초과) → consume 정리만, 무내비', () => {
    // TTL 경계 + 1ms 초과 → now - ts > TTL → 만료로 간주되어 토큰 폐기
    seedToken(VALID, INVITE_RESUME_TTL_MS + 1);
    h.auth.user = { id: 'partner-1' };
    renderWatcher();

    expect(h.navigate).not.toHaveBeenCalled();
    // 만료 stash 도 consume 시 항상 정리됨(중복 재개 방지)
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(INVITE_TS_KEY)).toBeNull();
  });

  it('I49 StrictMode 이중 마운트 → 재개 정확히 1회(consume store-clear + handledRef 이중가드)', () => {
    seedToken(VALID);
    h.auth.user = { id: 'partner-1' };
    renderWatcher(true); // StrictMode: 개발 모드 effect 이중 호출(mount→unmount→remount) 시뮬레이션

    // 정확히 1회. (이중내비 차단 = consume 의 즉시 store-clear + handledRef 의 이중 가드. 단독 검증은 I52.)
    expect(h.navigate).toHaveBeenCalledTimes(1);
    expect(h.navigate).toHaveBeenCalledWith(`/invite/${VALID}`, { replace: true });
  });

  it('I50 소비 후 재마운트 → stash 비어 무내비(중복 재개 방지)', () => {
    seedToken(VALID);
    h.auth.user = { id: 'partner-1' };

    // 1차 마운트: 재개 발생(토큰 consume)
    const first = renderWatcher();
    expect(h.navigate).toHaveBeenCalledTimes(1);
    first.unmount();

    // 토큰은 1차에서 consume(store clear)됨 → 새 워처 인스턴스는 빈 store 를 읽어 재개하지 않음
    // (이 무내비의 원인은 store-clear. handledRef 의 단독 효과는 I52 가 검증한다.)
    h.navigate = vi.fn();
    renderWatcher();
    expect(h.navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
  });

  it('I52 handledRef 는 load-bearing: 재개 후 동일 토큰 재시드+재렌더에도 정확히 1회만 내비', () => {
    // 검증관 mutation 지적: consume 의 store-clear 만으로도 이중내비가 막혀 I49/I50 이 handledRef 를
    // 단독 검증하지 못함. 이 테스트는 store 를 다시 채워(파트너 재stash 시뮬) consume 가 또 성공할 수 있는
    // 상황에서도 handledRef 가 2차 재개를 막음을 증명한다. (handledRef 제거 시 이 단언들이 실패한다.)
    seedToken(VALID);
    h.auth.user = { id: 'partner-1' };
    const { rerender } = renderWatcher();
    expect(h.navigate).toHaveBeenCalledTimes(1); // 1차 재개(consume → store clear)

    // store 재시드 + navigate identity 변경 → effect 재실행 유도(같은 인스턴스 유지 → handledRef 보존).
    seedToken(VALID);
    h.navigate = vi.fn();
    rerender(
      <MemoryRouter initialEntries={['/auth']}>
        <InviteResumeWatcher />
      </MemoryRouter>,
    );

    // handledRef.current=true → effect 조기 return → consume 미호출.
    expect(h.navigate).not.toHaveBeenCalled();
    // 따라서 재시드한 토큰은 소비되지 않고 그대로 남아야 한다(가드가 load-bearing 임을 결정적으로 증명).
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBe(VALID);
  });

  it('I51 형식 불량 토큰 stash → consume 거부, 무내비(오염 토큰 차단)', () => {
    // 슬래시/공백 포함 → isValidTokenFormat 거부 → consume null
    sessionStorage.setItem(INVITE_TOKEN_KEY, 'bad/../token with space');
    sessionStorage.setItem(INVITE_TS_KEY, String(NOW.getTime()));
    h.auth.user = { id: 'partner-1' };
    renderWatcher();

    expect(h.navigate).not.toHaveBeenCalled();
    // 불량 토큰도 consume 시 항상 정리되어 다음 마운트로 새지 않음
    expect(sessionStorage.getItem(INVITE_TOKEN_KEY)).toBeNull();
  });
});
