// [CL-COVERAGE50-20260620] kpi-definitions 단위 검증 — 미테스트 영역 커버리지 보강
import { describe, it, expect } from 'vitest';
import { startOfDay, subDays } from 'date-fns';
import {
  KPI_DEFINITIONS,
  getKPIStatus,
  getStatusColor,
  withCumulativeSignups,
  firstTrendBucketStart,
  type KPIDefinition,
  type KPIStatus,
  type TrendDataPoint,
} from '../kpi-definitions';

// 테스트 전용 fixture: 실제 정의에 의존하지 않고 임계값 경계 의미를 고정 검증한다.
// (소스 변경 시 happy-path 회귀를 방지하기 위해 실제 정의도 별도로 조회.)
const higherDef: KPIDefinition = {
  id: 'TST-HI',
  name: 'higherIsBetter 지표',
  description: '높을수록 좋은 지표',
  formula: 'x',
  unit: '%',
  thresholds: { warn: 25, danger: 20 },
  higherIsBetter: true,
};

// TTFV(K11)처럼 낮을수록 좋은 지표: danger > warn 구조.
const lowerDef: KPIDefinition = {
  id: 'TST-LO',
  name: 'lowerIsBetter 지표',
  description: '낮을수록 좋은 지표',
  formula: 'x',
  unit: '분',
  thresholds: { warn: 60, danger: 120 },
  higherIsBetter: false,
};

describe('kpi-definitions / getKPIStatus', () => {
  it('UT.1 higherIsBetter: 3개 밴드와 경계값(warn 미만=주의, danger 미만=위험)을 정확히 판별', () => {
    // 계약(JSDoc): "warn 미만이면 주의, danger 미만이면 위험" → 경계는 strict-less.
    // 정상 영역: value >= warn
    expect(getKPIStatus(higherDef, 100)).toBe('정상');
    expect(getKPIStatus(higherDef, 25)).toBe('정상'); // 경계: warn 정확히 → 미만 아님 → 정상
    // 주의 영역: danger <= value < warn
    expect(getKPIStatus(higherDef, 24.99)).toBe('주의');
    expect(getKPIStatus(higherDef, 20)).toBe('주의'); // 경계: danger 정확히 → 미만 아님 → 주의
    // 위험 영역: value < danger
    expect(getKPIStatus(higherDef, 19.99)).toBe('위험');
    expect(getKPIStatus(higherDef, 0)).toBe('위험'); // 0 입력(빈 데이터) → 최악 → 위험
  });

  it('UT.2 lowerIsBetter(TTFV형): 클수록 나쁨 — 경계·0·음수 입력을 정확히 판별', () => {
    // 계약: 낮을수록 좋음 → value > danger=위험, value > warn=주의, else 정상.
    expect(getKPIStatus(lowerDef, 121)).toBe('위험');
    expect(getKPIStatus(lowerDef, 120)).toBe('주의'); // 경계: danger 정확히 → 초과 아님 → 주의
    expect(getKPIStatus(lowerDef, 119.99)).toBe('주의');
    expect(getKPIStatus(lowerDef, 61)).toBe('주의');
    expect(getKPIStatus(lowerDef, 60)).toBe('정상'); // 경계: warn 정확히 → 초과 아님 → 정상
    expect(getKPIStatus(lowerDef, 0)).toBe('정상'); // 0분(즉시 가치 도달) → 최선 → 정상
    expect(getKPIStatus(lowerDef, -5)).toBe('정상'); // 음수(비정상 입력) → 임계 초과 아님 → 정상
  });

  it('UT.3 thresholds 없는 지표(K01 등)는 입력 값과 무관하게 항상 "참고"', () => {
    // 계약: def.thresholds 미존재 시 게이팅 불가 → 항상 참고.
    const refDef = KPI_DEFINITIONS.find((d) => d.id === 'K01');
    expect(refDef).toBeDefined();
    expect(refDef!.thresholds).toBeUndefined();
    expect(getKPIStatus(refDef!, 0)).toBe('참고');
    expect(getKPIStatus(refDef!, 9999)).toBe('참고');
    expect(getKPIStatus(refDef!, -100)).toBe('참고'); // 음수도 참고 그대로

    // 실제 임계값 보유 지표(K05 Stickiness)로 happy-path 회귀 고정
    const k05 = KPI_DEFINITIONS.find((d) => d.id === 'K05');
    expect(k05?.thresholds).toEqual({ warn: 25, danger: 20 });
    expect(getKPIStatus(k05!, 30)).toBe('정상');
    expect(getKPIStatus(k05!, 22)).toBe('주의');
    expect(getKPIStatus(k05!, 10)).toBe('위험');
  });
});

