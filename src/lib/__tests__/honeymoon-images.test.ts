// [CL-COVERAGE50-20260620] honeymoon-images 단위 검증 — 미테스트 영역 커버리지 보강
//
// 계약(Contract) 기준 검증 대상 (CONTRACT HINT: 이미지 URL 생성/onError 폴백/중복 photoId 방지/CDN URL 형식):
//  - generateRandomWorldCupImages(count): count개 선발, 모든 카드는 "사진 카드(CDN url)" 또는 "그래디언트 폴백 카드(빈 url)" 중 하나
//  - 사진 카드 url/thumbUrl 은 Unsplash CDN(`https://images.unsplash.com/photo-...`) 형식
//  - 중복 photoId 가드: 동일 Unsplash photo 가 두 카드에 쓰이면 → 두 번째부터 그래디언트 카드(url='')로 전환
//  - generateBracket: 15매치(R16 8 + QF 4 + SF 2 + FINAL 1) 구조
//  - advanceBracket: 라운드별 승자 전파 (R16→QF→SF→FINAL)
//  - extractWorldCupRanking: champion/finalist/SF·QF 랭킹 추출, 미완료 시 null
//
// 결정성: generateRandomWorldCupImages 는 Math.random(Fisher–Yates) 의존 → 무작위 값에 흔들리지 않는
// "구조적 불변식(structural invariants)"만 단언한다. 시드가 필요한 케이스는 Math.random 을 스텁한다.

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  generateRandomWorldCupImages,
  generateBracket,
  advanceBracket,
  extractWorldCupRanking,
  WORLD_CUP_IMAGES,
  type WorldCupImage,
  type WorldCupMatch,
} from '../honeymoon-images';

// CDN 형식 정규식: Unsplash images host + photo-<id> + 쿼리스트링
const UNSPLASH_URL_RE = /^https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9_-]+\?/;
const PHOTO_ID_RE = /photo-([a-zA-Z0-9_-]+)\?/;
// 실제 데이터에는 Unsplash 외 Wikimedia 이미지(5개)도 존재 → "사진 카드"의 일반 CDN 형식은
// HTTPS 절대 이미지 URL 로 본다(타입 주석은 "Unsplash CDN"이라 적혀 있으나 데이터가 더 넓음).
const ANY_CDN_URL_RE = /^https:\/\/[a-z0-9.-]+\/.+/i;

/** 사진 카드(url 존재)에서 Unsplash photoId 추출 */
function photoIdOf(url: string): string | undefined {
  return url.match(PHOTO_ID_RE)?.[1];
}

/** 그래디언트 폴백 카드 판별: url/thumbUrl 빈 문자열 + 폴백 메타(이모지·그래디언트) */
function isGradientCard(img: WorldCupImage): boolean {
  return img.url === '' && img.thumbUrl === '';
}

