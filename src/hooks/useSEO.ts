import { useEffect } from 'react';

interface SEOConfig {
  title: string;
  description?: string;
  path?: string;
}

const BASE_DOMAIN = 'https://wedsem.moderninsightspot.com';
const DEFAULT_TITLE = '웨딩셈 - 결혼 예산 계산기, 결혼 비용 계산기';
const DEFAULT_DESCRIPTION =
  '결혼 준비의 시작, 결혼 예산 관리부터 결혼 체크 리스트까지 스마트하게! 결혼 비용, 웨딩 예산 계산기 \'웨딩셈\'으로 복잡한 결혼 비용을 항목별로 깔끔하게 정리하세요.';

export function useSEO({ title, description, path }: SEOConfig) {
  useEffect(() => {
    const prevTitle = document.title;

    // Update document title
    document.title = title || DEFAULT_TITLE;

    // Update meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    // Update canonical URL
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical && path !== undefined) {
      canonical.href = `${BASE_DOMAIN}${path}`;
    }

    // Update og:url
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl && path !== undefined) {
      ogUrl.setAttribute('content', `${BASE_DOMAIN}${path}`);
    }

    // Update og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', title || DEFAULT_TITLE);
    }

    // Update og:description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    // Update twitter:title
    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) {
      twTitle.setAttribute('content', title || DEFAULT_TITLE);
    }

    // Update twitter:description
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) {
      twDesc.setAttribute('content', description || DEFAULT_DESCRIPTION);
    }

    // Cleanup: restore previous title on unmount
    return () => {
      document.title = prevTitle;
    };
  }, [title, description, path]);
}
