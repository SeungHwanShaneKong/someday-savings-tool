/**
 * [CL-GAMIFY-INT-20260418-222329] 게이미피케이션 통합 타입 정의
 * 4개 기능(Streak · Passport · Score Card · Leaderboard) 모두 사용하는 공용 타입
 */

export type BadgeCategory =
  | 'starter'
  | 'planner'
  | 'saver'
  | 'ai_ace'
  | 'legendary';

export type BadgeRarity = 'common' | 'rare' | 'legendary';

/** badge_definitions 테이블 row (DB 스키마와 1:1 대응) */
export interface BadgeDefinition {
  id: string;
  slug: string;
  name_ko: string;
  description: string;
  icon_emoji: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  points_reward: number;
  unlock_rule: BadgeUnlockRule;
  display_order: number;
  is_active: boolean;
}

/** 뱃지 unlock 조건 — rule-engine이 평가 */
export type BadgeUnlockRule =
  | { type: 'first_budget' }
  | { type: 'first_checklist_completed' }
  | { type: 'first_snapshot' }
  | { type: 'checklist_total_done'; threshold: number }
  | { type: 'budget_savings_pct'; min_savings_pct: number }
  | { type: 'ai_queries_total'; threshold: number }
  | { type: 'login_streak_days'; threshold: number }
  | { type: 'checklist_streak_days'; threshold: number }
  | { type: 'days_before_wedding_action'; max_days_before: number };

/** user_earned_badges 테이블 row */
export interface UserEarnedBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string; // ISO
}

/** profiles.gamification_state JSONB 내용물 */
export interface GamificationState {
  total_points: number;
  level: number;
  login_streak_days: number;
  checklist_streak_days: number;
  last_login_date: string | null; // YYYY-MM-DD
  last_checklist_date: string | null; // YYYY-MM-DD
  freeze_tokens: number;
  cohort_opted_in: boolean;
  last_score_card_generated_at: string | null; // ISO
  unlocked_badge_slugs: string[];
  opt_in_phases: Array<'streak' | 'passport' | 'score_card' | 'leaderboard'>;
}

/** 초기 상태 (모든 신규 사용자 기본값) */
export const DEFAULT_GAMIFICATION_STATE: GamificationState = {
  total_points: 0,
  level: 1,
  login_streak_days: 0,
  checklist_streak_days: 0,
  last_login_date: null,
  last_checklist_date: null,
  freeze_tokens: 2, // 월 2개 자동 지급 (기본)
  cohort_opted_in: false,
  last_score_card_generated_at: null,
  unlocked_badge_slugs: [],
  opt_in_phases: ['streak', 'passport', 'score_card', 'leaderboard'],
};

/** 뱃지 unlock을 판정할 때 rule-engine에 전달하는 이벤트 스냅샷 */
export interface BadgeEvaluationContext {
  /** 사용자 총 예산 계정 수 (budgets table) */
  budgets_count: number;
  /** 완료한 체크리스트 아이템 누적 수 */
  checklist_completed_count: number;
  /** 생성한 스냅샷 누적 수 */
  snapshot_count: number;
  /** 국평 대비 절약 퍼센트 (최신 예산 기준, 양수=절약, 음수=초과) */
  budget_savings_pct: number;
  /** AI 쿼리 누적 수 (ai_conversations) */
  ai_queries_total: number;
  /** 현재 로그인 연속일 */
  login_streak_days: number;
  /** 현재 체크리스트 연속일 */
  checklist_streak_days: number;
  /** 오늘 D-day까지 남은 일수 (wedding_date - today, 없으면 null) */
  days_before_wedding: number | null;
  /** 이미 획득한 뱃지 slug 목록 (중복 지급 방지) */
  already_unlocked_slugs: string[];
}

/** rule-engine 평가 결과 — 새로 unlock 된 뱃지 목록 */
export interface BadgeEvaluationResult {
  newly_unlocked: BadgeDefinition[];
  total_points_gained: number;
}

/** 레벨 공식 (100pt 단위, 로그 스케일로 부드럽게 증가) */
export function calculateLevel(totalPoints: number): number {
  if (totalPoints <= 0) return 1;
  // level 1: 0 ~ 99pt, level 2: 100 ~ 249, level 3: 250 ~ 449, level 4: 450+
  // 수식: Math.floor(sqrt(totalPoints / 100)) + 1
  return Math.floor(Math.sqrt(totalPoints / 100)) + 1;
}

/** 다음 레벨까지 필요한 포인트 */
export function pointsToNextLevel(totalPoints: number): number {
  const currentLevel = calculateLevel(totalPoints);
  const nextLevelThreshold = currentLevel * currentLevel * 100;
  return Math.max(0, nextLevelThreshold - totalPoints);
}
