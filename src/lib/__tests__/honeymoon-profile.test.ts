// [CL-COVERAGE50-20260620] honeymoon-profile 단위 검증 — 미테스트 영역 커버리지 보강
//
// 대상 모듈: src/lib/honeymoon-profile.ts
// 계약(contract) 요약:
//  - computeProfileFromSelections: 월드컵 선택 배열 → 가중치(R16×8=0.5, QF×4=1, SF×2=2, FINAL×1=3)로
//    travelStyle 누적 점수를 산출, 최고점 스타일을 dominantStyle 로 반환. finalWinnerId 는 마지막 선택.
//    알 수 없는 ID/15개 초과 인덱스는 무시. 동점은 객체 키 삽입순(relaxation>adventure>culture>luxury)으로 결정.
//  - buildLocalFallbackResults: worldCupRanking 없으면 스코어 기반(getMatchScore Top5) 폴백.
//    ranking 있으면 Champion(0.99)·Finalist(0.92)·SF(0.85)·스코어 슬롯으로 7개 추천 구성, ID 중복 금지.
//  - preFilterCandidates: getMatchScore 정렬 후 limit 개. ranking 의 Champion 은 0.99 로 강제 부스팅되어 1위.
//
// 계약 힌트("숙박일 nightsRatio 비례·flight 고정")의 실제 스케일링 로직은 PlanStep.tsx 에 있고,
// 본 모듈은 nights 범위를 getMatchScore 필터로만 사용하므로 경계값(min/max nights, 0 예산)을 검증한다.

import { describe, it, expect } from 'vitest';
import {
  computeProfileFromSelections,
  buildLocalFallbackResults,
  preFilterCandidates,
  STYLE_TO_CONCEPTS,
  STYLE_TO_ACCOMMODATION,
  type TravelProfile,
} from '@/lib/honeymoon-profile';
import { WORLD_CUP_IMAGES, type WorldCupImage, type WorldCupRanking } from '@/lib/honeymoon-images';
import { DESTINATIONS } from '@/lib/honeymoon-destinations';

// ── 테스트용 헬퍼 ──────────────────────────────────────────────────────────

/** 단일 travelStyle 의 가짜 이미지 풀 생성 (id = `<style>-<n>`) */
function makeImages(style: WorldCupImage['travelStyle'], count: number): WorldCupImage[] {
  return Array.from({ length: count }, (_, n) => ({
    id: `${style}-${n}`,
    url: '',
    thumbUrl: '',
    label: `L${n}`,
    subLabel: `S${n}`,
    travelStyle: style,
    destinationId: null,
  }));
}

/** 실제 destination ID 로 profile 골격 생성 (budgetRange/nights 는 인자로 주입) */
function makeProfile(overrides: Partial<TravelProfile> = {}): TravelProfile {
  return {
    dominantStyle: 'luxury',
    styleScores: { relaxation: 0, adventure: 0, culture: 0, luxury: 1 },
    selectedImageIds: [],
    finalWinnerId: '',
    profileLabel: '럭셔리 휴양파',
    profileEmoji: '🏖️',
    budgetRange: { min: 0, max: 20_000_000 },
    nights: { min: 1, max: 14 },
    departureMonth: null,
    ...overrides,
  };
}

