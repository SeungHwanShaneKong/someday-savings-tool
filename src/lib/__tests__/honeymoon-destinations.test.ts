// [CL-COVERAGE50-20260620] honeymoon-destinations 단위 검증 — 미테스트 영역 커버리지 보강
import { describe, it, expect } from 'vitest';
import {
  DESTINATIONS,
  getDestinationById,
  getMatchScore,
  computeBadges,
  type Destination,
} from '@/lib/honeymoon-destinations';

/**
 * 테스트 픽스처: 실제 데이터 의존을 최소화하기 위해 결정론적 합성 Destination 생성.
 * getMatchScore/computeBadges 는 단일 destination 의 순수 함수이므로 합성 객체로 계약을 명확히 검증.
 */
function makeDestination(overrides: Partial<Destination> = {}): Destination {
  return {
    id: 'fixture',
    name: '픽스처',
    nameEn: 'Fixture',
    region: '동남아',
    coordinates: [100, 10],
    concepts: ['휴양'],
    accommodationTypes: ['리조트'],
    budgetRange: { min: 5_000_000, max: 8_000_000 },
    nights: 7,
    features: ['feature'],
    bestBookingWeeks: 10,
    visaRequired: false,
    description: 'desc',
    markerEmoji: '🏝️',
    highlights: ['h'],
    costBreakdown: {
      flight: { min: 1_000_000, max: 2_000_000 },
      accommodation: { min: 2_000_000, max: 4_000_000 },
      local: { min: 1_000_000, max: 2_000_000 },
    },
    ...overrides,
  };
}

describe('honeymoon-destinations — getDestinationById (글로벌 소스 해상도)', () => {
  it('AC.1 존재하는 id 는 동일 id 의 Destination 을 반환한다 (실데이터)', () => {
    // 계약: DESTINATIONS 레지스트리에서 id 로 단일 해상도
    const found = getDestinationById('maldives');
    expect(found).toBeDefined();
    expect(found?.id).toBe('maldives');
    // 반환 객체는 레지스트리의 동일 참조여야 한다 (복사본 아님 — find 시맨틱)
    expect(found).toBe(DESTINATIONS.find((d) => d.id === 'maldives'));
  });

  it('AC.2 존재하지 않는 id 는 throw 없이 undefined 를 반환한다 (없는 id 안전 처리)', () => {
    // 힌트 핵심: 없는 id 안전 처리 — 예외 대신 undefined
    expect(() => getDestinationById('no-such-place-xyz')).not.toThrow();
    expect(getDestinationById('no-such-place-xyz')).toBeUndefined();
  });

  it('AC.3 빈 문자열·대소문자 불일치는 매칭되지 않는다 (정확 일치 계약)', () => {
    // id 는 정확 일치여야 하며 빈 문자열/케이스 변형은 미스로 처리
    expect(getDestinationById('')).toBeUndefined();
    expect(getDestinationById('MALDIVES')).toBeUndefined();
    expect(getDestinationById(' maldives ')).toBeUndefined();
  });

  it('AC.4 모든 레지스트리 id 는 고유하며 자기 자신을 해상도한다 (역참조 무결성)', () => {
    // 글로벌 소스 해상도의 전제: id 유일성. 중복이면 getDestinationById 가 첫 항목만 반환해 데이터 손실.
    const ids = DESTINATIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    // 표본 점검: 각 id 가 자기 객체로 round-trip
    for (const d of DESTINATIONS.slice(0, 5)) {
      expect(getDestinationById(d.id)?.id).toBe(d.id);
    }
  });
});

