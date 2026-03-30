/**
 * [CL-HONEYMOON-REDESIGN-20260316] 이미지 월드컵 데이터 + 토너먼트 로직
 * [CL-IMPROVE-7TASKS-20260330] 16강 확장: 100개 여행지 중 16개 랜덤 선발
 */

import { DESTINATIONS, type DestinationRegion } from './honeymoon-destinations';
import type { Destination } from './honeymoon-destinations';
import { DESTINATION_IMAGES } from './honeymoon-destination-images';

export type TravelStyle = 'relaxation' | 'adventure' | 'culture' | 'luxury';

export interface WorldCupImage {
  id: string;
  url: string;          // Unsplash CDN 800w (빈 문자열이면 그래디언트 카드)
  thumbUrl: string;     // Unsplash CDN 100w (blur placeholder)
  label: string;        // 한국어 오버레이 라벨
  subLabel: string;     // 위치 설명
  travelStyle: TravelStyle;
  destinationId: string | null; // honeymoon-destinations.ts ID 연결
  // [CL-IMPROVE-7TASKS-20260330] 그래디언트 카드용 필드
  markerEmoji?: string;       // 여행지 이모지
  regionGradient?: string;    // 지역별 Tailwind 그래디언트 CSS
}

export interface WorldCupMatch {
  round: 'R16' | 'QF' | 'SF' | 'FINAL'; // [CL-IMPROVE-7TASKS-20260330] R16 추가
  matchIndex: number;    // 라운드 내 인덱스 (0-based)
  globalIndex: number;   // 전체 인덱스 (0-14)
  imageA: WorldCupImage;
  imageB: WorldCupImage;
}

// ── 기존 8개 이미지 데이터 (하위 호환 + 사진 카드용) ──
export const WORLD_CUP_IMAGES: WorldCupImage[] = [
  {
    id: 'img-maldives-villa',
    url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=100&q=40',
    label: '수상 빌라에서 맞는 일출',
    subLabel: '몰디브',
    travelStyle: 'luxury',
    destinationId: 'maldives',
  },
  {
    id: 'img-bali-terrace',
    url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=100&q=40',
    label: '초록빛 라이스 테라스 산책',
    subLabel: '발리 우붓',
    travelStyle: 'relaxation',
    destinationId: 'bali',
  },
  {
    id: 'img-paris-eiffel',
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=100&q=40',
    label: '에펠탑이 보이는 카페 테라스',
    subLabel: '파리',
    travelStyle: 'culture',
    destinationId: 'europe',
  },
  {
    id: 'img-hawaii-surf',
    url: 'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=100&q=40',
    label: '파도 위의 자유',
    subLabel: '하와이 와이키키',
    travelStyle: 'adventure',
    destinationId: 'hawaii',
  },
  {
    id: 'img-santorini-sunset',
    url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=100&q=40',
    label: '지중해 석양의 매력',
    subLabel: '산토리니',
    travelStyle: 'luxury',
    destinationId: 'europe',
  },
  {
    id: 'img-jeju-coast',
    url: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=100&q=40',
    label: '제주 해안 드라이브',
    subLabel: '제주 올레길',
    travelStyle: 'relaxation',
    destinationId: 'jeju',
  },
  {
    id: 'img-cancun-cenote',
    url: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=100&q=40',
    label: '신비로운 세노테 다이빙',
    subLabel: '칸쿤',
    travelStyle: 'adventure',
    destinationId: 'cancun',
  },
  {
    id: 'img-rome-colosseum',
    url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=100&q=40',
    label: '2000년 역사의 콜로세움',
    subLabel: '로마',
    travelStyle: 'culture',
    destinationId: 'europe',
  },
];

// ── [CL-IMPROVE-7TASKS-20260330] 지역별 그래디언트 ──