describe('[CL-COVERAGE50] computeProfileFromSelections — 월드컵 가중치 프로필 산출', () => {
  it('UT.1 happy: 단일 스타일 15선택이면 그 스타일이 dominant + 가중치 총합(=10)이 정확히 누적된다', () => {
    // 동일 luxury 이미지를 15번(R16 8 + QF 4 + SF 2 + FINAL 1) 선택
    const imgs = makeImages('luxury', 1);
    const selections = Array.from({ length: 15 }, () => 'luxury-0');

    const profile = computeProfileFromSelections(selections, imgs);

    // 가중치 합 = 0.5*8 + 1*4 + 2*2 + 3*1 = 4 + 4 + 4 + 3 = 15? → 실제: 0.5*8=4, 1*4=4, 2*2=4, 3=3 → 15
    expect(profile.styleScores.luxury).toBeCloseTo(15, 5);
    expect(profile.styleScores.relaxation).toBe(0);
    expect(profile.dominantStyle).toBe('luxury');
    expect(profile.profileLabel).toBe('럭셔리 휴양파');
    expect(profile.profileEmoji).toBe('🏖️');
    // finalWinnerId = 마지막 선택
    expect(profile.finalWinnerId).toBe('luxury-0');
    expect(profile.selectedImageIds).toEqual(selections);
  });

  it('UT.2 가중치 위치 민감도: FINAL(인덱스14·×3) 1표가 R16(인덱스0·×0.5) 1표를 역전시킨다', () => {
    // adventure 를 R16 슬롯(인덱스0)에, culture 를 FINAL 슬롯(인덱스14)에 배치
    const imgs = [...makeImages('adventure', 1), ...makeImages('culture', 1)];
    const selections = new Array(15).fill('adventure-0'); // 전부 adventure(0.5*8 + ...)
    selections[14] = 'culture-0'; // 마지막만 culture(×3)

    const profile = computeProfileFromSelections(selections, imgs);

    // adventure = 인덱스 0~13 가중치 합 = (0.5*8 + 1*4 + 2*2) = 12, culture = 3
    expect(profile.styleScores.culture).toBeCloseTo(3, 5);
    expect(profile.styleScores.adventure).toBeCloseTo(12, 5);
    // 단일 FINAL 표(3)만으로는 12를 못 이김 → dominant 는 여전히 adventure
    expect(profile.dominantStyle).toBe('adventure');
    expect(profile.finalWinnerId).toBe('culture-0');
  });

  it('UT.3 boundary/empty: 빈 선택 배열 → 모든 점수 0, dominant=relaxation(키 삽입순), finalWinnerId=""', () => {
    const profile = computeProfileFromSelections([], makeImages('luxury', 1));

    expect(profile.styleScores).toEqual({ relaxation: 0, adventure: 0, culture: 0, luxury: 0 });
    // 전부 동점(0) → Object.entries 안정정렬로 첫 키 relaxation 이 dominant
    expect(profile.dominantStyle).toBe('relaxation');
    expect(profile.finalWinnerId).toBe('');
    expect(profile.profileLabel).toBe('여유로운 힐링파');
  });

  it('UT.4 invalid/missing: 풀에 없는 ID 와 15개 초과(인덱스>=15) 선택은 점수에 영향 없다', () => {
    const imgs = makeImages('luxury', 1);
    // 17개 선택: 0~14 는 luxury, 15·16 은 (가중치 범위 밖) + 'ghost' 는 풀에 없는 ID
    const selections = [
      ...Array.from({ length: 14 }, () => 'luxury-0'), // 인덱스 0~13
      'ghost-unknown', // 인덱스 14(FINAL ×3) 인데 풀에 없음 → 점수 0
      'luxury-0', // 인덱스 15 → weights 범위 밖, 무시
      'luxury-0', // 인덱스 16 → 무시
    ];

    const profile = computeProfileFromSelections(selections, imgs);

    // 유효 누적: 인덱스0~13 의 luxury 가중치 = 0.5*8 + 1*4 + 2*2 = 12 (인덱스14 ghost·15·16 제외)
    expect(profile.styleScores.luxury).toBeCloseTo(12, 5);
    // finalWinnerId 는 점수 무관, 단순히 배열 마지막 원소
    expect(profile.finalWinnerId).toBe('luxury-0');
  });

  it('UT.5 default pool: allImages 미지정 시 전역 WORLD_CUP_IMAGES 풀로 해석한다', () => {
    // WORLD_CUP_IMAGES 의 첫 luxury 이미지(img-maldives-villa) 를 FINAL 슬롯에 단독 배치
    const luxImg = WORLD_CUP_IMAGES.find(i => i.travelStyle === 'luxury')!;
    const selections = new Array(15).fill('') ;
    selections[14] = luxImg.id; // FINAL ×3, 나머지는 풀에 없는 빈 문자열 → 무시

    const profile = computeProfileFromSelections(selections); // allImages 생략

    expect(profile.styleScores.luxury).toBeCloseTo(3, 5);
    expect(profile.dominantStyle).toBe('luxury');
  });
});

