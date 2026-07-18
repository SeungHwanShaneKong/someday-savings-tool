// [CL-TOP20-P0-20260703-002500] 방문자 퍼널 GA4 계측 — Top 20 로드맵 P0(#20).
// 목적: 익명 방문자 여정(랜딩→가입)의 전환 지점을 GA4 커스텀 이벤트로 측정.
// 원칙: PII 0(경로·라벨만), gtag 부재/차단 시 무음 no-op(분석은 절대 UX 를 막지 않는다),
//       page_views/anon_page_views(자체 집계)와 별개 축 — GA4 는 퍼널 분석 전용.
// [CL-LOGIN-GATE-20260709-233447] /demo 체험판 폐지(로그인 필수화) — landing_calc_*·demo_* 6종 제거.
// 닫힌 유니언이므로 잔존 방출부는 tsc 가 컴파일 타임에 적발한다.

/** 방문자 퍼널 이벤트 taxonomy — 신규 이벤트는 여기에만 추가(오타 하드코딩 금지). */
export type FunnelEvent =
  // 랜딩 첫인상
  | 'landing_hero_cta_click'      // 히어로 주 CTA 클릭 (params.method: google_direct|auth_page|sample_sheet)
  | 'feature_card_click'          // 기능 카드 클릭 (params.feature)
  | 'social_proof_view'           // 후기/신뢰 섹션 노출(1회)
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
  | 'wizard_apply'                // 위저드 프리필 적용 (params.template/guests/style)
  // [CL-PWA-A2HS-20260706-202410] 홈 화면/바탕화면 바로가기(PWA 설치) 퍼널
  | 'pwa_install_cta_click'       // 설치 버튼 클릭 (params.placement: header|footer|hero|fab|banner, params.platform)
  | 'pwa_install_accepted'        // 네이티브 프롬프트 수락 (params.placement)
  | 'pwa_install_dismissed'       // 네이티브 프롬프트 거절 (params.placement)
  | 'pwa_install_guide_shown'     // 수동 안내 모달 노출 (params.platform)
  | 'pwa_install_shortcut_download' // 바탕화면 바로가기 파일 다운로드 (params.os)
  // [CL-SHARE-P1-20260717-170000] 예산 리포트 공유 카드 바이럴 퍼널 — docs/growth-share-card-design.md §4.1.
  //  금지 계약: share token(원문·해시 모두)·절대 금액·이름/이메일 전송 0. 금액은 항상 등급/밴드/퍼센트로.
  //  share_convert 전용 이벤트는 두지 않는다 — signup_complete 의 acq_source='share_card' 로 정의(§4.1).
  | 'share_create'                // 공유 발급 성공 (params.channel: link|image, privacy_level, grade, completeness_band)
  | 'share_open'                  // 수신자 /shared/:token 열람 (params.grade, privacy_level, has_session) — 세션 1회
  | 'share_cta_click';            // 수신자 랜딩 CTA 클릭 (params.cta: hero|banner, grade)

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

/**
 * 세션당 1회만 전송(노출·시작류 이벤트 중복 방지). sessionStorage 실패 시 일반 전송으로 폴백.
 *
 * [CL-SHARE-AUDIT-D3-20260717-190000] `instanceId` — 인스턴스 차원(선택).
 *  배경(감사 D3 재현): once 키가 이벤트명만 네임스페이스로 쓰면(구 동작), 세션당 논리적으로 1회인
 *  이벤트(auth_view·wizard_enter·social_proof_view)에는 정확하지만, **인스턴스별 이벤트**에는 과소집계를
 *  만든다. share_open 은 공유 링크(token)마다 별개 사건인데, 한 세션에서 두 번째 링크를 열면 첫 링크의
 *  키에 막혀 전량 유실 → open 과소집계 → landing_cvr(=convert/open) 과대. 설계 의도는 '새로고침 중복
 *  차단'이지 '다른 링크 무시'가 아니다(§4.1) → 의도를 키에 그대로 표현한다.
 *  instanceId 미지정 시 동작은 구 계약과 **비트 동일**(기존 호출부 회귀 0).
 */
export function trackFunnelOnce(event: FunnelEvent, params?: FunnelParams, instanceId?: string): void {
  try {
    const key = instanceId ? `${ONCE_PREFIX}${event}_${instanceId}` : `${ONCE_PREFIX}${event}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    /* 프라이빗 모드 등 — 중복 허용하고 계속 */
  }
  trackFunnel(event, params);
}
