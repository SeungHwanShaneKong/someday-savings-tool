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

/**
 * 현재 진입의 유입원 분류(순수). search/referrer 를 주입 가능(테스트용).
 * 자기 도메인 referrer(내부 네비)는 'direct' 로 간주해 자기참조 오염 방지.
 */
export function classifySource(
  // null-safe 기본값: 일부 환경/테스트에서 window.location 이 부분 객체일 수 있어 옵셔널 체이닝으로 throw 방지.
  search: string = (typeof window !== 'undefined' && window.location?.search) || '',
  referrer: string = (typeof document !== 'undefined' && document.referrer) || '',
  selfHost: string = (typeof window !== 'undefined' && window.location?.hostname)
    ? window.location.hostname.replace(/^www\./, '').toLowerCase()
    : '',
): { source: string; medium: string | null; referrer: string | null } {
  const params = new URLSearchParams(search || '');
  const utmSource = params.get('utm_source');
  const utmMedium = params.get('utm_medium');
  if (utmSource) {
    return {
      source: utmSource.toLowerCase().slice(0, 40),
      medium: utmMedium ? utmMedium.toLowerCase().slice(0, 40) : null,
      referrer: referrer || null,
    };
  }

  const host = referrer ? hostOf(referrer) : null;
  if (!host || (selfHost && host === selfHost)) {
    return { source: 'direct', medium: null, referrer: null };
  }

  const labels = host.split('.');
  const matched = (toks: string[]) => toks.find((t) => labels.includes(t));
  if (matched(KAKAO_LABELS)) return { source: 'kakao', medium: 'social', referrer };
  const s = matched(SEARCH_LABELS);
  if (s) return { source: s, medium: 'search', referrer };
  const so = matched(SOCIAL_LABELS);
  if (so) return { source: so === 'fb' ? 'facebook' : so, medium: 'social', referrer };
  return { source: host, medium: 'referral', referrer };
}

/** 최초 방문 유입원을 localStorage 에 1회 기록·반환. SSR/프라이빗 모드 등 예외는 null. */
export function getOrSetFirstTouch(now: string = new Date().toISOString()): AcquisitionTouch | null {
  try {
    const existing = localStorage.getItem(FIRST_TOUCH_KEY);
    if (existing) return JSON.parse(existing) as AcquisitionTouch;
    const c = classifySource();
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
};

export function sourceLabel(s: string): string {
  return SOURCE_LABELS[s] ?? s;
}
