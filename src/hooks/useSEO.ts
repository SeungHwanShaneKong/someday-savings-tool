import { useEffect } from 'react';
import { SITE_ORIGIN } from '@/config/site';

interface SEOConfig {
  title: string;
  description?: string;
  path?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** [CL-TOP20-R50-TRACK-20260703-094000] true 시 robots noindex 메타 주입(체험성 라우트 색인 제외) */
  noindex?: boolean;
  /** [CL-OGIMG-20260709-233100] 라우트별 og:image/twitter:image 재작성 — 절대 URL 또는 '/'로 시작하는
   *  public 경로. 미지정 시 index.html 의 전역 og-image 유지. 프리렌더가 이 값을 정적 HTML 에 캡처한다. */
  image?: string;
}

const BASE_DOMAIN = SITE_ORIGIN; // [CL-DOMAIN-PROMOTE-20260621] 단일 소스(src/config/site.ts)
const DEFAULT_TITLE = '웨딩셈 - 결혼 예산 계산기, 결혼 비용 계산기';
const DEFAULT_DESCRIPTION =
  '결혼 준비의 시작, 결혼 예산 관리부터 결혼 체크 리스트까지 스마트하게! 결혼 비용, 웨딩 예산 계산기 \'웨딩셈\'으로 복잡한 결혼 비용을 항목별로 깔끔하게 정리하세요.';

const JSON_LD_ID = 'dynamic-jsonld';
// [CL-TOP20-R50-TRACK-20260703-094000] SPA 라우트별 noindex 메타 전용 슬롯(id 로 단일 인스턴스 보장)
const ROBOTS_ID = 'dynamic-robots';

export function useSEO({ title, description, path, jsonLd, noindex, image }: SEOConfig) {
  useEffect(() => {
    // Capture previous values for full cleanup on unmount
    const prevTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? '';
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonical?.href ?? '';
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const prevOgUrl = ogUrl?.getAttribute('content') ?? '';
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const prevOgTitle = ogTitle?.getAttribute('content') ?? '';
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const prevOgDesc = ogDesc?.getAttribute('content') ?? '';
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    const prevTwTitle = twTitle?.getAttribute('content') ?? '';
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    const prevTwDesc = twDesc?.getAttribute('content') ?? '';
    // [CL-OGIMG-20260709-233100] og:image 계열 캡처 — image 미지정이어도 캡처/복원 대칭 유지
    const ogImage = document.querySelector('meta[property="og:image"]');
    const prevOgImage = ogImage?.getAttribute('content') ?? '';
    const ogImageAlt = document.querySelector('meta[property="og:image:alt"]');
    const prevOgImageAlt = ogImageAlt?.getAttribute('content') ?? '';
    const twImage = document.querySelector('meta[name="twitter:image"]');
    const prevTwImage = twImage?.getAttribute('content') ?? '';

    // Update document title
    document.title = title || DEFAULT_TITLE;

    // Update meta description
    if (metaDesc) {
      metaDesc.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    // Update canonical URL
    if (canonical && path !== undefined) {
      canonical.href = `${BASE_DOMAIN}${path}`;
    }

    // Update og:url
    if (ogUrl && path !== undefined) {
      ogUrl.setAttribute('content', `${BASE_DOMAIN}${path}`);
    }

    // Update og:title
    if (ogTitle) {
      ogTitle.setAttribute('content', title || DEFAULT_TITLE);
    }

    // Update og:description
    if (ogDesc) {
      ogDesc.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    // Update twitter:title
    if (twTitle) {
      twTitle.setAttribute('content', title || DEFAULT_TITLE);
    }

    // Update twitter:description
    if (twDesc) {
      twDesc.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    // [CL-OGIMG-20260709-233100] 라우트별 og:image — image 지정 시에만 재작성(전역 카드 폴백 유지)
    if (image) {
      const absolute = image.startsWith('http') ? image : `${BASE_DOMAIN}${image}`;
      if (ogImage) ogImage.setAttribute('content', absolute);
      if (twImage) twImage.setAttribute('content', absolute);
      if (ogImageAlt) ogImageAlt.setAttribute('content', title || DEFAULT_TITLE);
    }

    // Dynamic JSON-LD structured data injection
    const existingScript = document.getElementById(JSON_LD_ID);
    if (existingScript) {
      existingScript.remove();
    }

    if (jsonLd) {
      const script = document.createElement('script');
      script.id = JSON_LD_ID;
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    // [CL-TOP20-R50-TRACK-20260703-094000] robots noindex — JSON-LD 와 동일한 주입/제거 대칭
    // 패턴(기존 슬롯 제거 → 필요 시 재주입, 언마운트 시 제거). index.html 에 정적 robots 메타가
    // 없으므로 '부재 = 색인 허용'이 기본값이고, 제거만으로 이전 상태가 정확히 복원된다.
    const existingRobots = document.getElementById(ROBOTS_ID);
    if (existingRobots) {
      existingRobots.remove();
    }

    if (noindex) {
      const robots = document.createElement('meta');
      robots.id = ROBOTS_ID;
      robots.setAttribute('name', 'robots');
      robots.setAttribute('content', 'noindex, nofollow');
      document.head.appendChild(robots);
    }

    // Cleanup: restore ALL previous values + remove dynamic JSON-LD on unmount
    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute('content', prevDesc);
      if (canonical) canonical.href = prevCanonical;
      if (ogUrl) ogUrl.setAttribute('content', prevOgUrl);
      if (ogTitle) ogTitle.setAttribute('content', prevOgTitle);
      if (ogDesc) ogDesc.setAttribute('content', prevOgDesc);
      if (twTitle) twTitle.setAttribute('content', prevTwTitle);
      if (twDesc) twDesc.setAttribute('content', prevTwDesc);
      // [CL-OGIMG-20260709-233100] og:image 계열 대칭 복원
      if (ogImage) ogImage.setAttribute('content', prevOgImage);
      if (ogImageAlt) ogImageAlt.setAttribute('content', prevOgImageAlt);
      if (twImage) twImage.setAttribute('content', prevTwImage);
      const scriptToRemove = document.getElementById(JSON_LD_ID);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      // [CL-TOP20-R50-TRACK-20260703-094000] noindex 메타도 대칭 제거(기본=색인 허용 복원)
      const robotsToRemove = document.getElementById(ROBOTS_ID);
      if (robotsToRemove) {
        robotsToRemove.remove();
      }
    };
  }, [title, description, path, jsonLd, noindex, image]);
}
