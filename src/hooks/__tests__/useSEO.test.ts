// [CL-COVERAGE50-20260620] useSEO 단위 검증 — 미테스트 영역 커버리지 보강
//
// 계약(Contract) 요약 — src/hooks/useSEO.ts:
//   useSEO({ title, description?, path?, jsonLd? }) 는 useEffect 에서 document.head 의
//   기존 메타/캐노니컬/OG/트위터 태그를 갱신하고, jsonLd 제공 시 <script id="dynamic-jsonld">
//   를 주입한다. 언마운트 시 모든 이전 값을 복원하고 JSON-LD 스크립트를 제거한다.
//   - title 이 falsy → DEFAULT_TITLE 폴백
//   - description 이 falsy → DEFAULT_DESCRIPTION 폴백 (단, meta 엘리먼트가 존재할 때만)
//   - canonical/og:url 은 path !== undefined 일 때만 `${BASE_DOMAIN}${path}` 로 설정
//     → 트레일링 슬래시 경로(`/guide/`)는 트레일링 슬래시 캐노니컬을 생성
//
// 주의: jsdom 환경은 index.html <head> 를 로드하지 않으므로(빈 head 로 시작) 각 테스트마다
//       관련 엘리먼트를 직접 시드(seed)한 뒤 renderHook 한다.

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSEO } from '../useSEO';

const BASE_DOMAIN = 'https://wedsem.moderninsightspot.com';
const DEFAULT_TITLE = '웨딩셈 - 결혼 예산 계산기, 결혼 비용 계산기';
const DEFAULT_DESCRIPTION =
  "결혼 준비의 시작, 결혼 예산 관리부터 결혼 체크 리스트까지 스마트하게! 결혼 비용, 웨딩 예산 계산기 '웨딩셈'으로 복잡한 결혼 비용을 항목별로 깔끔하게 정리하세요.";

/** index.html 의 head 를 모사 — 갱신 대상 엘리먼트를 시드한다. */
function seedHead(initial?: { description?: string; canonical?: string }) {
  document.head.innerHTML = '';
  document.title = '초기 타이틀';

  const meta = document.createElement('meta');
  meta.setAttribute('name', 'description');
  meta.setAttribute('content', initial?.description ?? '초기 설명');
  document.head.appendChild(meta);

  const canonical = document.createElement('link');
  canonical.setAttribute('rel', 'canonical');
  canonical.setAttribute('href', initial?.canonical ?? `${BASE_DOMAIN}/`);
  document.head.appendChild(canonical);

  const ogUrl = document.createElement('meta');
  ogUrl.setAttribute('property', 'og:url');
  ogUrl.setAttribute('content', `${BASE_DOMAIN}/`);
  document.head.appendChild(ogUrl);

  const ogTitle = document.createElement('meta');
  ogTitle.setAttribute('property', 'og:title');
  ogTitle.setAttribute('content', '초기 OG 타이틀');
  document.head.appendChild(ogTitle);

  const ogDesc = document.createElement('meta');
  ogDesc.setAttribute('property', 'og:description');
  ogDesc.setAttribute('content', '초기 OG 설명');
  document.head.appendChild(ogDesc);

  const twTitle = document.createElement('meta');
  twTitle.setAttribute('name', 'twitter:title');
  twTitle.setAttribute('content', '초기 TW 타이틀');
  document.head.appendChild(twTitle);

  const twDesc = document.createElement('meta');
  twDesc.setAttribute('name', 'twitter:description');
  twDesc.setAttribute('content', '초기 TW 설명');
  document.head.appendChild(twDesc);
}

const q = {
  desc: () => document.querySelector('meta[name="description"]')?.getAttribute('content'),
  canonical: () =>
    (document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null)?.getAttribute(
      'href',
    ),
  ogUrl: () => document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
  ogTitle: () => document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
  ogDesc: () => document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
  twTitle: () => document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
  twDesc: () =>
    document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
  jsonLdScript: () => document.getElementById('dynamic-jsonld'),
};

