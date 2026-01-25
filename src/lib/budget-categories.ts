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
    id: 'wedding-hall',
    name: '예식장',
    icon: '💒',
    description: '예식장과 관련된 비용을 입력해주세요',
    hint: '서울 평균: 800만원~1,500만원',
    subCategories: [
      { id: 'venue-fee', name: '대관료', placeholder: '예식장 대관 비용' },
      { id: 'meal-cost', name: '식대', placeholder: '하객 식사 비용 (1인당 × 예상 인원)' },
      { id: 'pyebaek', name: '폐백실', placeholder: '폐백실 이용료' },
      { id: 'venue-decoration', name: '홀 장식', placeholder: '꽃 장식, 포토존 등' },
    ],
  },
  {
    id: 'sudeme',
    name: '스드메',
    icon: '📸',
    description: '스튜디오, 드레스, 메이크업 비용을 입력해주세요',
    hint: '평균 패키지: 400만원~800만원',
    subCategories: [
      { id: 'studio', name: '스튜디오', placeholder: '웨딩 촬영 스튜디오' },
      { id: 'dress', name: '드레스', placeholder: '웨딩드레스 대여/구매' },
      { id: 'makeup', name: '메이크업', placeholder: '본식 메이크업' },
      { id: 'tuxedo', name: '턱시도', placeholder: '신랑 턱시도 대여' },
    ],
  },
  {
    id: 'honeymoon',
    name: '신혼여행',
    icon: '✈️',
    description: '신혼여행 관련 비용을 입력해주세요',
    hint: '평균: 300만원~600만원',
    subCategories: [
      { id: 'flight', name: '항공권', placeholder: '왕복 항공권' },
      { id: 'accommodation', name: '숙박', placeholder: '호텔/리조트 비용' },
      { id: 'local-expenses', name: '현지 비용', placeholder: '식비, 관광, 쇼핑 등' },
      { id: 'travel-insurance', name: '여행자 보험', placeholder: '여행자 보험료' },
    ],
  },
  {
    id: 'appliances',
    name: '가전/가구',
    icon: '🛋️',
    description: '신혼집 가전과 가구 비용을 입력해주세요',
    hint: '평균: 1,000만원~2,000만원',
    subCategories: [
      { id: 'electronics', name: '가전제품', placeholder: 'TV, 냉장고, 세탁기 등' },
      { id: 'furniture', name: '가구', placeholder: '침대, 소파, 식탁 등' },
      { id: 'bedding', name: '침구류', placeholder: '이불, 베개, 매트리스 등' },
      { id: 'kitchenware', name: '주방용품', placeholder: '그릇, 조리도구 등' },
    ],
  },
  {
    id: 'gifts',
    name: '예물/예단/기타',
    icon: '💍',
    description: '예물, 예단 및 기타 비용을 입력해주세요',
    hint: '예물 평균: 300만원~700만원',
    subCategories: [
      { id: 'rings', name: '예물 (반지)', placeholder: '결혼반지' },
      { id: 'gifts-bride', name: '예물 (신부)', placeholder: '시계, 목걸이 등' },
      { id: 'gifts-groom', name: '예물 (신랑)', placeholder: '시계 등' },
      { id: 'yedan', name: '예단', placeholder: '양가 예단 비용' },
      { id: 'invitation', name: '청첩장', placeholder: '청첩장 제작' },
      { id: 'other', name: '기타', placeholder: '기타 결혼 준비 비용' },
    ],
  },
  {
    id: 'clothing',
    name: '의복',
    icon: '👗',
    description: '결혼식 의복 관련 비용을 입력해주세요',
    hint: '드레스, 예복, 한복 등',
    subCategories: [
      { id: 'dress-main', name: '드레스 (본식 + 촬영)', placeholder: '본식 및 촬영용 드레스' },
      { id: 'dress-tour', name: '드레스 투어', placeholder: '드레스 투어 비용' },
      { id: 'groom-suit', name: '신랑 예복', placeholder: '신랑 예복 대여/구매' },
      { id: 'groom-shoes', name: '신랑 구두', placeholder: '신랑 구두' },
      { id: 'groom-father-suit', name: '신랑 아버지 예복', placeholder: '신랑 아버지 예복' },
      { id: 'bride-father-suit', name: '신부 아버지 예복', placeholder: '신부 아버지 예복' },
      { id: 'groom-mother-hanbok', name: '신랑 어머니 한복', placeholder: '신랑 어머니 한복' },
      { id: 'bride-mother-hanbok', name: '신부 어머니 한복', placeholder: '신부 어머니 한복' },
      { id: 'groom-hanbok', name: '신랑 한복', placeholder: '신랑 한복' },
      { id: 'bride-hanbok', name: '신부 한복', placeholder: '신부 한복' },
    ],
  },
  {
    id: 'miscellaneous',
    name: '기타 사항',
    icon: '📋',
    description: '기타 결혼 관련 비용을 입력해주세요',
    hint: '분류되지 않은 기타 비용',
    subCategories: [
      { id: 'bouquet', name: '부케', placeholder: '신부 부케' },
      { id: 'video', name: '영상 촬영', placeholder: '본식 영상 촬영' },
      { id: 'snap', name: '스냅 촬영', placeholder: '본식 스냅 촬영' },
      { id: 'officiant', name: '주례/사회', placeholder: '주례비, 사회비' },
      { id: 'transportation', name: '교통/차량', placeholder: '웨딩카, 교통비' },
      { id: 'thank-you-gifts', name: '답례품', placeholder: '하객 답례품' },
      { id: 'misc-other', name: '기타', placeholder: '기타 비용' },
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
