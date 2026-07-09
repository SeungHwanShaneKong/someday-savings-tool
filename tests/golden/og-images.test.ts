// [CL-OGIMG-20260709-235500] 아티클별 OG 카드 골든 — 전 슬러그 PNG 존재 + 정확 1200×630.
// 아티클 추가/제목 변경 후 `pnpm run og:images` 미실행을 소리내며 적발한다(프리렌더 verify 의 선행 가드).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ARTICLES } from '../../src/content/articles';

const OG_DIR = path.join(process.cwd(), 'public', 'og');

function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('golden: 아티클 OG 이미지 (public/og)', () => {
  it('전 아티클 슬러그에 og/<slug>.png 존재', () => {
    const missing = ARTICLES.filter((a) => !existsSync(path.join(OG_DIR, `${a.slug}.png`)))
      .map((a) => a.slug);
    expect(missing).toEqual([]);
  });

  it('전 OG 카드가 정확히 1200×630 + 백지 가드(>5KB)', () => {
    for (const a of ARTICLES) {
      const file = path.join(OG_DIR, `${a.slug}.png`);
      if (!existsSync(file)) continue; // 존재성은 위 케이스가 전담(이중 실패 소음 방지)
      expect(pngSize(file), a.slug).toEqual({ width: 1200, height: 630 });
      expect(readFileSync(file).length, a.slug).toBeGreaterThan(5 * 1024);
    }
  });
});
