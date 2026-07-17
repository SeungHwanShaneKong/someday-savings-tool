// [CL-COVERAGE50-20260620] average-costs 단위 검증 — 미테스트 영역 커버리지 보강
import { describe, it, expect } from 'vitest';
import {
  AVERAGE_COSTS,
  SOURCE_TEXT,
  getAverageCost,
  hasAverageCost,
  type AverageCostData,
} from '../average-costs';

/**
 * 계약(Contract) 요약
 * - getAverageCost(categoryId, subCategoryId): 존재하면 AverageCostData, 없으면 null.
 *   카테고리 또는 서브카테고리 키가 없어도 throw 하지 않고 안전하게 null.
 * - hasAverageCost(categoryId, subCategoryId): 동일 키에 대해 존재 여부 boolean.
 * - getAverageCost / hasAverageCost 는 같은 키에 대해 일관(consistency)되어야 한다.
 * - amount 가 0 인 항목(예: miscellaneous/wedding-planner)도 "존재"하는 데이터다 —
 *   0 은 falsy 지만 데이터 객체 자체는 truthy 이므로 null 로 떨어지면 안 된다(핵심 경계).
 */
describe('average-costs', () => {
  describe('AC.1 getAverageCost — happy path', () => {
    it('AC.1.1 알려진 카테고리×서브카테고리는 정확한 amount/note 를 반환한다', () => {
      // [CL-COST-2026Q2-20260713-231500] 2026 상반기 공표치: 식대 200명×5.8만(참가격 2025.4)=1,160만
      const meal = getAverageCost('main-ceremony', 'meal-cost');
      expect(meal).not.toBeNull();
      // 비-널 단언 후 필드 접근(타입 안전)
      expect(meal!.amount).toBe(11600000);
      expect(meal!.note).toBe('200명 기준');
      // 대관료 = 전국 중간가 350만(참가격 2026.2)
      const venue = getAverageCost('main-ceremony', 'venue-fee');
      expect(venue!.amount).toBe(3500000);
      expect(venue!.note).toContain('참가격');
    });

    it('AC.1.2 note 가 없는 항목은 note 가 undefined 다(추가 필드 미발명)', () => {
      // [CL-COST-2026Q2-20260713-231500] venue-fee 에 출처 note 가 생겨 note-없는 항목을 ceremony-staff 로 교체
      const staff = getAverageCost('main-ceremony', 'ceremony-staff');
      expect(staff).not.toBeNull();
      expect(staff!.amount).toBe(400000);
      expect(staff!.note).toBeUndefined();
    });

    it('AC.1.3 반환된 객체는 원본 AVERAGE_COSTS 레퍼런스와 동일(복제 아님)', () => {
      const result = getAverageCost('honeymoon', 'flight');
      // 구현은 사본을 만들지 않고 원본 참조를 그대로 반환한다.
      expect(result).toBe(AVERAGE_COSTS['honeymoon']['flight']);
    });
  });

  describe('AC.2 getAverageCost — 경계: amount 0 (falsy 데이터)', () => {
    it('AC.2.1 amount 가 0 인 항목도 null 이 아닌 데이터 객체를 반환한다', () => {
      // wedding-planner / bag-helper 는 amount:0 — "존재하지만 비용 0"
      const planner = getAverageCost('miscellaneous', 'wedding-planner');
      expect(planner).not.toBeNull();
      expect(planner!.amount).toBe(0);

      const bagHelper = getAverageCost('miscellaneous', 'bag-helper');
      expect(bagHelper).not.toBeNull();
      expect(bagHelper!.amount).toBe(0);
    });

    it('AC.2.2 amount 0 항목도 hasAverageCost 는 true (존재≠비용유무)', () => {
      expect(hasAverageCost('miscellaneous', 'wedding-planner')).toBe(true);
      expect(hasAverageCost('miscellaneous', 'bag-helper')).toBe(true);
    });
  });

  describe('AC.3 getAverageCost — 누락/유효하지 않은 입력 안전 처리', () => {
    it('AC.3.1 존재하지 않는 카테고리는 throw 없이 null', () => {
      expect(getAverageCost('no-such-category', 'whatever')).toBeNull();
    });

    it('AC.3.2 카테고리는 있으나 서브카테고리가 없으면 null', () => {
      expect(getAverageCost('honeymoon', 'no-such-sub')).toBeNull();
    });

    it('AC.3.3 빈 문자열 키도 안전하게 null (옵셔널 체이닝 가드)', () => {
      expect(getAverageCost('', '')).toBeNull();
      expect(getAverageCost('honeymoon', '')).toBeNull();
    });

    // [CL-COVERAGE50-FIX-20260620] FIXED: getAverageCost/hasAverageCost 가 hasOwnProperty.call 가드를
    // 추가해 own-property 만 인정한다. 'toString'/'hasOwnProperty'/'valueOf' 등 상속 멤버는 이제 null.
    it('AC.3.4 상속된 프로토타입 키(toString/hasOwnProperty)는 데이터로 오인하면 안 된다', () => {
      expect(getAverageCost('main-ceremony', 'toString')).toBeNull();
      expect(getAverageCost('main-ceremony', 'hasOwnProperty')).toBeNull();
      expect(getAverageCost('main-ceremony', 'valueOf')).toBeNull();
    });
  });

  describe('AC.4 hasAverageCost — 존재 여부 및 getAverageCost 와의 일관성', () => {
    it('AC.4.1 존재하는 키는 true, 없는 키는 false', () => {
      expect(hasAverageCost('sudeme-styling', 'dress-main')).toBe(true);
      expect(hasAverageCost('sudeme-styling', 'no-such-sub')).toBe(false);
      expect(hasAverageCost('no-such-category', 'dress-main')).toBe(false);
    });

    it('AC.4.2 모든 실제 항목에서 has===true 이고 get!==null 로 두 API 가 일관된다', () => {
      const categoryIds = Object.keys(AVERAGE_COSTS);
      expect(categoryIds.length).toBeGreaterThan(0);

      let checked = 0;
      for (const categoryId of categoryIds) {
        const subIds = Object.keys(AVERAGE_COSTS[categoryId]);
        for (const subId of subIds) {
          const has = hasAverageCost(categoryId, subId);
          const got = getAverageCost(categoryId, subId);
          // 일관성: has 가 true 면 get 은 non-null, has 가 false 면 get 은 null
          expect(has).toBe(true);
          expect(got).not.toBeNull();
          // getAverageCost 의 truthy 분기가 amount 0 항목에서도 데이터를 떨구지 않음
          expect(typeof got!.amount).toBe('number');
          checked++;
        }
      }
      expect(checked).toBeGreaterThanOrEqual(30); // 6개 카테고리 × 다수 항목
    });
  });

  describe('AC.5 데이터 무결성(AVERAGE_COSTS / SOURCE_TEXT)', () => {
    it('AC.5.1 모든 항목 amount 는 0 이상 유한한 숫자다', () => {
      const allItems: AverageCostData[] = Object.values(AVERAGE_COSTS).flatMap(
        (subMap) => Object.values(subMap),
      );
      expect(allItems.length).toBeGreaterThan(0);
      for (const item of allItems) {
        expect(typeof item.amount).toBe('number');
        expect(Number.isFinite(item.amount)).toBe(true);
        expect(item.amount).toBeGreaterThanOrEqual(0);
        // note 가 정의되어 있다면 비어있지 않은 문자열
        if (item.note !== undefined) {
          expect(typeof item.note).toBe('string');
          expect(item.note.length).toBeGreaterThan(0);
        }
      }
    });

    it('AC.5.2 6개 핵심 카테고리가 모두 존재한다(스키마 회귀 가드)', () => {
      const expected = [
        'main-ceremony',
        'sudeme-styling',
        'gifts-houseware',
        'preparation-promotion',
        'honeymoon',
        'miscellaneous',
      ];
      for (const cat of expected) {
        expect(Object.prototype.hasOwnProperty.call(AVERAGE_COSTS, cat)).toBe(true);
      }
    });

    it('AC.5.3 SOURCE_TEXT 는 출처 고지 문자열을 노출한다(2026 공표 자료 기준)', () => {
      expect(SOURCE_TEXT).toContain('출처');
      expect(SOURCE_TEXT).toContain('2026');
      expect(SOURCE_TEXT).toContain('참가격'); // 'AI 조사' 문구 제거 회귀 가드 — 실출처 표기
    });
  });
});
