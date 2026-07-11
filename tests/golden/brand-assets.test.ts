// [CL-BRAND-HEART-20260709-231800] 브랜드 자산 골든 가드 — dist 비의존(public/ 직접 검사).
// scripts/generate-brand-assets.mjs 산출물의 치수·형식·용량을 기계 오라클로 고정한다.
// SVG/템플릿 수정 후 `pnpm run brand:assets` 미실행 시 여기서 소리내며 실패해야 한다.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const PUB = path.join(process.cwd(), 'public');

/** PNG IHDR 파싱(무의존) — 시그니처 8B + 길이4 + 'IHDR'4 후 width/height 각 4B big-endian */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(path.join(PUB, file));
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const fileSize = (file: string) => readFileSync(path.join(PUB, file)).length;

describe('브랜드 자산 골든 (BA)', () => {
  it('BA.1 og-image.png = 정확히 1200×630 (index.html og:image:width/height 선언과 일치)', () => {
    expect(pngSize('og-image.png')).toEqual({ width: 1200, height: 630 });
  });

  it.each([
    ['pwa-icon-512.png', 512],
    ['pwa-icon-256.png', 256],
    ['pwa-icon-192.png', 192],
    ['pwa-icon-maskable-512.png', 512],
    ['pwa-icon-maskable-192.png', 192],
    ['apple-touch-icon.png', 180],
    ['favicon.png', 512],
    // [CL-BRAND-V2-20260711-173300] 구글 권장 48px 배수 파비콘(신규 URL = SERP 캐시 버스트)
    ['favicon-96.png', 96],
    ['favicon-48.png', 48],
  ])('BA.2 %s = %i×%i 정방형', (file, size) => {
    expect(pngSize(file)).toEqual({ width: size, height: size });
  });

  it('BA.3 favicon.ico = ICO 매직(00 00 01 00) + 이미지 수 ≥ 2 (멀티사이즈)', () => {
    const buf = readFileSync(path.join(PUB, 'favicon.ico'));
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x00, 0x00, 0x01, 0x00]));
    expect(buf.readUInt16LE(4)).toBeGreaterThanOrEqual(2);
  });

  it('BA.4 백지 렌더 가드 — 전 자산 > 2KB, og-image < 300KB(소셜 크롤러 예산)', () => {
    const all = [
      'og-image.png', 'pwa-icon-512.png', 'pwa-icon-256.png', 'pwa-icon-192.png',
      'pwa-icon-maskable-512.png', 'pwa-icon-maskable-192.png',
      'apple-touch-icon.png', 'favicon.png', 'favicon.ico',
    ];
    for (const f of all) expect(fileSize(f), f).toBeGreaterThan(2 * 1024);
    // [CL-BRAND-V2-20260711-173300] 소형 투명 PNG(48/96)는 2KB 미만이 정상 — 별도 하한(0.5KB)
    for (const f of ['favicon-96.png', 'favicon-48.png']) {
      expect(fileSize(f), f).toBeGreaterThan(512);
    }
    expect(fileSize('og-image.png')).toBeLessThan(300 * 1024);
  });

  it('BA.5 manifest — 아이콘 엔트리 전부 실파일 존재 + maskable 512 포함', () => {
    const manifest = JSON.parse(readFileSync(path.join(PUB, 'manifest.webmanifest'), 'utf8'));
    const icons: Array<{ src: string; sizes: string; purpose?: string }> = manifest.icons;
    for (const icon of icons) {
      expect(existsSync(path.join(PUB, icon.src.replace(/^\//, ''))), icon.src).toBe(true);
    }
    expect(icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512')).toBe(true);
  });

  it('BA.6 index.html — 전용 apple-touch-icon 참조 + og:image 절대 URL 유지', () => {
    const html = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png">');
    expect(html).toContain('property="og:image" content="https://moderninsightspot.com/og-image.png"');
    // [CL-BRAND-V2-20260711-173300] 구글 파비콘 가이드라인 준수 링크 세트(SVG+48배수 PNG+ico sizes="any")
    expect(html).toContain('<link rel="icon" href="/favicon.ico" sizes="any">');
    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.svg">');
    expect(html).toContain('<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">');
    expect(html).toContain('<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">');
  });

  it('BA.8 favicon.svg — SVG 파비콘 발행(mark-small 동기·주석 스트립)', () => {
    const svg = readFileSync(path.join(PUB, 'favicon.svg'), 'utf8');
    expect(svg.trimStart().startsWith('<svg')).toBe(true); // stripComments 발행 확인(헤더 주석 없음)
    expect(svg).toContain('fill-rule="evenodd"'); // 링 홀 compound path 계약
    expect(svg.length).toBeGreaterThan(300);
    expect(svg.length).toBeLessThan(20 * 1024);
  });

  it('BA.7 마스터 SVG·템플릿·생성 스크립트 존재 (재현성 3종 세트)', () => {
    for (const f of ['brand/mark.svg', 'brand/mark-small.svg', 'brand/og-template.html', 'scripts/generate-brand-assets.mjs']) {
      expect(existsSync(path.join(process.cwd(), f)), f).toBe(true);
    }
  });
});