beforeEach(() => {
  seedHead();
});

describe('useSEO — SEO 메타/캐노니컬/JSON-LD 주입 (document.head 단언)', () => {
  it('UT.1 happy path: title·description·canonical·OG·Twitter 전부 갱신', () => {
    renderHook(() =>
      useSEO({
        title: '예산 관리 - 웨딩셈',
        description: '결혼 예산을 항목별로 입력하고 관리하세요.',
        path: '/budget',
      }),
    );

    expect(document.title).toBe('예산 관리 - 웨딩셈');
    expect(q.desc()).toBe('결혼 예산을 항목별로 입력하고 관리하세요.');
    expect(q.canonical()).toBe(`${BASE_DOMAIN}/budget`);
    expect(q.ogUrl()).toBe(`${BASE_DOMAIN}/budget`);
    expect(q.ogTitle()).toBe('예산 관리 - 웨딩셈');
    expect(q.ogDesc()).toBe('결혼 예산을 항목별로 입력하고 관리하세요.');
    expect(q.twTitle()).toBe('예산 관리 - 웨딩셈');
    expect(q.twDesc()).toBe('결혼 예산을 항목별로 입력하고 관리하세요.');
  });

  it('UT.2 트레일링 슬래시 경로(`/guide/...`)는 트레일링 슬래시 캐노니컬을 그대로 생성', () => {
    // 프리렌더 라우트(아티클)는 trailing-slash canonical 규약 — Article.tsx 사용 패턴
    renderHook(() =>
      useSEO({
        title: '결혼 예산 가이드 | 웨딩셈',
        description: '가이드 설명',
        path: '/guide/wedding-budget-101/',
      }),
    );

    expect(q.canonical()).toBe(`${BASE_DOMAIN}/guide/wedding-budget-101/`);
    expect(q.canonical()?.endsWith('/')).toBe(true);
    expect(q.ogUrl()).toBe(`${BASE_DOMAIN}/guide/wedding-budget-101/`);
  });

  it('UT.3 폴백(boundary): 빈 title / description 미제공 → DEFAULT 값 적용', () => {
    renderHook(() => useSEO({ title: '', path: '/budget' }));

    expect(document.title).toBe(DEFAULT_TITLE);
    expect(q.desc()).toBe(DEFAULT_DESCRIPTION);
    expect(q.ogTitle()).toBe(DEFAULT_TITLE);
    expect(q.ogDesc()).toBe(DEFAULT_DESCRIPTION);
    expect(q.twTitle()).toBe(DEFAULT_TITLE);
    expect(q.twDesc()).toBe(DEFAULT_DESCRIPTION);
  });

  it('UT.4 path 미제공(undefined): canonical·og:url 은 손대지 않고 기존 값 보존', () => {
    seedHead({ canonical: `${BASE_DOMAIN}/keep-me` });

    renderHook(() => useSEO({ title: '제목만', description: '설명만' }));

    // path === undefined → canonical/og:url 가드에 걸려 변경되지 않음
    expect(q.canonical()).toBe(`${BASE_DOMAIN}/keep-me`);
    expect(q.ogUrl()).toBe(`${BASE_DOMAIN}/`);
    // 하지만 title/description 은 정상 갱신되어야 함
    expect(document.title).toBe('제목만');
    expect(q.desc()).toBe('설명만');
  });

  it('UT.5 path 빈 문자열("")은 undefined 와 달리 루트 도메인 캐노니컬을 설정', () => {
    // 경계 케이스: '' !== undefined → 가드 통과 → `${BASE_DOMAIN}` (path 부분 빈 문자열)
    renderHook(() => useSEO({ title: '랜딩', path: '' }));

    expect(q.canonical()).toBe(BASE_DOMAIN);
    expect(q.ogUrl()).toBe(BASE_DOMAIN);
  });

  it('AC.1 JSON-LD 주입: 단일 객체를 직렬화한 <script id="dynamic-jsonld"> 1개 생성', () => {
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: '결혼 예산 가이드',
    };

    renderHook(() => useSEO({ title: '가이드', path: '/guide/', jsonLd }));

    const script = q.jsonLdScript();
    expect(script).not.toBeNull();
    expect(script?.getAttribute('type')).toBe('application/ld+json');
    expect(script?.parentElement).toBe(document.head);
    expect(JSON.parse(script!.textContent ?? '{}')).toEqual(jsonLd);
    // 단일 인스턴스 보장
    expect(document.querySelectorAll('#dynamic-jsonld')).toHaveLength(1);
  });

  it('AC.2 JSON-LD 갱신: 재렌더 시 이전 스크립트 제거 후 1개만 유지(중복 방지)', () => {
    const first = [{ '@type': 'FAQPage' }];
    const second = { '@type': 'WebPage', name: '두번째' };

    const { rerender } = renderHook(({ jsonLd }) => useSEO({ title: 't', path: '/p', jsonLd }), {
      initialProps: { jsonLd: first as Record<string, unknown> | Record<string, unknown>[] },
    });
    expect(document.querySelectorAll('#dynamic-jsonld')).toHaveLength(1);
    expect(JSON.parse(q.jsonLdScript()!.textContent ?? '{}')).toEqual(first);

    rerender({ jsonLd: second });
    expect(document.querySelectorAll('#dynamic-jsonld')).toHaveLength(1);
    expect(JSON.parse(q.jsonLdScript()!.textContent ?? '{}')).toEqual(second);
  });

  it('AC.3 jsonLd 미제공: JSON-LD 스크립트는 생성되지 않음', () => {
    renderHook(() => useSEO({ title: '제목', path: '/no-ld' }));
    expect(q.jsonLdScript()).toBeNull();
  });

  it('AC.4 언마운트 cleanup: title·description·canonical·OG·Twitter 이전 값 복원 + JSON-LD 제거', () => {
    seedHead({ description: '복원될 설명', canonical: `${BASE_DOMAIN}/original` });

    const { unmount } = renderHook(() =>
      useSEO({
        title: '임시 제목',
        description: '임시 설명',
        path: '/temp',
        jsonLd: { '@type': 'Thing' },
      }),
    );

    // 마운트 후: 변경 + 스크립트 주입 확인
    expect(document.title).toBe('임시 제목');
    expect(q.canonical()).toBe(`${BASE_DOMAIN}/temp`);
    expect(q.jsonLdScript()).not.toBeNull();

    unmount();

    // 언마운트 후: 모든 값 복원 + JSON-LD 제거
    expect(document.title).toBe('초기 타이틀');
    expect(q.desc()).toBe('복원될 설명');
    expect(q.canonical()).toBe(`${BASE_DOMAIN}/original`);
    expect(q.ogTitle()).toBe('초기 OG 타이틀');
    expect(q.ogDesc()).toBe('초기 OG 설명');
    expect(q.twTitle()).toBe('초기 TW 타이틀');
    expect(q.twDesc()).toBe('초기 TW 설명');
    expect(q.jsonLdScript()).toBeNull();
  });

  it('AC.5 견고성: description meta 엘리먼트가 head 에 없어도 throw 없이 title 만 갱신', () => {
    // 일부 페이지/프리렌더 상황에서 meta[name=description] 부재 가능 — 가드(if(metaDesc)) 검증
    document.head.innerHTML = '';
    document.title = '없음-초기';

    expect(() => {
      renderHook(() => useSEO({ title: '메타없음 제목', description: '무시될 설명', path: '/x' }));
    }).not.toThrow();

    expect(document.title).toBe('메타없음 제목');
    // description meta 가 없으니 생성도 조회도 되지 않음
    expect(document.querySelector('meta[name="description"]')).toBeNull();
  });
});