describe('honeymoon-destinations — getMatchScore (필터 매칭 점수 0~1)', () => {
  it('UT.1 필터가 비어 있으면 만점 1 을 반환한다 (happy path / 무필터)', () => {
    const score = getMatchScore(makeDestination(), {});
    expect(score).toBe(1);
  });

  it('UT.2 예산 내(max<=maxBudget)는 만점, 예산 하한 초과는 0.2 로 크게 감점한다', () => {
    const d = makeDestination({ budgetRange: { min: 5_000_000, max: 8_000_000 } });
    // max(8M) <= 10M → 예산 내 → 만점 유지
    expect(getMatchScore(d, { maxBudget: 10_000_000 })).toBe(1);
    // min(5M) > 4M → 예산 하한 초과 → ×0.2
    expect(getMatchScore(d, { maxBudget: 4_000_000 })).toBeCloseTo(0.2, 10);
  });

  it('UT.3 예산이 범위에 걸쳐(min<=maxBudget<max) 있으면 가점/감점 없이 1 을 유지한다 (경계)', () => {
    // 계약상 min<=maxBudget<max 구간은 두 분기 모두 미발동 → 점수 불변(=1)
    const d = makeDestination({ budgetRange: { min: 5_000_000, max: 8_000_000 } });
    expect(getMatchScore(d, { maxBudget: 6_000_000 })).toBe(1);
  });

  it('UT.4 nights 가 minNights 미만이거나 maxNights 초과면 각각 ×0.5 감점한다', () => {
    const d = makeDestination({ nights: 7 });
    // 7 < 10 → 미달 → ×0.5
    expect(getMatchScore(d, { minNights: 10 })).toBeCloseTo(0.5, 10);
    // 7 > 5 → 초과 → ×0.5
    expect(getMatchScore(d, { maxNights: 5 })).toBeCloseTo(0.5, 10);
    // 경계: 정확히 일치하면 감점 없음 (nights === minNights === maxNights)
    expect(getMatchScore(d, { minNights: 7, maxNights: 7 })).toBe(1);
  });

  it('UT.5 컨셉/숙소 부분일치는 비례 가중, 완전 불일치는 ×0.3 으로 감점한다', () => {
    const d = makeDestination({
      concepts: ['휴양', '관광'],
      accommodationTypes: ['리조트', '풀빌라'],
    });
    // 컨셉 2개 요청 중 1개 매칭 → 0.5 + 0.5*(1/2) = 0.75
    expect(getMatchScore(d, { concepts: ['휴양', '쇼핑'] })).toBeCloseTo(0.75, 10);
    // 컨셉 전부 불일치 → ×0.3
    expect(getMatchScore(d, { concepts: ['쇼핑'] })).toBeCloseTo(0.3, 10);
    // 숙소 전부 매칭 → 0.5 + 0.5*(2/2) = 1
    expect(getMatchScore(d, { accommodationTypes: ['리조트', '풀빌라'] })).toBe(1);
  });

  it('UT.6 반환값은 항상 [0,1] 로 클램프되며 다중 감점이 누적된다 (불변식)', () => {
    const d = makeDestination({
      budgetRange: { min: 9_000_000, max: 12_000_000 },
      nights: 3,
      concepts: ['휴양'],
      accommodationTypes: ['리조트'],
    });
    // 예산초과(×0.2) · minNights미달(×0.5) · 컨셉불일치(×0.3) · 숙소불일치(×0.3) 누적
    const score = getMatchScore(d, {
      maxBudget: 4_000_000,
      minNights: 5,
      concepts: ['쇼핑'],
      accommodationTypes: ['호텔'],
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
    // 0.2*0.5*0.3*0.3 = 0.009
    expect(score).toBeCloseTo(0.009, 10);

    // 실데이터 전수: 임의 필터에서도 절대 범위를 벗어나지 않는다
    for (const real of DESTINATIONS) {
      const s = getMatchScore(real, {
        maxBudget: 7_000_000,
        minNights: 4,
        maxNights: 9,
        concepts: ['휴양', '쇼핑'],
        accommodationTypes: ['리조트'],
      });
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('UT.7 maxBudget/minNights 가 0 이면 falsy 로 취급되어 필터가 비활성화된다 (0-값 경계 함정)', () => {
    // 구현 계약: `if (filters.maxBudget && ...)` → 0 은 "필터 없음". 빈 컨셉 배열도 무시.
    const d = makeDestination({ budgetRange: { min: 5_000_000, max: 8_000_000 }, nights: 7 });
    expect(getMatchScore(d, { maxBudget: 0 })).toBe(1);
    expect(getMatchScore(d, { minNights: 0, maxNights: 0 })).toBe(1);
    expect(getMatchScore(d, { concepts: [], accommodationTypes: [] })).toBe(1);
  });
});

describe('honeymoon-destinations — computeBadges (스마트 배지, 최대 2개)', () => {
  it('BD.1 배지는 최대 2개로 잘라 반환한다 (slice 상한 불변식)', () => {
    // 모든 배지 조건을 동시에 만족시켜도 2개로 제한
    const superD = makeDestination({
      budgetRange: { min: 100, max: 200 }, // 1박당 비용 극소 → 가성비
      nights: 1, // 단기 추천
      concepts: ['휴양', '관광'], // 인기 허니문 조건 1
      accommodationTypes: ['리조트', '풀빌라'], // 인기 허니문 조건 2
      visaRequired: false, // 비자 불필요
      region: '동아시아', // 근거리 추천
    });
    const badges = computeBadges(superD);
    expect(badges.length).toBeLessThanOrEqual(2);
    expect(badges.length).toBe(2);
    // 각 배지는 label + color(tailwind class) 구조를 갖는다
    for (const b of badges) {
      expect(typeof b.label).toBe('string');
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.color).toMatch(/^bg-\S+ text-\S+$/);
    }
  });

  it('BD.2 조건을 하나도 만족하지 않으면 빈 배열을 반환한다 (zero/empty)', () => {
    // 비자필요 + 장기(>4박) + 단일 컨셉/숙소 + 원거리 + 고가(1박당 비용 상위)
    const plainD = makeDestination({
      budgetRange: { min: 14_000_000, max: 20_000_000 }, // 1박당 매우 높음 → 가성비 제외
      nights: 10, // 단기 아님
      concepts: ['휴양'], // 인기 허니문 미달(2개 미만)
      accommodationTypes: ['호텔'], // 인기 허니문 미달
      visaRequired: true, // 비자 불필요 제외
      region: '유럽', // 근거리 제외
    });
    expect(computeBadges(plainD)).toEqual([]);
  });

  it('BD.3 비자 불필요 단독 조건은 "비자 불필요" 배지를 포함한다 (단일 라벨 검증)', () => {
    const d = makeDestination({
      budgetRange: { min: 14_000_000, max: 20_000_000 },
      nights: 10,
      concepts: ['휴양'],
      accommodationTypes: ['호텔'],
      visaRequired: false,
      region: '유럽',
    });
    const labels = computeBadges(d).map((b) => b.label);
    expect(labels).toContain('비자 불필요');
  });

  it('BD.4 4박 이하는 "단기 추천", 동아시아/국내는 "근거리 추천" 배지를 부여한다 (경계 4박)', () => {
    // nights=4 경계 — 단기 추천 포함. region=동아시아 — 근거리 추천 포함.
    const d = makeDestination({
      budgetRange: { min: 14_000_000, max: 20_000_000 }, // 가성비 제외
      nights: 4, // 경계: 4박 이하 → 단기 추천
      concepts: ['휴양'], // 인기 허니문 제외
      accommodationTypes: ['호텔'],
      visaRequired: true, // 비자 불필요 제외
      region: '동아시아', // 근거리 추천
    });
    const labels = computeBadges(d).map((b) => b.label);
    expect(labels).toContain('단기 추천');
    expect(labels).toContain('근거리 추천');

    // 5박은 단기 추천 제외 (경계 바깥)
    const five = computeBadges(makeDestination({
      budgetRange: { min: 14_000_000, max: 20_000_000 },
      nights: 5,
      concepts: ['휴양'],
      accommodationTypes: ['호텔'],
      visaRequired: true,
      region: '유럽',
    }));
    expect(five.map((b) => b.label)).not.toContain('단기 추천');
  });

  it('BD.5 실데이터 전 항목에서 배지 개수·구조 불변식이 성립한다 (전수 회귀)', () => {
    for (const d of DESTINATIONS) {
      const badges = computeBadges(d);
      expect(badges.length).toBeLessThanOrEqual(2);
      // 중복 라벨 금지 (각 조건은 서로 다른 라벨)
      const labels = badges.map((b) => b.label);
      expect(new Set(labels).size).toBe(labels.length);
      for (const b of badges) {
        expect(b.color).toMatch(/^bg-\S+ text-\S+$/);
      }
    }
  });
});
