// [CL-SEC-SEOXSS-20260621] SEOAmplifierPanel — LLM 생성 HTML 살균(저장형 XSS 차단).
//
// 계약: 본문 미리보기는 DOMPurify(허용 태그만 + ALLOWED_ATTR:[])로 정화되어 onerror/onclick/script 가 제거되고,
//       허용 태그(h2/p 등)와 텍스트는 보존된다.
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { SEOAmplifierPanel, type SEOContent } from '@/components/admin/SEOAmplifierPanel';

const maliciousContent: SEOContent = {
  title: '테스트 타이틀',
  meta_description: '테스트 설명',
  keywords: ['웨딩'],
  estimated_read_time: '3분',
  body_html:
    '<h2>안전한 제목</h2>' +
    '<img src=x onerror="window.__pwned=1">' +
    '<script>window.__pwned=2</script>' +
    '<p onclick="evil()">본문 단락 내용</p>' +
    '<a href="javascript:alert(1)">링크</a>',
};

describe('SEOAmplifierPanel — LLM HTML 살균(XSS 차단)', () => {
  it('SEO.1 onerror/onclick/script/javascript 제거, 허용 태그·텍스트는 보존', () => {
    const { container } = renderWithProviders(
      <SEOAmplifierPanel content={maliciousContent} loading={false} error={null} onGenerate={vi.fn()} />,
    );

    // 위험 요소 제거
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(container.querySelector('[onclick]')).toBeNull();
    const html = container.innerHTML;
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
    // window 오염이 실제로 발생하지 않음
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();

    // 허용 태그·텍스트는 보존(미리보기 기능 유지) — 본문 미리보기(.prose) 내부 h2 로 한정
    expect(container.querySelector('.prose h2')?.textContent).toBe('안전한 제목');
    expect(html).toContain('본문 단락 내용');
  });
});