describe('kpi-definitions / getStatusColor', () => {
  it('AC.1 4개 상태 모두 완전한 색상 triple(bg/text/border) 반환 — undefined 없음(switch default 부재)', () => {
    const statuses: KPIStatus[] = ['정상', '주의', '위험', '참고'];
    for (const s of statuses) {
      const c = getStatusColor(s);
      // switch에 default가 없으므로 미커버 상태가 있으면 undefined → 런타임 크래시 위험.
      expect(c, `상태 "${s}" 색상 누락`).toBeDefined();
      expect(c).toHaveProperty('bg');
      expect(c).toHaveProperty('text');
      expect(c).toHaveProperty('border');
      // 다크모드 변형 포함 여부(계약: 각 토큰에 light+dark 클래스 동시 포함)
      expect(c!.bg).toMatch(/dark:/);
      expect(c!.text).toMatch(/dark:/);
      expect(c!.border).toMatch(/dark:/);
    }
  });

  it('AC.2 상태별 색상 계열이 의미와 일치(정상=emerald, 주의=amber, 위험=red, 참고=gray)', () => {
    expect(getStatusColor('정상')!.bg).toContain('emerald');
    expect(getStatusColor('주의')!.bg).toContain('amber');
    expect(getStatusColor('위험')!.bg).toContain('red');
    expect(getStatusColor('참고')!.bg).toContain('gray');
  });
});

describe('kpi-definitions / KPI_DEFINITIONS 레지스트리 불변식', () => {
  it('AC.3 ID는 K01~K18 순차·유일하며 18개(Admin "18개 핵심 운영 지표"와 일치)', () => {
    const ids = KPI_DEFINITIONS.map((d) => d.id);
    // 유일성
    expect(new Set(ids).size).toBe(ids.length);
    // 카운트: Admin.tsx 헤더 "18개 핵심 운영 지표" 및 K16~K18 Phase 4-A 확장과 일치
    expect(KPI_DEFINITIONS.length).toBe(18);
    // 순차 K01..K18
    const expected = Array.from({ length: 18 }, (_, i) => `K${String(i + 1).padStart(2, '0')}`);
    expect(ids).toEqual(expected);
  });

  it('AC.4 모든 정의의 메타 필드 무결성 + thresholds 방향성 일관성', () => {
    for (const d of KPI_DEFINITIONS) {
      // 필수 문자열 메타 비어있지 않음
      expect(d.name.length, `${d.id} name`).toBeGreaterThan(0);
      expect(d.description.length, `${d.id} description`).toBeGreaterThan(0);
      expect(d.formula.length, `${d.id} formula`).toBeGreaterThan(0);
      expect(d.unit.length, `${d.id} unit`).toBeGreaterThan(0);
      expect(typeof d.higherIsBetter, `${d.id} higherIsBetter`).toBe('boolean');

      if (d.thresholds) {
        const { warn, danger } = d.thresholds;
        expect(Number.isFinite(warn), `${d.id} warn finite`).toBe(true);
        expect(Number.isFinite(danger), `${d.id} danger finite`).toBe(true);
        if (d.higherIsBetter) {
          // 높을수록 좋음: 위험 임계(danger) < 주의 임계(warn)
          expect(danger, `${d.id} higherIsBetter면 danger<warn`).toBeLessThan(warn);
        } else {
          // 낮을수록 좋음(TTFV): 주의 임계(warn) < 위험 임계(danger)
          expect(warn, `${d.id} lowerIsBetter면 warn<danger`).toBeLessThan(danger);
        }
      }
    }
  });
});

