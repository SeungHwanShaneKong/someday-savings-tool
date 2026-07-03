// [CL-TOP20-P0-20260703-002500] 방문자 퍼널 GA4 계측 — Top 20 로드맵 P0(#20).
// 목적: 익명 방문자 여정(랜딩→체험→가입)의 전환 지점을 GA4 커스텀 이벤트로 측정.
// 원칙: PII 0(경로·라벨만), gtag 부재/차단 시 무음 no-op(분석은 절대 UX 를 막지 않는다),
//       page_views/anon_page_views(자체 집계)와 별개 축 — GA4 는 퍼널 분석 전용.

/** 방문자 퍼널 이벤트 taxonomy — 신규 이벤트는 여기에만 추가(오타 하드코딩 금지). */
export type FunnelEvent =
  // 랜딩 첫인상
  | 'landing_hero_cta_click'      // 히어로 주 CTA 클릭
  | 'feature_card_click'          // 기능 카드 클릭 (params.feature)
  | 'landing_calc_interact'       // 랜딩 미니 시뮬레이터 첫 조작
  | 'landing_calc_bridge_click'   // 시뮬레이터 → 데모/가입 브리지 클릭
  | 'social_proof_view'           // 후기/신뢰 섹션 노출(1회)
  // 게스트 체험(/demo)
  | 'demo_enter_click'            // 랜딩 → /demo 진입 CTA 클릭 (params.from) [독립검증 P1 지적 반영: convert 와 의미 분리]
  | 'demo_start'                  // /demo 진입(세션 1회)
  | 'demo_interact'               // 데모 예산 첫 수정
  | 'demo_convert_click'          // 데모 → 가입 CTA 클릭
  // AI 프리뷰
  | 'chat_preview_send'           // 무가입 챗 체험 질문 전송
  | 'chat_preview_limit'          // 체험 한도 도달(가입 유도 노출)
  // 콘텐츠 → 앱 브리지
  | 'article_cta_click'           // 아티클 컨텍스추얼 CTA 클릭 (params.slug)
  // 가입 퍼널 종점
  | 'auth_view'                   // /auth 도달 (params.from)
  | 'signup_complete'             // 가입 완료(근사) — 발화 시점 근거는 아래 위저드 블록 주석
  // 가입 직후 온보딩(첫 예산 위저드) — [CL-TOP20-R50-TRACK-20260703-094000]
  // BudgetSetupWizard 노출 조건(본인 소유 예산·개인 모드·전 항목 0·custom 0·완료 플래그 없음,
  // BudgetFlow.tsx 위저드 게이트)은 사실상 "가입 직후 첫 예산 진입"과 일치한다.
  // → signup_complete 는 wizard_enter 와 함께 trackFunnelOnce 로 발화해 가입 완료를 근사 계측
  //   (정적 SPA 에 전용 '가입 성공' 훅이 없어 관측 가능한 최선점. 드물게 '가입 후 입력 0 인
  //   기존 계정의 재방문'이 포함될 수 있음 — 수용된 오차, 세션 중복은 once 가드가 차단).
  | 'wizard_enter'                // 첫 예산 위저드 첫 노출(open 전이 시점·세션 1회)
  | 'wizard_apply';               // 위저드 프리필 적용 (params.template/guests/style)

type FunnelParams = Record<string, string | number | boolean>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** GA4 이벤트 전송 — gtag 부재(차단기·프리렌더·테스트)에서도 절대 throw 하지 않는다. */
export function trackFunnel(event: FunnelEvent, params?: FunnelParams): void {
  try {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    window.gtag('event', event, { app_area: 'visitor_funnel', ...params });
  } catch {
    /* 분석 실패는 무음 — UX 비차단 */
  }
}

const ONCE_PREFIX = 'wedsem_funnel_once_';

/** 세션당 1회만 전송(노출·시작류 이벤트 중복 방지). sessionStorage 실패 시 일반 전송으로 폴백. */
export function trackFunnelOnce(event: FunnelEvent, params?: FunnelParams): void {
  try {
    const key = `${ONCE_PREFIX}${event}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* 프라이빗 모드 등 — 중복 허용하고 계속 */
  }
  trackFunnel(event, params);
}
