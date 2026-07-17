// [CL-ACQ-CLASSIFY-20260622-233012] 유입경로 분류 + first-touch 보관 (개선1)
//
// UTM 파라미터 우선 → 없으면 document.referrer 도메인 매핑 → 둘 다 없으면 'direct'.
// first-touch 는 localStorage 에 **최초 1회만** 기록(익명 포함, 로컬만 — DB 익명행 0, 프라이버시 보존).
// 가입 후 usePageTracking 이 이 값을 profiles 에 1회 귀속한다. 순수 함수라 CI 검증 가능.

export interface AcquisitionTouch {
  /** 분류된 소스 키: 'direct' | 'google'/'naver'/... | 'kakao' | 외부 호스트명 */
  source: string;
  /** 'search' | 'social' | 'referral' | UTM medium | null */
  medium: string | null;
  /** 원본 referrer(있으면) */
  referrer: string | null;
  /** 최초 방문 시각(ISO) */
  ts: string;
}

const FIRST_TOUCH_KEY = 'wedsem_first_touch';

// 도메인의 점-구분 라벨(예: blog.kakao.com → ['blog','kakao','com'])로 매칭 → 서브도메인/국가코드 무관 견고.
const SEARCH_LABELS = ['google', 'bing', 'daum', 'naver', 'yahoo', 'duckduckgo', 'baidu', 'yandex'];
const SOCIAL_LABELS = ['instagram', 'facebook', 'fb', 'youtube', 'twitter', 'x', 'threads', 'tiktok', 'pinterest', 'linkedin', 'band'];
const KAKAO_LABELS = ['kakao', 'kakaocorp'];

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// [CL-AUDIT-R3-REFNORM-20260623-000000] referrer 정규화(개인정보 최소수집 + 저장 bloat 방지):
//   원본 URL(쿼리스트링에 검색어/세션토큰 등 PII 가능)을 통째로 저장하지 않고 origin(scheme+host)만 보관.
//   분류는 어차피 도메인 기반이라 정보 손실 0. 파싱 불가/빈 값은 null.
export function normalizeReferrer(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin.slice(0, 255) || null;
  } catch {
    return null;
  }
}

// [CL-SHARE-P1-20260717-170000] 랜딩 pathname → 바이럴 소스 분류(docs/growth-share-card-design.md §4.2).
//  근거: 카톡 인앱/문자 유입은 referrer 가 비거나 자기도메인이라 아래 :71 자기참조 가드에서 전부
//  'direct' 로 오분류된다 → **랜딩 경로가 바이럴 유입의 유일한 신뢰 신호**.
//  share_card(불특정 다수 공유)와 partner_invite(1:1 협업 초대)는 의도가 다르므로 별도 소스로 분리
//  집계한다(혼합 시 K-factor 오염). 우선순위는 UTM > pathname > referrer > direct — UTM 이 있으면
//  명시적 캠페인 의도가 경로 추론보다 우선한다.
const VIRAL_PATH_SOURCES: { prefix: string; source: string; medium: string }[] = [
  { prefix: '/shared/', source: 'share_card', medium: 'viral' },
  { prefix: '/invite/', source: 'partner_invite', medium: 'viral' },
];

function classifyPathname(pathname: string): { source: string; medium: string } | null {
  for (const v of VIRAL_PATH_SOURCES) {
    if (pathname.startsWith(v.prefix)) return { source: v.source, medium: v.medium };
  }
  return null;
}

/**
 * 현재 진입의 유입원 분류(순수). search/referrer/pathname 을 주입 가능(테스트용).
 * 자기 도메인 referrer(내부 네비)는 'direct' 로 간주해 자기참조 오염 방지.
 */
