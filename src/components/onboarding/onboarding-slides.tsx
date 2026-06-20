// [CL-ONBOARDING-20260619-222424] 온보딩 슬라이드 정의 (스크린샷 없는 CSS 목업)
// 번들·노후화 0, 다크모드 토큰 안전. 순서: 예산 → 공동관리 → 체크리스트 → 캘린더 → AI → 게이미피케이션.
import { Wallet, Users, ListChecks, CalendarDays, Sparkles, Trophy, type LucideIcon } from 'lucide-react';

export interface OnboardingSlide {
  id: string;
  icon: LucideIcon;
  iconClass: string;
  ringClass: string;
  title: string;
  description: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: 'budget',
    icon: Wallet,
    iconClass: 'text-blue-500',
    ringClass: 'bg-blue-500/10',
    title: '예산을 한눈에',
    description: '총예산·지출 완료·지출 예정·남은 예산을 카테고리별로 깔끔하게 관리해요.',
  },
  {
    id: 'collab',
    icon: Users,
    iconClass: 'text-pink-500',
    ringClass: 'bg-pink-500/10',
    title: '신랑·신부 함께',
    description: '초대 링크 하나로 둘이 같은 예산을 실시간으로 함께 편집해요.',
  },
  {
    id: 'checklist',
    icon: ListChecks,
    iconClass: 'text-emerald-500',
    ringClass: 'bg-emerald-500/10',
    title: '체크리스트로 차근차근',
    description: 'D-day 기준 단계별 로드맵과 AI 일정 최적화로 빠짐없이 준비해요.',
  },
  {
    id: 'calendar',
    icon: CalendarDays,
    iconClass: 'text-violet-500',
    ringClass: 'bg-violet-500/10',
    title: '캘린더로 일정·지출',
    description: '이번 달 낼 돈과 할 일을 달력에서 한눈에 확인해요.',
  },
  {
    id: 'ai',
    icon: Sparkles,
    iconClass: 'text-amber-500',
    ringClass: 'bg-amber-500/10',
    title: 'AI 웨딩 매니저',
    description: '실데이터 기반으로 예산을 점검받고 궁금한 점을 바로 해결해요.',
  },
  {
    id: 'reward',
    icon: Trophy,
    iconClass: 'text-rose-500',
    ringClass: 'bg-rose-500/10',
    title: '준비할수록 즐겁게',
    description: '스트릭·뱃지·레벨로 결혼 준비 여정을 게임처럼 즐겨요.',
  },
];