const REGION_GRADIENTS: Record<DestinationRegion, string> = {
  '동남아': 'from-emerald-400 to-teal-600',
  '동아시아': 'from-rose-400 to-pink-600',
  '남아시아/인도양': 'from-cyan-400 to-blue-600',
  '유럽': 'from-violet-400 to-purple-600',
  '북미': 'from-amber-400 to-orange-600',
  '중남미/카리브': 'from-red-400 to-rose-600',
  '오세아니아/태평양': 'from-sky-400 to-blue-600',
  '중동/아프리카': 'from-yellow-400 to-amber-600',
  '국내': 'from-green-400 to-emerald-600',
};

// ── [CL-IMPROVE-7TASKS-20260330] concepts → TravelStyle 매핑 ──

function conceptToTravelStyle(d: Destination): TravelStyle {
  const primary = d.concepts[0];
  if (primary === '휴양') {
    // 예산 상위 → luxury, 아니면 relaxation
    return d.budgetRange.min >= 8_000_000 ? 'luxury' : 'relaxation';
  }
  if (primary === '액티비티') return 'adventure';
  if (primary === '관광' || primary === '쇼핑') return 'culture';
  return 'relaxation';
}

// ── Fisher–Yates 셔플 ──

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * [CL-IMPROVE-7TASKS-20260330] 100개 여행지에서 16개 랜덤 선발
 * 지역 다양성 보장: 각 지역에서 최소 1개씩 → 나머지 랜덤 채움
 */
export function generateRandomWorldCupImages(count = 16): WorldCupImage[] {
  // 지역별 그룹핑
  const byRegion = new Map<DestinationRegion, Destination[]>();
  for (const d of DESTINATIONS) {
    const list = byRegion.get(d.region) ?? [];
    list.push(d);
    byRegion.set(d.region, list);
  }

  const selected: Destination[] = [];
  const usedIds = new Set<string>();

  // Phase 1: 각 지역에서 1개씩 랜덤 선택 (최대 9지역)
  for (const [, dests] of byRegion) {
    const shuffled = shuffle(dests);
    if (shuffled.length > 0) {
      selected.push(shuffled[0]);
      usedIds.add(shuffled[0].id);
    }
  }

  // Phase 2: 나머지 슬롯 랜덤 채움
  const remaining = shuffle(DESTINATIONS.filter(d => !usedIds.has(d.id)));
  for (const d of remaining) {
    if (selected.length >= count) break;
    selected.push(d);
  }

  // 최종 셔플
  const finalList = shuffle(selected).slice(0, count);

  // [CL-MAP-WORLDCUP-FIX-20260330] Destination → WorldCupImage 변환
  // 1순위: 기존 WORLD_CUP_IMAGES (라벨/스타일 커스텀)
  // 2순위: DESTINATION_IMAGES (100개 Unsplash 매핑)
  // 3순위: 그래디언트 카드 fallback
  return finalList.map(d => {
    const existingImg = WORLD_CUP_IMAGES.find(img => img.destinationId === d.id);
    if (existingImg) {
      return { ...existingImg };
    }

    const imgData = DESTINATION_IMAGES[d.id];
    if (imgData) {
      return {
        id: `wc-${d.id}`,
        url: imgData.url,
        thumbUrl: imgData.thumbUrl,
        label: d.highlights[0] ?? d.description.slice(0, 20),
        subLabel: d.name,
        travelStyle: conceptToTravelStyle(d),
        destinationId: d.id,
      };
    }

    // 최종 fallback: 그래디언트 카드
    return {
      id: `wc-${d.id}`,
      url: '',
      thumbUrl: '',
      label: d.highlights[0] ?? d.description.slice(0, 20),
      subLabel: d.name,
      travelStyle: conceptToTravelStyle(d),
      destinationId: d.id,
      markerEmoji: d.markerEmoji,
      regionGradient: REGION_GRADIENTS[d.region] ?? 'from-blue-400 to-indigo-600',
    };
  });
}

/**
 * [CL-IMPROVE-7TASKS-20260330] 16강 토너먼트 bracket 생성
 * R16: 8매치 (0-7), QF: 4매치 (8-11), SF: 2매치 (12-13), FINAL: 1매치 (14)
 * 총 15매치
 */