export function classifySource(
  // null-safe 기본값: 일부 환경/테스트에서 window.location 이 부분 객체일 수 있어 옵셔널 체이닝으로 throw 방지.
  search: string = (typeof window !== 'undefined' && window.location?.search) || '',
  referrer: string = (typeof document !== 'undefined' && document.referrer) || '',
  selfHost: string = (typeof window !== 'undefined' && window.location?.hostname)
    ? window.location.hostname.replace(/^www\./, '').toLowerCase()
    : '',
  // [CL-SHARE-AUDIT-D2-20260717-190000] **랜딩 경로**(바이럴 분류용) — 기본값은 '' (비적용).
  //  ⚠️ 여기에 window.location.pathname 을 기본값으로 두면 안 된다(감사 D2 재현): classifySource 는
  //  랜딩 시점 외에 **라스트터치 집계**(usePageTracking page_views/track-visit)에서도 0-인자로 호출되는데,
  //  그 시점의 '현재 경로'가 /shared/ 면 소유자 자기열람·내부 네비까지 share_card 로 기록돼 Admin
  //  유입 지표가 유령 바이럴로 오염된다. 경로 신호는 '랜딩(첫 진입)'에서만 유효하므로, 이를 필요로 하는
  //  유일 호출자(getOrSetFirstTouch)가 landingPathname() 을 **명시 주입**한다.
  pathname: string = '',
): { source: string; medium: string | null; referrer: string | null } {
  const params = new URLSearchParams(search || '');
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  // [CL-AUDIT-R3-REFNORM-20260623-000000] 저장/반환 referrer 는 origin 만(PII·bloat 방지). 분류 매칭엔 원본 사용.
  const ref = normalizeReferrer(referrer);
  if (utmSource) {
    return {
      source: utmSource.toLowerCase().slice(0, 40),
      medium: utmMedium ? utmMedium.toLowerCase().slice(0, 40) : null,
      referrer: ref,
    };
  }

  // [CL-SHARE-P1-20260717-170000] UTM 다음 우선순위 — referrer 판정(자기도메인 direct 강등)보다 먼저.
  const viral = classifyPathname(pathname || '');
  if (viral) return { source: viral.source, medium: viral.medium, referrer: ref };

  const host = referrer ? hostOf(referrer) : null;
  if (!host || (selfHost && host === selfHost)) {
    return { source: 'direct', medium: null, referrer: null };
  }

  const labels = host.split('.');
  const matched = (toks: string[]) => toks.find((t) => labels.includes(t));
  if (matched(KAKAO_LABELS)) return { source: 'kakao', medium: 'social', referrer: ref };
  const s = matched(SEARCH_LABELS);
  if (s) return { source: s, medium: 'search', referrer: ref };
  const so = matched(SOCIAL_LABELS);
  if (so) return { source: so === 'fb' ? 'facebook' : so, medium: 'social', referrer: ref };
  return { source: host, medium: 'referral', referrer: ref };
}

// [CL-SHARE-AUDIT-D2-20260717-190000] 세션 랜딩 경로 단일소스 — 모듈 로드(앱 부트) 시 1회 캡처.
//  first-touch 는 '최초 진입'의 신호라, 이후 SPA 네비게이션으로 경로가 바뀌어도 랜딩 경로는 불변이어야
//  한다. 모듈 상수로 고정해 호출 시점 의존성을 제거(getOrSetFirstTouch 가 늦게 호출돼도 정확).
const LANDING_PATHNAME: string =
  (typeof window !== 'undefined' && window.location?.pathname) || '';

/** 세션 랜딩 경로(테스트 주입용 오버라이드 가능). */
export function landingPathname(override?: string): string {
  return override ?? LANDING_PATHNAME;
}

/** 최초 방문 유입원을 localStorage 에 1회 기록·반환. SSR/프라이빗 모드 등 예외는 null. */
export function getOrSetFirstTouch(
  now: string = new Date().toISOString(),
  // [CL-SHARE-AUDIT-D2-20260717-190000] 랜딩 경로 명시 주입 — 바이럴 분류는 이 경로(랜딩)에서만 유효.
  pathname: string = landingPathname(),
): AcquisitionTouch | null {
  try {
    const existing = localStorage.getItem(FIRST_TOUCH_KEY);
    if (existing) return JSON.parse(existing) as AcquisitionTouch;
    const c = classifySource(undefined, undefined, undefined, pathname);
    const touch: AcquisitionTouch = { source: c.source, medium: c.medium, referrer: c.referrer, ts: now };
    localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(touch));
    return touch;
  } catch {
    return null;
  }
}

/** 저장된 first-touch 읽기(없으면 null) — 가입 귀속 시 사용. */
export function readFirstTouch(): AcquisitionTouch | null {
  try {
    const raw = localStorage.getItem(FIRST_TOUCH_KEY);
    return raw ? (JSON.parse(raw) as AcquisitionTouch) : null;
  } catch {
    return null;
  }
}

/** 소스 키 → 한국어 라벨(관리자 표시용). 미정의 키는 원문 유지. */
export const SOURCE_LABELS: Record<string, string> = {
  direct: '직접 방문',
  unknown: '미상',
  google: '구글',
  naver: '네이버',
  daum: '다음',
  bing: '빙',
  yahoo: '야후',
  duckduckgo: '덕덕고',
  instagram: '인스타그램',
  facebook: '페이스북',
  fb: '페이스북',
  youtube: '유튜브',
  x: 'X(트위터)',
  twitter: '트위터',
  threads: '스레드',
  tiktok: '틱톡',
  pinterest: '핀터레스트',
  linkedin: '링크드인',
  kakao: '카카오',
  band: '네이버 밴드',
  // [CL-SHARE-P1-20260717-170000] 바이럴 유입(랜딩 경로 기반) — Admin 유입 차트에 자동 편입.
  share_card: '공유 카드',
  partner_invite: '파트너 초대',
};

export function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}