describe('honeymoon-images', () => {
  describe('UT.1 generateRandomWorldCupImages — 선발 개수/카드 무결성', () => {
    it('UT.1.1 기본 호출은 정확히 16개 카드를 반환하고 각 카드는 사진 또는 그래디언트 둘 중 하나의 유효 형태다', () => {
      const imgs = generateRandomWorldCupImages();
      expect(imgs).toHaveLength(16);

      for (const img of imgs) {
        // 공통 필드 런타임 불변식(타입은 TS 가 보장 → typeof 단언 제거)
        expect(img.id.length).toBeGreaterThan(0);
        expect(img.label.length).toBeGreaterThan(0);
        expect(['relaxation', 'adventure', 'culture', 'luxury']).toContain(img.travelStyle);

        if (img.url === '') {
          // 그래디언트 폴백 카드: thumbUrl 도 비어야 하고 폴백 메타가 존재
          expect(img.thumbUrl).toBe('');
          expect(typeof img.regionGradient).toBe('string');
          expect(img.regionGradient!.length).toBeGreaterThan(0);
        } else {
          // 사진 카드: url/thumbUrl 모두 HTTPS CDN 절대 URL(Unsplash 또는 Wikimedia)
          expect(img.url).toMatch(ANY_CDN_URL_RE);
          expect(img.thumbUrl).toMatch(ANY_CDN_URL_RE);
        }
      }
    });

    it('UT.1.2 count 인자(경계: 8)를 존중해 정확히 그 개수만 반환한다', () => {
      const imgs = generateRandomWorldCupImages(8);
      expect(imgs).toHaveLength(8);
    });
  });

  describe('AC.1 CDN URL 형식 / 중복 photoId 방지 가드', () => {
    it('AC.1.1 현행 데이터의 Unsplash 사진 카드 photoId 는 서로 유일하다 (데이터 회귀 가드 — 가드 동작 검증은 AC.2)', () => {
      // 주: 이 단언은 "현행 데이터에 충돌이 없음"을 고정하는 데이터 회귀 가드다(실제 dedup 가드 동작은 AC.2 에서 강제 충돌로 검증).
      for (let run = 0; run < 25; run++) {
        const imgs = generateRandomWorldCupImages(16);
        const seenPhotoIds = new Set<string>();
        for (const img of imgs) {
          if (img.url === '') continue; // 그래디언트 카드는 photoId 없음
          const pid = photoIdOf(img.url);
          if (!pid) continue; // 비-Unsplash(Wikimedia) 사진 카드 → 가드 대상 아님
          expect(
            seenPhotoIds.has(pid),
            `Unsplash photoId 중복 발견(가드 실패): ${pid}`,
          ).toBe(false);
          seenPhotoIds.add(pid);
        }
      }
    });

    it('AC.1.3 사진 카드 사이에 완전히 동일한 url 이 두 번 나타나지 않는다 (현행 데이터 기준)', () => {
      // [CL-COVERAGE50-FIX-20260620] dedup 가드가 전체 url 키로 일반화되어 Wikimedia 등 비-Unsplash 동일
      // URL 충돌도 잡는다(가드 동작 검증은 AC.2.2). 여기선 현행 데이터의 url 유일성(데이터 회귀)을 가드한다.
      for (let run = 0; run < 25; run++) {
        const imgs = generateRandomWorldCupImages(16);
        const urls = imgs.filter((i) => i.url !== '').map((i) => i.url);
        expect(new Set(urls).size, '사진 카드 url 중복').toBe(urls.length);
      }
    });

    it('AC.1.2 Unsplash 사진 카드의 url(800w)과 thumbUrl(100w)은 동일 photoId 를 공유하고 폭만 다르다', () => {
      const imgs = generateRandomWorldCupImages(16);
      const photoCards = imgs.filter((i) => i.url !== '');
      // 데이터 특성상 최소 1장 이상은 사진 카드여야 함 (실제 WORLD_CUP_IMAGES + DESTINATION_IMAGES 존재)
      expect(photoCards.length).toBeGreaterThan(0);

      const unsplashCards = photoCards.filter((i) => UNSPLASH_URL_RE.test(i.url));
      // Unsplash 카드가 다수이므로 최소 1장은 있어야 함
      expect(unsplashCards.length).toBeGreaterThan(0);

      for (const img of unsplashCards) {
        expect(photoIdOf(img.url)).toBe(photoIdOf(img.thumbUrl));
        expect(img.url).toContain('w=800');
        expect(img.thumbUrl).toContain('w=100');
      }
    });
  });

  describe('AC.2 dedup 가드 — 강제 충돌(데이터 격리 mock 으로 가드 실제 커버)', () => {
    // [CL-COVERAGE50-FIX-20260620] 실데이터엔 photoId 충돌이 없어 가드가 vacuous(가드를 꺼도 통과).
    // → DESTINATION_IMAGES 를 "모든 id → 동일 url" Proxy 로 격리 mock 해 충돌을 강제하고,
    //   두 번째부터 그래디언트로 전환되는지(가드 동작)와 비-Unsplash(Wikimedia) dedup 수정을 검증한다.
    //   (정적 import 와 분리: vi.resetModules + 동적 import 로 mock 된 의존을 주입.)
    afterEach(() => {
      vi.doUnmock('../honeymoon-destination-images');
      vi.resetModules();
    });

    it('AC.2.1 동일 Unsplash photoId 충돌 시 첫 카드만 사진·나머지는 그래디언트로 전환된다', async () => {
      const SHARED = 'https://images.unsplash.com/photo-SHAREDCOLLIDE?w=800&q=80';
      vi.resetModules();
      vi.doMock('../honeymoon-destination-images', () => ({
        DESTINATION_IMAGES: new Proxy(
          {},
          { get: () => ({ url: SHARED, thumbUrl: SHARED.replace('w=800', 'w=100') }) },
        ),
      }));
      const mod = await import('../honeymoon-images');
      const imgs = mod.generateRandomWorldCupImages(16);

      // 가드가 동작하면 동일 photoId 사진 카드는 최대 1장(나머지는 그래디언트로 강등)
      const sharedPhotoCards = imgs.filter((i) => i.url.includes('SHAREDCOLLIDE'));
      expect(sharedPhotoCards.length).toBeLessThanOrEqual(1);

      // 충돌로 밀려난 카드는 그래디언트 + 폴백 메타(이모지/그래디언트)를 보유
      const gradients = imgs.filter(isGradientCard);
      expect(gradients.length).toBeGreaterThan(0);
      for (const g of gradients) {
        expect(g.regionGradient && g.regionGradient.length > 0).toBe(true);
        expect(g.markerEmoji && g.markerEmoji.length > 0).toBe(true);
      }
    });

    it('AC.2.2 비-Unsplash(Wikimedia 등) 동일 url 충돌도 dedup 된다 [CL-COVERAGE50-FIX-20260620]', async () => {
      // 수정 전: dedup 키가 Unsplash photoId 전용이라 Wikimedia 동일 url 은 중복 노출(가드 우회).
      // 수정 후: 전체 url 키로 일반화 → 동일 Wikimedia url 사진 카드는 최대 1장.
      const WIKI = 'https://upload.wikimedia.org/wikipedia/commons/shared-collide.jpg';
      vi.resetModules();
      vi.doMock('../honeymoon-destination-images', () => ({
        DESTINATION_IMAGES: new Proxy({}, { get: () => ({ url: WIKI, thumbUrl: WIKI }) }),
      }));
      const mod = await import('../honeymoon-images');
      const imgs = mod.generateRandomWorldCupImages(16);

      const wikiPhotoCards = imgs.filter((i) => i.url === WIKI);
      expect(wikiPhotoCards.length).toBeLessThanOrEqual(1);
    });
  });

  describe('UT.2 generateBracket — 토너먼트 구조 불변식', () => {
    it('UT.2.1 15매치(R16 8 + QF 4 + SF 2 + FINAL 1)를 globalIndex 0..14 순서로 생성한다', () => {
      const imgs = generateRandomWorldCupImages(16);
      const bracket = generateBracket(imgs);

      expect(bracket).toHaveLength(15);
      bracket.forEach((m, i) => expect(m.globalIndex).toBe(i));

      const byRound = (r: WorldCupMatch['round']) => bracket.filter((m) => m.round === r);
      expect(byRound('R16')).toHaveLength(8);
      expect(byRound('QF')).toHaveLength(4);
      expect(byRound('SF')).toHaveLength(2);
      expect(byRound('FINAL')).toHaveLength(1);

      // R16 8매치는 16개 이미지를 A/B 로 순서대로 소비
      const r16 = byRound('R16');
      r16.forEach((m, i) => {
        expect(m.imageA.id).toBe(imgs[i * 2].id);
        expect(m.imageB.id).toBe(imgs[i * 2 + 1].id);
      });
    });

    it('UT.2.2 인자 미전달 시 내부에서 16개 이미지를 자동 생성해 동일 구조를 만든다', () => {
      const bracket = generateBracket();
      expect(bracket).toHaveLength(15);
      // R16 의 모든 슬롯이 채워져 있어야 함(undefined 금지)
      bracket
        .filter((m) => m.round === 'R16')
        .forEach((m) => {
          expect(m.imageA).toBeDefined();
          expect(m.imageB).toBeDefined();
        });
    });
  });

  describe('UT.3 advanceBracket — 라운드 승자 전파', () => {
    // 결정적 16-이미지 픽스처 (CDN/photoId 의존 없이 id 만 필요)
    const fixtureImages: WorldCupImage[] = Array.from({ length: 16 }, (_, i) => ({
      id: `f-${i}`,
      url: '',
      thumbUrl: '',
      label: `라벨${i}`,
      subLabel: `위치${i}`,
      travelStyle: 'relaxation',
      destinationId: `dest-${i}`,
      markerEmoji: '✈️',
      regionGradient: 'from-blue-400 to-indigo-600',
    }));

    it('UT.3.1 R16 매치 승자는 대응되는 QF 슬롯(A/B)으로 정확히 전파된다', () => {
      const bracket = generateBracket(fixtureImages);
      // globalIndex 0(짝수)의 승자 f-0 → QF[8].imageA
      const after0 = advanceBracket(bracket, 0, 'f-0', fixtureImages);
      expect(after0[8].imageA.id).toBe('f-0');

      // globalIndex 1(홀수)의 승자 f-2 → QF[8].imageB
      const after1 = advanceBracket(after0, 1, 'f-2', fixtureImages);
      expect(after1[8].imageB.id).toBe('f-2');

      // globalIndex 3(홀수) 승자 → QF[9].imageB (8 + floor(3/2)=9)
      const after3 = advanceBracket(after1, 3, 'f-6', fixtureImages);
      expect(after3[9].imageB.id).toBe('f-6');

      // 순수성: advanceBracket 은 입력 bracket 을 변형(mutate)하지 않는다.
      // QF[8].imageB 는 placeholder(=imgs[0]=f-0) 였고, after0→after1 에서 f-2 로 바뀌었다.
      // 원본 bracket 의 QF[8].imageB 는 여전히 placeholder(f-0) 여야 한다.
      expect(bracket[8].imageB.id).toBe('f-0');
      expect(after1[8].imageB.id).toBe('f-2');
      // 반환 배열은 입력과 다른 참조(새 배열)
      expect(after0).not.toBe(bracket);
    });

    it('UT.3.2 winnerId 가 이미지 목록에 없으면 bracket 을 변경하지 않고 복제본을 반환한다', () => {
      const bracket = generateBracket(fixtureImages);
      const result = advanceBracket(bracket, 0, 'NON_EXISTENT_ID', fixtureImages);
      // QF[8] 은 여전히 플레이스홀더(imgs[0]=f-0) 그대로여야 함
      expect(result[8].imageA.id).toBe(bracket[8].imageA.id);
      expect(result[8].imageB.id).toBe(bracket[8].imageB.id);
      // 길이/구조 보존
      expect(result).toHaveLength(15);
    });

    it('UT.3.3 SF(12,13) 승자는 FINAL(14)의 A/B 로 전파된다', () => {
      const bracket = generateBracket(fixtureImages);
      const afterSF12 = advanceBracket(bracket, 12, 'f-4', fixtureImages);
      expect(afterSF12[14].imageA.id).toBe('f-4');
      const afterSF13 = advanceBracket(afterSF12, 13, 'f-8', fixtureImages);
      expect(afterSF13[14].imageB.id).toBe('f-8');
    });
  });

  describe('AC.3 extractWorldCupRanking — 랭킹 추출 / 미완료 가드', () => {
    it('AC.3.1 selections 또는 bracket 이 15 미만이면 null 을 반환한다 (미완료 토너먼트)', () => {
      const imgs = generateRandomWorldCupImages(16);
      const bracket = generateBracket(imgs);
      // selections 부족
      expect(extractWorldCupRanking(bracket, Array(14).fill('x'), imgs)).toBeNull();
      // bracket 부족 (selections 는 충분)
      expect(extractWorldCupRanking(bracket.slice(0, 14), Array(15).fill('x'), imgs)).toBeNull();
      // 둘 다 빈 경우
      expect(extractWorldCupRanking([], [], imgs)).toBeNull();
    });

    it('AC.3.2 완료된 토너먼트에서 champion/finalist 를 destinationId 로 환원하고 self-중복을 제거한다', () => {
      // 결정적 16-이미지: id=f-i, destinationId=dest-i (1:1 매핑)
      const imgs: WorldCupImage[] = Array.from({ length: 16 }, (_, i) => ({
        id: `f-${i}`,
        url: '',
        thumbUrl: '',
        label: `L${i}`,
        subLabel: `S${i}`,
        travelStyle: 'culture',
        destinationId: `dest-${i}`,
      }));
      const bracket = generateBracket(imgs);

      // R16 승자: 각 매치의 imageA 가 이긴다고 가정 → f-0,f-2,...,f-14
      const selections: string[] = [];
      // globalIndex 0..7 (R16): 승자 = imageA
      for (let g = 0; g <= 7; g++) selections[g] = bracket[g].imageA.id;
      // QF/SF/FINAL 전파를 실제 advanceBracket 으로 구성
      let b = bracket;
      for (let g = 0; g <= 7; g++) b = advanceBracket(b, g, selections[g], imgs);
      // QF(8..11): imageA 승
      for (let g = 8; g <= 11; g++) {
        selections[g] = b[g].imageA.id;
        b = advanceBracket(b, g, selections[g], imgs);
      }
      // SF(12,13): imageA 승
      for (let g = 12; g <= 13; g++) {
        selections[g] = b[g].imageA.id;
        b = advanceBracket(b, g, selections[g], imgs);
      }
      // FINAL(14): imageA 승 = champion
      selections[14] = b[14].imageA.id;

      const ranking = extractWorldCupRanking(b, selections, imgs);
      expect(ranking).not.toBeNull();

      const champImgId = selections[14];
      const finalMatch = b[14];
      const expectedFinalistImgId =
        finalMatch.imageA.id === champImgId ? finalMatch.imageB.id : finalMatch.imageA.id;

      const dest = (imgId: string) => imgs.find((i) => i.id === imgId)!.destinationId;

      expect(ranking!.champion).toBe(dest(champImgId));
      expect(ranking!.finalist).toBe(dest(expectedFinalistImgId));
      // champion/finalist 는 SF·QF 목록에서 제외(self-중복 제거 불변식)
      expect(ranking!.semiFinalists).not.toContain(ranking!.champion);
      expect(ranking!.semiFinalists).not.toContain(ranking!.finalist);
      expect(ranking!.quarterFinalists).not.toContain(ranking!.champion);
      expect(ranking!.quarterFinalists).not.toContain(ranking!.finalist);
      // SF/QF 목록은 중복 없는 destinationId 집합
      expect(new Set(ranking!.semiFinalists).size).toBe(ranking!.semiFinalists.length);
      expect(new Set(ranking!.quarterFinalists).size).toBe(ranking!.quarterFinalists.length);
    });
  });

  describe('UT.4 정적 데이터(WORLD_CUP_IMAGES) 무결성', () => {
    it('UT.4.1 기존 8개 사진 카드는 모두 Unsplash CDN 형식이고 destinationId 가 연결돼 있다', () => {
      expect(WORLD_CUP_IMAGES.length).toBeGreaterThanOrEqual(7);
      for (const img of WORLD_CUP_IMAGES) {
        expect(img.url).toMatch(UNSPLASH_URL_RE);
        expect(img.thumbUrl).toMatch(UNSPLASH_URL_RE);
        expect(img.destinationId).toBeTruthy();
        // url/thumb 은 같은 photo 의 800w/100w 변형
        expect(photoIdOf(img.url)).toBe(photoIdOf(img.thumbUrl));
      }
    });
  });
});
