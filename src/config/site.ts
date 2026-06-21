// [CL-DOMAIN-PROMOTE-20260621] 사이트 정식 오리진(canonical) 단일 소스 (BASE_DOMAIN 드리프트 방지).
//
// apex 승격: moderninsightspot.com 이 GitHub Pages 로 앱+광고를 직접 서빙(옛 Lovable 좀비 제거).
// wedsem.moderninsightspot.com 은 GitHub Pages 가 자동 301 → apex.
// 런타임 로직(OAuth redirectTo·초대링크·kakao 탈출)은 window.location.origin(호스트 무관)을 쓰므로
// 이 상수는 SEO/canonical/OG/JSON-LD 등 "절대 URL 표기" 전용이다.
export const SITE_ORIGIN = 'https://moderninsightspot.com';
