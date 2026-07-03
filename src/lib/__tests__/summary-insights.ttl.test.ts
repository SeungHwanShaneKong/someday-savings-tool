// [CL-TOP20-R50-UI-20260703-094000] AI 인사이트 캐시 TTL(10분) — 스테일 방지 계약 테스트
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildInsightCacheKey,
  readInsightCache,
  writeInsightCache,
  INSIGHT_CACHE_TTL_MS,
} from '../summary-insights';

const VALUE = {
  tips: [{ title: 't', description: 'd', example: 'e', savings_estimate: 's' }],
  confidence: 0.9,
};

describe('AI 인사이트 캐시 TTL', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-03T09:40:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TTL 이내(10분 - 1ms)에는 캐시 값을 그대로 돌려준다', () => {
    const key = buildInsightCacheKey(['b1', 'b2']);
    writeInsightCache(key, VALUE);
    vi.advanceTimersByTime(INSIGHT_CACHE_TTL_MS - 1);
    expect(readInsightCache(key)).toEqual(VALUE);
  });

  it('TTL 초과(10분 + 1ms) 시 null — 스테일 캐시 폐기', () => {
    const key = buildInsightCacheKey(['b1', 'b2']);
    writeInsightCache(key, VALUE);
    vi.advanceTimersByTime(INSIGHT_CACHE_TTL_MS + 1);
    expect(readInsightCache(key)).toBeNull();
  });

  it('cachedAt 봉투가 없는 레거시 레코드는 저장 시각 불명 → 스테일(null) 취급', () => {
    const key = buildInsightCacheKey(['b1']);
    // 구 포맷: 값 원본을 그대로 저장(봉투 없음)
    sessionStorage.setItem(key, JSON.stringify(VALUE));
    expect(readInsightCache(key)).toBeNull();
  });

  it('cachedAt 이 숫자가 아니거나 value 형태 불일치면 null (기존 방어 계약 유지)', () => {
    const key = buildInsightCacheKey(['b1']);
    sessionStorage.setItem(key, JSON.stringify({ cachedAt: 'yesterday', value: VALUE }));
    expect(readInsightCache(key)).toBeNull();
    sessionStorage.setItem(key, JSON.stringify({ cachedAt: Date.now(), value: { notTips: true } }));
    expect(readInsightCache(key)).toBeNull();
    sessionStorage.setItem(key, '{not-json');
    expect(readInsightCache(key)).toBeNull();
  });
});
