// [CL-PWA-A2HS-20260706-202800] 골든: PWA manifest·아이콘·iOS 메타 회귀 가드.
// "홈 화면/바탕화면 바로가기(설치)"의 전제 자산이 사라지거나 어긋나면 설치가 조용히 깨지므로
// 필수 필드·아이콘 파일 실재·앱 바로가기(shortcuts)·index.html 메타를 오라클로 고정한다.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const manifestRaw = readFileSync(path.join(ROOT, 'public', 'manifest.webmanifest'), 'utf-8');
const manifest = JSON.parse(manifestRaw) as {
  name: string;
  short_name: string;
  display: string;
  start_url: string;
  scope: string;
  icons: { src: string; sizes: string; type: string }[];
  shortcuts?: { name: string; url: string }[];
};
const indexHtml = readFileSync(path.join(ROOT, 'index.html'), 'utf-8');

describe('golden: manifest.webmanifest 필수 필드', () => {
  it('설치 가능(standalone) 필수 필드', () => {
    expect(manifest.name).toBe('웨딩셈 - 결혼 예산 계산기');
    expect(manifest.short_name).toBe('웨딩셈');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('아이콘 192/512 포함 & 파일 실재', () => {
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of manifest.icons) {
      const rel = icon.src.replace(/^\//, '');
      expect(existsSync(path.join(ROOT, 'public', rel))).toBe(true);
    }
  });

  it('앱 바로가기(shortcuts): 예산·체크리스트·챗 내부 경로', () => {
    expect(Array.isArray(manifest.shortcuts)).toBe(true);
    expect(manifest.shortcuts!.length).toBeGreaterThanOrEqual(3);
    for (const s of manifest.shortcuts!) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.url.startsWith('/')).toBe(true);
    }
    const urls = manifest.shortcuts!.map((s) => s.url);
    expect(urls).toEqual(expect.arrayContaining(['/budget', '/checklist', '/chat']));
  });
});

describe('golden: index.html PWA 메타', () => {
  it('manifest 링크 + apple-touch-icon + iOS standalone 메타', () => {
    expect(indexHtml).toContain('rel="manifest"');
    expect(indexHtml).toContain('rel="apple-touch-icon"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-title"');
  });
});
