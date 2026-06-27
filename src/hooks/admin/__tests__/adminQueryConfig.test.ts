// [CL-ADMIN-RQ-MIGRATION-20260627-234656] Admin freshness 프리셋 계약 잠금(드리프트 방지).
import { describe, it, expect } from 'vitest';
import { ADMIN_HEAVY, ADMIN_LIGHT, ADMIN_PANEL } from '@/hooks/admin/adminQueryConfig';

describe('adminQueryConfig: 준실시간 스마트 폴링 계약', () => {
  it('AQ.1 ADMIN_HEAVY — 무거운 집계 30s(부하 회귀 방지) + 탭숨김 정지 + 포커스 갱신', () => {
    expect(ADMIN_HEAVY.staleTime).toBe(15_000);
    // [CL-AUDIT2-R5-PERF-20260628] 20s→30s: 풀-테이블+클라집계를 더 자주 돌리지 않음(F6/F8). 포커스 갱신으로 준실시간.
    expect(ADMIN_HEAVY.refetchInterval).toBe(30_000);
    expect(ADMIN_HEAVY.refetchOnWindowFocus).toBe(true);
    expect(ADMIN_HEAVY.refetchIntervalInBackground).toBe(false);
  });

  it('AQ.2 ADMIN_LIGHT — 가벼운 RPC 15s', () => {
    expect(ADMIN_LIGHT.refetchInterval).toBe(15_000);
    expect(ADMIN_LIGHT.refetchIntervalInBackground).toBe(false);
  });

  it('AQ.3 ADMIN_PANEL — Edge 패널 30~60s(비용 절약)', () => {
    expect(ADMIN_PANEL.staleTime).toBe(30_000);
    expect(ADMIN_PANEL.refetchInterval).toBeGreaterThanOrEqual(30_000);
    expect(ADMIN_PANEL.refetchInterval).toBeLessThanOrEqual(60_000);
    expect(ADMIN_PANEL.refetchIntervalInBackground).toBe(false);
  });

  it('AQ.4 세 프리셋 모두 탭 숨김 시 폴링 정지(배터리/비용 안전)', () => {
    for (const cfg of [ADMIN_HEAVY, ADMIN_LIGHT, ADMIN_PANEL]) {
      expect(cfg.refetchIntervalInBackground).toBe(false);
      expect(cfg.refetchOnWindowFocus).toBe(true);
      expect(cfg.retry).toBe(1);
    }
  });
});
