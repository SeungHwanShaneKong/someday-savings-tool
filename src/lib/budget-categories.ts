export interface SubCategory {
  id: string;
  name: string;
  placeholder?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  hint: string;
  subCategories: SubCategory[];
}

export const BUDGET_CATEGORIES: Category[] = [
  {
    id: 'main-ceremony',
    name: '본식 운영',
    icon: '💒',
    description: '본식 운영과 관련된 비용을 입력해주세요',
    hint: '예식장 대관, 식대, 촬영 등',
    subCategories: [
      { id: 'venue-fee', name: '대관료', placeholder: '예식장 대관 비용' },
      { id: 'meal-cost', name: '식대비', placeholder: '하객 식사 비용' },
      { id: 'expected-gift-money', name: '축의금 (예상)', placeholder: '예상 축의금 수입' },
      { id: 'thank-you-gifts', name: '답례품 준비비', placeholder: '하객 답례품' },
      { id: 'ceremony-staff', name: '축가, 축의대, 사회비', placeholder: '축가, 축의대, 사회자 비용' },
      { id: 'main-snap', name: '본식 스냅', placeholder: '본식 스냅 촬영' },
    ],
  },
  {
    id: 'sudeme-styling',
    name: '스드메, 스타일링, 예복',
    icon: '📸',
    description: '스드메, 스타일링, 예복 비용을 입력해주세요',
    hint: '드레스, 스튜디오, 메이크업, 예복 등',
    subCategories: [
      { id: 'dress-main', name: '드레스 (본식 + 촬영)', placeholder: '본식 및 촬영용 드레스' },
      { id: 'dress-tour', name: '드레스 투어 비용', placeholder: '드레스 투어 비용' },
      { id: 'groom-suit', name: '신랑 예복', placeholder: '신랑 예복 대여/구매' },
      { id: 'studio', name: '스튜디오', placeholder: '웨딩 촬영 스튜디오' },
      { id: 'studio-helper', name: '스튜디오 촬영 헬퍼비', placeholder: '촬영 도우미 비용' },
      { id: 'photo-bouquet', name: '촬영 부케 추가', placeholder: '촬영용 부케 추가' },
      { id: 'makeup', name: '메이크업 (스튜디오 + 본식)', placeholder: '스튜디오 및 본식 메이크업' },
      { id: 'parents-suit', name: '양가 아버지 예복', placeholder: '양가 아버지 예복' },
      { id: 'parents-hanbok', name: '양가 어머니 한복', placeholder: '양가 어머니 한복' },
    ],
  },
  {
    id: 'gifts-houseware',
    name: '혼수 및 예물',
    icon: '💍',
    description: '혼수 및 예물 비용을 입력해주세요',
    hint: '가전, 가구, 예물, 예단 등',
    subCategories: [
      { id: 'rings', name: '예물', placeholder: '결혼반지, 시계 등' },
      { id: 'yedan', name: '예단', placeholder: '양가 예단 비용' },
      { id: 'electronics', name: '가전', placeholder: 'TV, 냉장고, 세탁기 등' },
      { id: 'furniture', name: '가구', placeholder: '소파, 식탁 등' },
    ],
  },
  {
    id: 'preparation-promotion',
    name: '사전 준비 및 인사/홍보',
    icon: '📋',
    description: '사전 준비 및 인사/홍보 비용을 입력해주세요',
    hint: '상견례, 청첩장, 식전 영상 등',
    subCategories: [
      { id: 'meeting-meal', name: '상견례 식사', placeholder: '상견례 식사 비용' },
      { id: 'meeting-gift', name: '상견례 선물', placeholder: '상견례 선물' },
      { id: 'invitation', name: '청첩장', placeholder: '청첩장 제작' },
      { id: 'mobile-invitation', name: '모바일 청첩장', placeholder: '모바일 청첩장' },
      { id: 'pre-video', name: '식전 영상', placeholder: '식전 영상 제작' },
    ],
  },
  {
    id: 'honeymoon',
    name: '신혼여행',
    icon: '✈️',
    description: '신혼여행 관련 비용을 입력해주세요',
    hint: '항공, 기차, 숙소 등',
    subCategories: [
      { id: 'flight', name: '비행기', placeholder: '항공권 비용' },
      { id: 'train', name: '기차', placeholder: '기차 비용' },
      { id: 'accommodation-1', name: '숙소 (#1, 피렌체)', placeholder: '첫 번째 숙소' },
      { id: 'accommodation-2', name: '숙소 (#2, 파리)', placeholder: '두 번째 숙소' },
    ],
  },
  {
    id: 'miscellaneous',
    name: '기타 사항',
    icon: '🎵',
    description: '기타 결혼 관련 비용을 입력해주세요',
    hint: '웨딩 플래너, 기타 비용',
    subCategories: [
      { id: 'wedding-planner', name: '웨딩 플래너', placeholder: '웨딩 플래너 비용' },
      { id: 'invitation-gathering', name: '청첩장 모임', placeholder: '청첩장 전달 모임' },
      { id: 'bag-helper', name: '가방순이', placeholder: '가방순이 비용' },
    ],
  },
];

export const getCategoryById = (id: string) => 
  BUDGET_CATEGORIES.find(cat => cat.id === id);

export const getSubCategoryById = (categoryId: string, subCategoryId: string) => {
  const category = getCategoryById(categoryId);
  return category?.subCategories.find(sub => sub.id === subCategoryId);
};

export const formatKoreanWon = (amount: number): string => {
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const man = Math.floor((amount % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
};

export const parseKoreanWon = (input: string): number => {
  // Remove all non-numeric characters except for Korean units
  const cleaned = input.replace(/[,\s원]/g, '');
  
  // Check for 억 and 만
  let total = 0;
  
  if (cleaned.includes('억')) {
    const [eok, rest] = cleaned.split('억');
    total += parseInt(eok || '0') * 100000000;
    if (rest && rest.includes('만')) {
      total += parseInt(rest.replace('만', '') || '0') * 10000;
    } else if (rest) {
      total += parseInt(rest || '0');
    }
  } else if (cleaned.includes('만')) {
    total = parseInt(cleaned.replace('만', '') || '0') * 10000;
  } else {
    total = parseInt(cleaned || '0');
  }
  
  return isNaN(total) ? 0 : total;
};
