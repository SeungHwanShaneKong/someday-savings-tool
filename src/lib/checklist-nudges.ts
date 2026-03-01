/**
 * 행동경제학 기반 넛지 + 칭찬 + 스트릭 메시지
 * BRD §2.2: 손실 회피, 사회적 증거, 게이미피케이션
 */

// ─── 넛지 메시지 (손실 회피 + 사회적 증거) ───

export interface NudgeMessage {
  type: 'loss_aversion' | 'social_proof' | 'urgency' | 'encouragement';
  message: string;
  emoji: string;
}

/**
 * D-day 미입력 시 넛지
 */
export const NO_DDAY_NUDGES: NudgeMessage[] = [
  {
    type: 'social_proof',
    message: '1,200명의 예비 신부님이 이미 예약 중이에요',
    emoji: '👰',
  },
  {
    type: 'loss_aversion',
    message: '인기 예식장은 12개월 전에 마감돼요. D-day를 먼저 설정하세요!',
    emoji: '⏰',
  },
  {
    type: 'urgency',
    message: '결혼 준비의 첫걸음! D-day를 설정하면 맞춤 체크리스트가 생성돼요',
    emoji: '📅',
  },
];

/**
 * 미완료 항목이 쌓일 때 넛지
 */
export const INCOMPLETE_NUDGES: NudgeMessage[] = [
  {
    type: 'loss_aversion',
    message: '지금 미루면 선호 업체를 놓칠 수 있어요',
    emoji: '😰',
  },
  {
    type: 'social_proof',
    message: '같은 시기 커플 85%가 이미 이 항목을 완료했어요',
    emoji: '📊',
  },
  {
    type: 'urgency',
    message: '마감까지 얼마 남지 않았어요. 지금 확인해보세요!',
    emoji: '🔔',
  },
];

// ─── 칭찬 메시지 (게이미피케이션) ───

export interface PraiseMessage {
  minCompleted: number; // 최소 완료 수
  title: string;
  description: string;
  emoji: string;
}

export const PRAISE_MESSAGES: PraiseMessage[] = [
  {
    minCompleted: 1,
    title: '첫 발걸음!',
    description: '결혼 준비의 첫 번째 항목을 완료했어요. 멋진 시작이에요!',
    emoji: '🎯',
  },
  {
    minCompleted: 5,
    title: '순항 중!',
    description: '벌써 5개나 완료! 이 속도면 걱정 없어요.',
    emoji: '🚀',
  },
  {
    minCompleted: 10,
    title: '준비의 달인!',
    description: '10개 항목 클리어! 체계적인 준비가 빛나고 있어요.',
    emoji: '⭐',
  },
  {
    minCompleted: 20,
    title: '반 이상 완료!',
    description: '절반을 넘겼어요! 고생 많으셨어요. 이제 내리막이에요!',
    emoji: '🎊',
  },
  {
    minCompleted: 30,
    title: '거의 다 왔어요!',
    description: '마무리만 남았어요. 당신의 완벽한 결혼식이 눈앞이에요!',
    emoji: '💒',
  },
  {
    minCompleted: 50,
    title: '완벽한 준비!',
    description: '50개 이상 완료! 이보다 완벽한 결혼 준비는 없어요.',
    emoji: '👑',
  },
];

// ─── 스트릭 메시지 (연속 완료) ───

export interface StreakMessage {
  streak: number; // 연속 완료 수
  message: string;
  emoji: string;
}

export const STREAK_MESSAGES: StreakMessage[] = [
  { streak: 3, message: '3연속 완료! 대단해요! 🔥', emoji: '🔥' },
  { streak: 5, message: '5연속! 멈출 수 없는 속도! 💨', emoji: '💨' },
  { streak: 7, message: '7연속 클리어! 진정한 웨딩 마스터! 🏆', emoji: '🏆' },
  { streak: 10, message: '10연속!! 전설의 시작이에요! ✨', emoji: '✨' },
];

// ─── 유틸리티 함수 ───

/**
 * 랜덤 D-day 미입력 넛지 선택
 */
export function getRandomNoDdayNudge(): NudgeMessage {
  return NO_DDAY_NUDGES[Math.floor(Math.random() * NO_DDAY_NUDGES.length)];
}

/**
 * 랜덤 미완료 넛지 선택
 */
export function getRandomIncompleteNudge(): NudgeMessage {
  return INCOMPLETE_NUDGES[Math.floor(Math.random() * INCOMPLETE_NUDGES.length)];
}

/**
 * 현재 완료 수에 맞는 칭찬 메시지 반환 (가장 높은 달성 단계)
 */
export function getPraiseForCount(completedCount: number): PraiseMessage | null {
  const sorted = [...PRAISE_MESSAGES].sort((a, b) => b.minCompleted - a.minCompleted);
  return sorted.find((p) => completedCount >= p.minCompleted) || null;
}

/**
 * 연속 완료 수에 맞는 스트릭 메시지 반환
 */
export function getStreakMessage(streak: number): StreakMessage | null {
  const sorted = [...STREAK_MESSAGES].sort((a, b) => b.streak - a.streak);
  return sorted.find((s) => streak >= s.streak) || null;
}

/**
 * 기간별 진행률에 따른 동기 부여 메시지
 */
export function getProgressMessage(
  completedInPeriod: number,
  totalInPeriod: number
): string {
  const ratio = totalInPeriod > 0 ? completedInPeriod / totalInPeriod : 0;

  if (ratio === 0) return '아직 시작 전이에요. 첫 항목부터 체크해볼까요?';
  if (ratio < 0.25) return '좋은 시작이에요! 조금씩 진행해 나가요.';
  if (ratio < 0.5) return '순조롭게 진행 중이에요. 이 기세를 유지하세요!';
  if (ratio < 0.75) return '절반 이상 완료! 정말 잘하고 있어요.';
  if (ratio < 1) return '거의 다 했어요! 마무리만 남았어요.';
  return '이 기간 완벽 클리어! 🎉';
}

/**
 * D-day 기반 긴급도 계산
 */
export function getUrgencyLevel(
  dueDate: string | null,
  isCompleted: boolean
): 'overdue' | 'urgent' | 'soon' | 'normal' | 'done' {
  if (isCompleted) return 'done';
  if (!dueDate) return 'normal';

  const today = new Date();
  const due = new Date(dueDate);
  const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 7) return 'urgent';
  if (diffDays <= 30) return 'soon';
  return 'normal';
}