export function generateBracket(images?: WorldCupImage[]): WorldCupMatch[] {
  const imgs = images ?? generateRandomWorldCupImages();
  const placeholder = imgs[0]; // QF/SF/FINAL 플레이스홀더

  return [
    // R16 — 8매치
    { round: 'R16', matchIndex: 0, globalIndex: 0, imageA: imgs[0], imageB: imgs[1] },
    { round: 'R16', matchIndex: 1, globalIndex: 1, imageA: imgs[2], imageB: imgs[3] },
    { round: 'R16', matchIndex: 2, globalIndex: 2, imageA: imgs[4], imageB: imgs[5] },
    { round: 'R16', matchIndex: 3, globalIndex: 3, imageA: imgs[6], imageB: imgs[7] },
    { round: 'R16', matchIndex: 4, globalIndex: 4, imageA: imgs[8], imageB: imgs[9] },
    { round: 'R16', matchIndex: 5, globalIndex: 5, imageA: imgs[10], imageB: imgs[11] },
    { round: 'R16', matchIndex: 6, globalIndex: 6, imageA: imgs[12], imageB: imgs[13] },
    { round: 'R16', matchIndex: 7, globalIndex: 7, imageA: imgs[14], imageB: imgs[15] },
    // QF — 4매치 (placeholder, 동적으로 채워짐)
    { round: 'QF', matchIndex: 0, globalIndex: 8, imageA: placeholder, imageB: placeholder },
    { round: 'QF', matchIndex: 1, globalIndex: 9, imageA: placeholder, imageB: placeholder },
    { round: 'QF', matchIndex: 2, globalIndex: 10, imageA: placeholder, imageB: placeholder },
    { round: 'QF', matchIndex: 3, globalIndex: 11, imageA: placeholder, imageB: placeholder },
    // SF — 2매치
    { round: 'SF', matchIndex: 0, globalIndex: 12, imageA: placeholder, imageB: placeholder },
    { round: 'SF', matchIndex: 1, globalIndex: 13, imageA: placeholder, imageB: placeholder },
    // FINAL — 1매치
    { round: 'FINAL', matchIndex: 0, globalIndex: 14, imageA: placeholder, imageB: placeholder },
  ];
}

/**
 * [CL-IMPROVE-7TASKS-20260330] 승자 선택 후 bracket 업데이트 (16강 대응)
 *
 * R16(0-7) → QF(8-11): 매치 i → QF[8 + floor(i/2)], A/B = i%2
 * QF(8-11) → SF(12-13): 매치 8+j → SF[12 + floor(j/2)]
 * SF(12-13) → FINAL(14)
 */
export function advanceBracket(
  bracket: WorldCupMatch[],
  globalIndex: number,
  winnerId: string,
  allImages: WorldCupImage[],
): WorldCupMatch[] {
  const updated = bracket.map(m => ({ ...m }));
  const winnerImg = allImages.find(img => img.id === winnerId);
  if (!winnerImg) return updated;

  // R16 (0-7) → QF (8-11)
  if (globalIndex >= 0 && globalIndex <= 7) {
    const qfIdx = 8 + Math.floor(globalIndex / 2);
    if (globalIndex % 2 === 0) updated[qfIdx].imageA = winnerImg;
    else updated[qfIdx].imageB = winnerImg;
  }
  // QF (8-11) → SF (12-13)
  else if (globalIndex >= 8 && globalIndex <= 11) {
    const sfIdx = 12 + Math.floor((globalIndex - 8) / 2);
    if ((globalIndex - 8) % 2 === 0) updated[sfIdx].imageA = winnerImg;
    else updated[sfIdx].imageB = winnerImg;
  }
  // SF (12-13) → FINAL (14)
  else if (globalIndex >= 12 && globalIndex <= 13) {
    if (globalIndex === 12) updated[14].imageA = winnerImg;
    else updated[14].imageB = winnerImg;
  }

  return updated;
}
