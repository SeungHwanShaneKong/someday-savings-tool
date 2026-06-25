// [CL-PRAISE-20260623-230113] 적극 편집자 칭찬 — 회전(무반복) 메시지 + 점증 마일스톤 (순수, CI 검증 가능)
//
// 개선4: 활동을 유도하되 피로는 최소화. 매 편집이 아니라 '마일스톤'에서만, 매번 '다른' 문구로 은은히 칭찬.
//   - isMilestone: 간격이 점점 벌어지는 마일스톤(3,7,15,...)에서만 true → 후반부일수록 덜 자주.
//   - makePraiseBag: 셔플백(전부 소진 전 반복 없음 + 사이클 경계에서도 직전 문구 비반복).

export interface PraiseMessage {
  emoji: string;
  title: string;
  description: string;
}

export const PRAISE_MESSAGES: PraiseMessage[] = [
  { emoji: '💪', title: '오늘도 차근차근!', description: '하나씩 채워가는 모습이 멋져요.' },
  { emoji: '✨', title: '계획에 속도가 붙네요', description: '이 페이스라면 완벽한 준비가 될 거예요.' },
  { emoji: '🎯', title: '디테일까지 꼼꼼하게', description: '작은 항목도 놓치지 않는 눈썰미예요.' },
  { emoji: '🌱', title: '예산이 자라고 있어요', description: '차곡차곡 쌓이는 중이에요.' },
  { emoji: '👏', title: '집중력이 대단해요', description: '벌써 이만큼 정리했어요!' },
  { emoji: '🚀', title: '한 발 더 나아갔어요', description: '결혼 준비가 한결 가벼워지고 있어요.' },
  { emoji: '💎', title: '알찬 입력이에요', description: '꼼꼼한 기록이 나중에 큰 도움이 돼요.' },
  { emoji: '🔥', title: '편집 불꽃이 타올라요', description: '지금처럼만 하면 충분해요.' },
  { emoji: '🧩', title: '퍼즐이 맞춰지네요', description: '큰 그림이 점점 또렷해져요.' },
  { emoji: '🌸', title: '두 분의 그림이 예뻐요', description: '함께 만들어가는 예산이 빛나요.' },
  { emoji: '⭐', title: '오늘의 MVP!', description: '적극적인 모습이 인상적이에요.' },
  { emoji: '🎉', title: '좋은 흐름이에요', description: '이대로 쭉 이어가 볼까요?' },
];

// 점증 간격 마일스톤 — 후반부일수록 빈도↓(피로 최소화)
const MILESTONES = [3, 7, 15, 30, 50, 80, 120, 170, 230, 300];

/** 세션 누적 편집 횟수가 마일스톤에 정확히 도달했는가. */
export function isMilestone(editCount: number): boolean {
  return MILESTONES.includes(editCount);
}

// [CL-VULN-V9-MILESTONE-CROSS-20260624-000000] '정확 일치'(isMilestone)는 React 배치 리렌더로
//  editSignal 이 마일스톤 값을 건너뛰면(예: 6→8) 평가 기회를 영구히 놓친다. '범위 통과'로 전환:
//  prevCount<m<=nextCount 인 마일스톤 중 가장 큰 값(다중 점프도 1회만 보상 → 토스트 폭주 방지)을 반환.
/** prevCount→nextCount 사이에 새로 통과한 마일스톤(가장 큰 값). 통과 없으면 null. */
export function crossedMilestone(prevCount: number, nextCount: number): number | null {
  let hit: number | null = null;
  for (const m of MILESTONES) {
    if (prevCount < m && nextCount >= m && (hit === null || m > hit)) hit = m;
  }
  return hit;
}

export interface PraiseBag {
  /** 다음 칭찬 메시지(전부 소진 전 반복 없음, 사이클 경계 비반복) */
  next(): PraiseMessage;
}

/** 셔플백 생성. rng(0..1) 주입 시 결정론적(테스트). */
export function makePraiseBag(
  messages: readonly PraiseMessage[] = PRAISE_MESSAGES,
  rng: () => number = Math.random,
): PraiseBag {
  let bag: PraiseMessage[] = [];
  let last: PraiseMessage | null = null;

  const refill = () => {
    bag = messages.slice();
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    // 사이클 경계에서 직전 문구가 또 처음에 오면 두 번째와 교환(연속 반복 방지)
    if (last && bag.length > 1 && bag[0] === last) {
      [bag[0], bag[1]] = [bag[1], bag[0]];
    }
  };

  return {
    next(): PraiseMessage {
      if (bag.length === 0) refill();
      const m = bag.shift() as PraiseMessage;
      last = m;
      return m;
    },
  };
}