// [CL-ADMIN-SIGNUP-TREND-20260622] 누적 가입자 계산(withCumulativeSignups) 검증
describe('withCumulativeSignups (신규→누적 가입자)', () => {
  const pts = (signups: (number | undefined)[]): TrendDataPoint[] =>
    signups.map((s, i) => ({ date: `7/${i + 1}`, signups: s }));

  it('baseline + 일별 신규를 누계한다(진짜 누적)', () => {
    const out = withCumulativeSignups(pts([2, 3, 5]), 100);
    expect(out.map((p) => p.cumulativeSignups)).toEqual([102, 105, 110]);
  });

  it('baseline=0 이면 0부터 누계', () => {
    const out = withCumulativeSignups(pts([1, 0, 4]), 0);
    expect(out.map((p) => p.cumulativeSignups)).toEqual([1, 1, 5]);
  });

  it('signups undefined 는 0으로 처리', () => {
    const out = withCumulativeSignups(pts([undefined, 2, undefined]), 10);
    expect(out.map((p) => p.cumulativeSignups)).toEqual([10, 12, 12]);
  });

  it('빈 배열은 빈 배열', () => {
    expect(withCumulativeSignups([], 50)).toEqual([]);
  });

  it('누적은 단조 증가(감소 없음)', () => {
    const out = withCumulativeSignups(pts([3, 0, 7, 1]), 5);
    const cum = out.map((p) => p.cumulativeSignups!);
    for (let i = 1; i < cum.length; i++) expect(cum[i]).toBeGreaterThanOrEqual(cum[i - 1]);
  });

  it('원본 signups 는 보존하고 cumulativeSignups 만 추가(불변)', () => {
    const input = pts([4, 6]);
    const out = withCumulativeSignups(input, 0);
    expect(out[0].signups).toBe(4);
    expect(out[1].signups).toBe(6);
    expect(input[0].cumulativeSignups).toBeUndefined(); // 원본 비변형
  });
});

// [CL-AUDIT-CUMSUM-BOUNDARY-20260622] 누적 baseline 경계 정렬 — 첫 부분일 가입자 누락(경계 갭) 회귀 가드
describe('firstTrendBucketStart (누적 baseline 경계 정렬)', () => {
  it('startOfDay 로 정규화 — 시/분/초/ms = 0', () => {
    const end = new Date('2026-06-22T14:30:45.123');
    const r = firstTrendBucketStart(end, 30);
    expect([r.getHours(), r.getMinutes(), r.getSeconds(), r.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it('dayCount=min(periodDays,90)-1 일 전의 startOfDay (90 캡)', () => {
    const end = new Date('2026-06-22T14:30:00');
    expect(firstTrendBucketStart(end, 30).getTime()).toBe(startOfDay(subDays(end, 29)).getTime());
    expect(firstTrendBucketStart(end, 7).getTime()).toBe(startOfDay(subDays(end, 6)).getTime());
    expect(firstTrendBucketStart(end, 200).getTime()).toBe(startOfDay(subDays(end, 89)).getTime()); // ytd 등 >90 → 90 캡
  });

  it('경계 갭 제거: 컷오프가 시각보존 startISO(subDays(end,periodDays))보다 이후 → [startISO,컷오프) 갭이 baseline에 흡수', () => {
    // 버그 재현 본질: baseline 이 startISO(시각보존) 미만이면 [startISO, 첫버킷startOfDay) 가입자가
    //   baseline·일별버킷 양쪽에서 누락됐다. 컷오프=첫버킷 startOfDay 로 정렬하면 그 구간이 baseline(<컷오프)에 포함된다.
    const end = new Date('2026-06-22T14:30:00');
    const startTimePreserving = subDays(end, 30); // 기존 startISO 기준점
    const cutoff = firstTrendBucketStart(end, 30);
    expect(cutoff.getTime()).toBeGreaterThan(startTimePreserving.getTime());
    // 갭 구간(예: startISO + 1시간)에 가입한 프로필은 컷오프 미만 → baseline 에 포함되어 누락되지 않음
    const inGap = new Date(startTimePreserving.getTime() + 60 * 60 * 1000);
    expect(inGap.getTime()).toBeLessThan(cutoff.getTime());
  });
});
