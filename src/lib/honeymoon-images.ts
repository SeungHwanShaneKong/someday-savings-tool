/**
 * [CL-HONEYMOON-REDESIGN-20260316] 이미지 월드컵 데이터 + 토너먼트 로직
 * 8장 이미지, 4종 여행 스타일 × 2장
 */

export type TravelStyle = 'relaxation' | 'adventure' | 'culture' | 'luxury';

export interface WorldCupImage {
  id: string;
  url: string;          // Unsplash CDN 800w
  thumbUrl: string;     // Unsplash CDN 100w (blur placeholder)
  label: string;        // 한국어 오버레이 라벨
  subLabel: string;     // 위치 설명
  travelStyle: TravelStyle;
  destinationId: string | null; // honeymoon-destinations.ts ID 연결
}

export interface WorldCupMatch {
  round: 'QF' | 'SF' | 'FINAL';
  matchIndex: number;    // 라운드 내 인덱스 (0-based)
  globalIndex: number;   // 전체 인덱스 (0-6)
  imageA: WorldCupImage;
  imageB: WorldCupImage;
}

// ── 8개 이미지 데이터 ──
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

/**
 * 8강 토너먼트 bracket 생성
 * 시딩: 다른 스타일끼리 대결 (luxury vs relaxation, culture vs adventure)
 *
 * QF0: luxury(몰디브) vs relaxation(발리)
 * QF1: culture(파리) vs adventure(하와이)
 * QF2: luxury(산토리니) vs relaxation(제주)
 * QF3: adventure(칸쿤) vs culture(로마)
 * SF0: winner(QF0) vs winner(QF1)  — placeholder
 * SF1: winner(QF2) vs winner(QF3)  — placeholder
 * FINAL: winner(SF0) vs winner(SF1) — placeholder
 */
export function generateBracket(): WorldCupMatch[] {
  const imgs = WORLD_CUP_IMAGES;
  return [
    // 8강 (QF)
    { round: 'QF', matchIndex: 0, globalIndex: 0, imageA: imgs[0], imageB: imgs[1] },
    { round: 'QF', matchIndex: 1, globalIndex: 1, imageA: imgs[2], imageB: imgs[3] },
    { round: 'QF', matchIndex: 2, globalIndex: 2, imageA: imgs[4], imageB: imgs[5] },
    { round: 'QF', matchIndex: 3, globalIndex: 3, imageA: imgs[6], imageB: imgs[7] },
    // 4강 (SF) — placeholder, 동적으로 채워짐
    { round: 'SF', matchIndex: 0, globalIndex: 4, imageA: imgs[0], imageB: imgs[2] },
    { round: 'SF', matchIndex: 1, globalIndex: 5, imageA: imgs[4], imageB: imgs[6] },
    // 결승 (FINAL) — placeholder
    { round: 'FINAL', matchIndex: 0, globalIndex: 6, imageA: imgs[0], imageB: imgs[4] },
  ];
}

/**
 * 승자 선택 후 bracket 업데이트
 * QF0/QF1 승자 → SF0, QF2/QF3 승자 → SF1, SF0/SF1 승자 → FINAL
 */
export function advanceBracket(
  bracket: WorldCupMatch[],
  globalIndex: number,
  winnerId: string,
): WorldCupMatch[] {
  const updated = bracket.map(m => ({ ...m }));
  const winnerImg = WORLD_CUP_IMAGES.find(img => img.id === winnerId);
  if (!winnerImg) return updated;

  if (globalIndex === 0 || globalIndex === 1) {
    // QF0/QF1 → SF0
    if (globalIndex === 0) updated[4].imageA = winnerImg;
    else updated[4].imageB = winnerImg;
  } else if (globalIndex === 2 || globalIndex === 3) {
    // QF2/QF3 → SF1
    if (globalIndex === 2) updated[5].imageA = winnerImg;
    else updated[5].imageB = winnerImg;
  } else if (globalIndex === 4 || globalIndex === 5) {
    // SF0/SF1 → FINAL
    if (globalIndex === 4) updated[6].imageA = winnerImg;
    else updated[6].imageB = winnerImg;
  }

  return updated;
}