describe('[CL-COVERAGE50] buildLocalFallbackResults — 스코어 기반 폴백(랭킹 없음)', () => {
  it('AC.1 happy: worldCupRanking 없으면 최대 5개 추천 + 스타일 라벨/이모지 반영', () => {
    const profile = makeProfile({ dominantStyle: 'luxury', profileLabel: '럭셔리 휴양파', profileEmoji: '🏖️' });
    const result = buildLocalFallbackResults(profile);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
    expect(result.profileLabel).toBe('럭셔리 휴양파');
    expect(result.profileEmoji).toBe('🏖️');
    // 추천 destinationId 는 모두 실제 카탈로그에 존재해야 함
    const known = new Set(DESTINATIONS.map(d => d.id));
    for (const r of result.recommendations) {
      expect(known.has(r.destinationId)).toBe(true);
      // matchScore 는 소수 둘째자리로 반올림된 0~1 값
      expect(r.matchScore).toBeGreaterThanOrEqual(0);
      expect(r.matchScore).toBeLessThanOrEqual(1);
      expect(r.highlights.length).toBeLessThanOrEqual(3);
    }
  });

  it('AC.2 정렬 불변식: 추천 목록의 matchScore 는 비오름차순(내림차순 정렬)이다', () => {
    const profile = makeProfile({ dominantStyle: 'relaxation' });
    const result = buildLocalFallbackResults(profile);

    const scores = result.recommendations.map(r => r.matchScore);
    const sortedDesc = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedDesc);
    // 추천 ID 는 서로 중복되지 않아야 함
    expect(new Set(result.recommendations.map(r => r.destinationId)).size).toBe(result.recommendations.length);
  });

  it('AC.3 ranking 경로: worldCupRanking 제공 시 Champion 이 0.99 로 1순위, 추천에 반드시 포함된다', () => {
    // 실제 ID 사용: bali=champion, paris=finalist, hawaii/cancun=SF, maldives/santorini=QF
    const ranking: WorldCupRanking = {
      champion: 'bali',
      finalist: 'paris',
      semiFinalists: ['hawaii', 'cancun'],
      quarterFinalists: ['maldives', 'santorini'],
    };
    const profile = makeProfile({ dominantStyle: 'relaxation', worldCupRanking: ranking });

    const result = buildLocalFallbackResults(profile);
    const ids = result.recommendations.map(r => r.destinationId);

    // Champion 은 첫 슬롯 + 0.99 점
    expect(result.recommendations[0].destinationId).toBe('bali');
    expect(result.recommendations[0].matchScore).toBeCloseTo(0.99, 5);
    // Finalist 도 포함되며 0.92 점
    expect(ids).toContain('paris');
    const finalistRec = result.recommendations.find(r => r.destinationId === 'paris')!;
    expect(finalistRec.matchScore).toBeCloseTo(0.92, 5);
    // ID 중복 없음(Champion/Finalist/SF/스코어 슬롯 전부 unique)
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('[CL-COVERAGE50] preFilterCandidates — 후보 프리필터(부스팅·경계값)', () => {
  it('PF.1 happy: limit 개수만큼만 반환하고 score 내림차순 정렬된다', () => {
    const profile = makeProfile({ dominantStyle: 'luxury' });
    const out = preFilterCandidates(profile, 10);

    expect(out.length).toBe(10);
    const scores = out.map(o => o.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // 모든 후보는 실제 destination 객체
    const known = new Set(DESTINATIONS.map(d => d.id));
    for (const o of out) expect(known.has(o.destination.id)).toBe(true);
  });

  it('PF.2 boundary: limit 가 전체 개수 이상이면 전체 destination 을 반환한다', () => {
    const profile = makeProfile();
    const out = preFilterCandidates(profile, 9999);
    expect(out.length).toBe(DESTINATIONS.length);
  });

  it('PF.3 edge(예산 0): maxBudget=0 이면 모든 여행지가 예산 초과 감점되지만 정렬 불변식은 유지된다', () => {
    // budgetRange.max = 0 → getMatchScore 에서 destination.budgetRange.min > 0 이므로 0.2 배 감점
    const profile = makeProfile({ budgetRange: { min: 0, max: 0 }, dominantStyle: 'relaxation' });
    const out = preFilterCandidates(profile, 5);

    expect(out.length).toBe(5);
    const scores = out.map(o => o.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    // 모든 score 는 [0,1] 범위 + 0 예산이라 상위라도 1 미만(감점 적용)
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  // [CL-COVERAGE50-FIX-20260620] FIXED: champion/finalist/SF 를 고정 슬롯(1.3/1.2/1.1)으로 부스팅해
  // 자연 매칭점수(≤1.0)와 무관하게 champion 이 항상 1위가 되도록 보장(이전 0.99 는 자연 1.0 에 밀렸음).
  it('PF.4 edge(랭킹 부스팅): ranking.champion 은 매칭점수와 무관하게 부스팅되어 1위가 된다', () => {
    // 럭셔리 스타일에서 champion='발리'(자연점수 0.75) 지정. finalist='maldives'(자연점수 1.0).
    const ranking: WorldCupRanking = {
      champion: 'bali',
      finalist: 'maldives',
      semiFinalists: ['hawaii'],
      quarterFinalists: ['cancun'],
    };
    const profile = makeProfile({ dominantStyle: 'luxury', worldCupRanking: ranking });

    const out = preFilterCandidates(profile, 20);

    // champion=bali 는 고정 1.3 슬롯으로 maldives(자연 1.0)를 제치고 항상 1위.
    expect(out[0].destination.id).toBe('bali');
  });

  it('PF.4b edge(랭킹 부스팅 — 실재 동작 검증): champion·finalist 모두 강하게 부스팅되어 상위권에 든다', () => {
    // champion=bali → 고정 1.3, finalist=maldives → 고정 1.2 슬롯. 둘 다 상위 2위 안에 들어야 한다.
    const ranking: WorldCupRanking = {
      champion: 'bali',
      finalist: 'maldives',
      semiFinalists: ['hawaii'],
      quarterFinalists: ['cancun'],
    };
    const profile = makeProfile({ dominantStyle: 'luxury', worldCupRanking: ranking });

    const out = preFilterCandidates(profile, 20);
    const top2 = out.slice(0, 2).map(o => o.destination.id);

    // champion 과 finalist 가 (순서 무관) 최상위 2개를 차지
    expect(top2).toContain('bali');
    expect(top2).toContain('maldives');
    // champion 은 고정 1.3 슬롯으로 부스팅된다
    const champ = out.find(o => o.destination.id === 'bali')!;
    expect(champ.score).toBeCloseTo(1.3, 5);
  });
});

describe('[CL-COVERAGE50] 스타일→필터 매핑 상수 무결성', () => {
  it('MP.1 STYLE_TO_CONCEPTS / STYLE_TO_ACCOMMODATION 는 4개 TravelStyle 키를 모두 정의하고 비어있지 않다', () => {
    const styles = ['relaxation', 'adventure', 'culture', 'luxury'] as const;
    for (const s of styles) {
      expect(STYLE_TO_CONCEPTS[s].length).toBeGreaterThan(0);
      expect(STYLE_TO_ACCOMMODATION[s].length).toBeGreaterThan(0);
    }
  });
});
