// [CL-MODAL-COORD-20260703-140000] 전역 자동 알림 모달 상호배제 조율기.
//
// 발생원인: UpdateNotice(500ms)·MobileDesktopNotice(800ms)·OnboardingCarousel(600ms) 등 전역
//   자동 모달이 조율 없이 겹쳐 열리면, Radix 모달 Dialog 오버레이가 스택돼(둘 다 z-50) 나중에 열린
//   모달이 먼저 열린 모달의 버튼("확인" 등)을 덮어 클릭 불가가 된다(실기기 재현: 확인 버튼 좌표에
//   상위 모달의 요소가 위치). 근본 해결 = "한 번에 하나만" 열리도록 우선순위 슬롯을 조율.
//
// 설계: 앱 전역에 단일 모달 슬롯(singleton). 각 알림은 열고 싶을 때(want=true) 슬롯을 요청하고,
//   슬롯을 점유(granted)했을 때만 실제로 Dialog 를 연다. 점유자가 닫히면(release) 대기 중 최고
//   우선순위 알림이 슬롯을 승계한다. 언마운트/재방문 시 정리(release)로 누수·교착을 막는다.
import { useEffect, useState } from 'react';

interface Waiter {
  id: string;
  priority: number;
  onGrantChange: () => void;
}

// 모듈 전역 단일 슬롯 — 전역 알림 모달은 진짜 앱 싱글턴이므로 모듈 스코프가 적절하다
// (단일 점유자 + 언마운트 정리 + 동시 다중 라우트 없음 → 경쟁 조건 없음).
let holderId: string | null = null;
const waiters: Waiter[] = [];
let handoffTimer: ReturnType<typeof setTimeout> | null = null;

// [CL-MODAL-COORD-20260703-140000] 승계 지연 — 이전 모달이 닫히는 순간 즉시 다음을 열면 Radix 종료
//   애니메이션(~200ms)과 겹쳐 body{pointer-events:none} 잠금이 이중화·잔존해 페이지 전체가 클릭 불가가
//   될 수 있다. 닫히는 모달이 완전히 언마운트된 뒤 다음을 열도록 짧게 지연(첫 개방은 지연 없음).
let handoffDelayMs = 300;
/** 테스트 격리용 — 지연 0으로 동기 승계. */
export function __setNoticeHandoffDelay(ms: number): void {
  handoffDelayMs = ms;
}

/** 슬롯이 비어 있으면 대기자 중 최고 우선순위에게 넘긴다(동순위는 먼저 요청한 순서 유지). */
function grantNext(): void {
  if (holderId !== null) return;
  if (waiters.length === 0) return;
  let best = waiters[0];
  for (const w of waiters) {
    if (w.priority > best.priority) best = w;
  }
  holderId = best.id;
  best.onGrantChange();
}

/** 승계는 지연 후(닫히는 모달 언마운트 대기). 이미 예약돼 있으면 중복 예약 안 함. */
function scheduleGrant(): void {
  if (holderId !== null || waiters.length === 0) return;
  if (handoffTimer) return;
  if (handoffDelayMs <= 0) {
    grantNext();
    return;
  }
  handoffTimer = setTimeout(() => {
    handoffTimer = null;
    grantNext();
  }, handoffDelayMs);
}

function requestSlot(id: string, priority: number, onGrantChange: () => void): void {
  if (waiters.some((w) => w.id === id)) return;
  waiters.push({ id, priority, onGrantChange });
  // 슬롯이 비어 있고 닫히는 모달도 없으면(대기 예약 없음) 즉시 개방 — 첫 알림은 지연 불필요.
  if (holderId === null && !handoffTimer) grantNext();
}

function releaseSlot(id: string): void {
  const i = waiters.findIndex((w) => w.id === id);
  if (i >= 0) waiters.splice(i, 1);
  if (holderId === id) {
    holderId = null;
    scheduleGrant(); // 승계는 닫힘 애니메이션 후로 지연
  }
}

/** 테스트/디버깅용 — 현재 점유자. */
export function currentNoticeHolder(): string | null {
  return holderId;
}

/** 테스트 격리용 — 슬롯 상태 초기화. */
export function __resetNoticeSlot(): void {
  holderId = null;
  waiters.length = 0;
  if (handoffTimer) {
    clearTimeout(handoffTimer);
    handoffTimer = null;
  }
}

/**
 * 전역 알림 모달 슬롯을 요청한다.
 * @param id       알림 고유 id
 * @param want     이 알림이 열리고 싶은지(타이머 발화·미열람 등 자체 조건)
 * @param priority 높을수록 먼저 점유(온보딩 투어 > 업데이트 알림 > 데스크톱 안내)
 * @returns granted — true 일 때만 실제 Dialog 를 열어야 한다.
 */
export function useNoticeSlot(id: string, want: boolean, priority = 0): boolean {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!want) {
      releaseSlot(id);
      setGranted(false);
      return;
    }
    requestSlot(id, priority, () => setGranted(holderId === id));
    setGranted(holderId === id);
    return () => {
      releaseSlot(id);
      setGranted(false);
    };
  }, [id, want, priority]);

  return granted;
}
