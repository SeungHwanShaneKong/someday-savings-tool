/**
 * [CL-ADSENSE-20260619-234411] 정책/정보 페이지 데이터 (개인정보처리방침·이용약관·소개·문의)
 *
 * AdSense 승인 필수 페이지. src/pages/StaticPage.tsx 가 이 데이터를 렌더하며,
 * 프리렌더(scripts/prerender.mjs) 대상이라 크롤러가 본문을 그대로 본다.
 * ArticleBlock 모델(문단/리스트/표/콜아웃)을 재사용한다.
 * ※ 순수 추가 — 기존 라우트/인증/로직 무변경.
 */
import type { ArticleBlock } from './articles';

/** 운영자 연락 이메일 — 도메인 기반(포워딩 설정 권장). 필요 시 사용자가 교체. */
export const CONTACT_EMAIL = 'support@moderninsightspot.com';
/** 운영 주체 표기 */
export const OPERATOR_NAME = '웨딩셈 (WeddingSem)';
/** 정책 최종 개정일 */
export const POLICY_LAST_UPDATED = '2026-06-19';

export interface LegalPageSection {
  heading: string;
  blocks: ArticleBlock[];
}

export interface LegalPage {
  // [CL-ADSENSE-CONTENT-20260630] 'editorial'(편집·제작 원칙) 추가 — E-E-A-T 신뢰 신호
  key: 'privacy' | 'terms' | 'about' | 'contact' | 'editorial';
  /** trailing-slash 라우트(프리렌더/canonical) */
  path: string;
  /** 검색 <title> */
  seoTitle: string;
  /** 페이지 H1 (= 프리렌더 본문 마커) */
  title: string;
  /** meta description */
  description: string;
  /** H1 하단 리드 */
  intro: string;
  /** 최종 개정일 표기 여부 */
  showUpdated: boolean;
  sections: LegalPageSection[];
}

/* ════════════════ 개인정보처리방침 ════════════════ */
const privacy: LegalPage = {
  key: 'privacy',
  path: '/privacy/',
  seoTitle: '개인정보처리방침 | 웨딩셈',
  title: '개인정보처리방침',
  description:
    '웨딩셈이 수집하는 개인정보 항목, 이용 목적, 보유 기간, 제3자(Google AdSense·Analytics, Supabase) 처리, 쿠키 및 이용자 권리를 안내합니다.',
  intro:
    `${OPERATOR_NAME}(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수합니다. 본 방침은 서비스가 어떤 정보를 어떻게 수집·이용·보호하는지 설명합니다.`,
  showUpdated: true,
  sections: [
    {
      heading: '1. 수집하는 개인정보 항목',
      blocks: [
        {
          type: 'table',
          headers: ['구분', '항목', '수집 시점'],
          rows: [
            ['계정(선택)', '이메일 주소, 프로필 이름(구글 로그인 시 제공)', '구글 계정으로 로그인할 때'],
            ['서비스 이용', '예산 항목·금액, 체크리스트 진행, 예식 예정일 등 직접 입력 데이터', '서비스 이용 중'],
            ['자동 수집', '쿠키, 접속 기기·브라우저 정보, 방문 기록(Google Analytics)', '사이트 방문 시'],
            ['광고', '광고 식별·맞춤 광고용 쿠키(Google AdSense)', '광고가 게재될 때'],
          ],
        },
        {
          type: 'paragraph',
          text: '로그인 없이도 대부분의 기능을 이용할 수 있으며, 이 경우 계정 정보는 수집되지 않습니다. 입력한 예산·체크리스트 데이터는 로그인 시에만 계정과 연동되어 저장됩니다.',
        },
      ],
    },
    {
      heading: '2. 개인정보의 이용 목적',
      blocks: [
        {
          type: 'list',
          items: [
            '회원 식별 및 로그인, 입력 데이터의 안전한 저장·동기화',
            '예산 관리·체크리스트·AI 상담 등 서비스 기능 제공',
            '서비스 품질 개선 및 이용 통계 분석',
            '광고 게재 및 서비스 운영(무료 서비스 유지)',
          ],
        },
      ],
    },
    {
      heading: '3. 보유 및 파기',
      blocks: [
        {
          type: 'paragraph',
          text: '개인정보는 수집·이용 목적이 달성되거나 회원이 탈퇴(또는 데이터 삭제 요청)하면 지체 없이 파기합니다. 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안만 분리 보관합니다. 회원은 언제든지 서비스 내에서 본인 데이터를 삭제할 수 있습니다.',
        },
      ],
    },
    {
      heading: '4. 제3자 처리위탁 및 제공',
      blocks: [
        {
          type: 'paragraph',
          text: '서비스는 원활한 운영을 위해 아래 사업자에 일부 처리를 위탁합니다. 이용자 동의 없이 개인정보를 제3자에게 판매하지 않습니다.',
        },
        {
          type: 'table',
          headers: ['수탁자', '처리 목적'],
          rows: [
            ['Supabase, Inc.', '데이터베이스·인증(계정·예산 데이터의 안전한 저장)'],
            ['Google LLC (Analytics)', '방문 통계 분석'],
            ['Google LLC (AdSense)', '광고 게재 및 맞춤 광고'],
          ],
        },
      ],
    },
    {
      heading: '5. 쿠키 및 Google AdSense 광고',
      blocks: [
        {
          type: 'paragraph',
          text: '본 서비스는 Google AdSense를 통해 광고를 게재합니다. Google을 포함한 제3자 광고 사업자는 쿠키(DART 쿠키 등)를 사용하여 이용자의 본 사이트 및 다른 사이트 방문 기록에 기반한 광고를 게재할 수 있습니다.',
        },
        {
          type: 'list',
          items: [
            '이용자는 Google 광고 설정(google.com/settings/ads)에서 맞춤 광고를 비활성화할 수 있습니다.',
            'www.aboutads.info 에서 제3자 광고 사업자의 맞춤 광고 쿠키를 일괄 거부할 수 있습니다.',
            '브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 일부 기능 이용이 제한될 수 있습니다.',
          ],
        },
      ],
    },
    {
      heading: '6. 이용자의 권리',
      blocks: [
        {
          type: 'list',
          items: [
            '본인 개인정보의 열람·정정·삭제·처리정지를 요청할 수 있습니다.',
            '로그인 후 서비스 내에서 직접 데이터를 수정·삭제할 수 있습니다.',
            '동의를 철회하거나 회원 탈퇴를 요청할 수 있습니다.',
          ],
        },
      ],
    },
    {
      heading: '7. 만 14세 미만 아동',
      blocks: [
        {
          type: 'paragraph',
          text: '본 서비스는 결혼 준비를 위한 서비스로 만 14세 미만 아동을 대상으로 하지 않으며, 아동의 개인정보를 의도적으로 수집하지 않습니다.',
        },
      ],
    },
    {
      heading: '8. 문의 및 개정',
      blocks: [
        {
          type: 'paragraph',
          text: `개인정보 관련 문의는 ${CONTACT_EMAIL} 로 연락 주시기 바랍니다. 본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 중요한 변경은 서비스 내 공지를 통해 안내합니다.`,
        },
      ],
    },
  ],
};

/* ════════════════ 이용약관 ════════════════ */
const terms: LegalPage = {
  key: 'terms',
  path: '/terms/',
  seoTitle: '이용약관 | 웨딩셈',
  title: '이용약관',
  description:
    '웨딩셈 서비스 이용에 관한 약관입니다. 서비스 내용, 이용자의 권리·의무, 면책, 지식재산권, 준거법을 안내합니다.',
  intro:
    `본 약관은 ${OPERATOR_NAME}(이하 "서비스")의 이용 조건과 절차, 이용자와 서비스의 권리·의무를 규정합니다. 서비스를 이용함으로써 본 약관에 동의한 것으로 봅니다.`,
  showUpdated: true,
  sections: [
    {
      heading: '제1조 (목적)',
      blocks: [
        {
          type: 'paragraph',
          text: '본 약관은 서비스가 제공하는 결혼 예산 관리·체크리스트·AI 상담·정보 콘텐츠 등(이하 "서비스")의 이용과 관련하여 필요한 사항을 정함을 목적으로 합니다.',
        },
      ],
    },
    {
      heading: '제2조 (서비스의 내용)',
      blocks: [
        {
          type: 'list',
          items: [
            '결혼 예산 시뮬레이터 및 항목별 비용 관리',
            'D-day 기반 결혼 준비 체크리스트',
            'AI 기반 결혼 준비 상담(Q&A)',
            '결혼 비용·준비 관련 정보 콘텐츠(가이드·FAQ)',
          ],
        },
        {
          type: 'paragraph',
          text: '서비스가 제공하는 평균 비용·정보는 참고용이며, 실제 비용은 지역·시기·업체에 따라 달라질 수 있습니다.',
        },
      ],
    },
    {
      heading: '제3조 (이용자의 의무)',
      blocks: [
        {
          type: 'list',
          items: [
            '타인의 정보를 도용하거나 허위 정보를 등록하지 않습니다.',
            '서비스의 정상 운영을 방해하는 행위(무단 크롤링·해킹 등)를 하지 않습니다.',
            '관계 법령 및 본 약관, 공지된 이용 정책을 준수합니다.',
          ],
        },
      ],
    },
    {
      heading: '제4조 (서비스의 변경·중단)',
      blocks: [
        {
          type: 'paragraph',
          text: '서비스는 운영상·기술상 필요에 따라 제공 내용을 변경하거나 중단할 수 있으며, 중요한 변경은 사전에 공지하도록 노력합니다. 무료로 제공되는 서비스의 특성상 천재지변·시스템 장애 등 불가항력으로 인한 중단에 대해 책임이 제한될 수 있습니다.',
        },
      ],
    },
    {
      heading: '제5조 (면책)',
      blocks: [
        {
          type: 'list',
          items: [
            '서비스가 제공하는 비용 추정·정보는 참고 자료이며, 이를 근거로 한 의사결정의 최종 책임은 이용자에게 있습니다.',
            '이용자가 입력한 데이터의 정확성에 대한 책임은 이용자에게 있습니다.',
            '외부 링크·제3자 서비스 이용으로 발생한 손해에 대해 서비스는 책임지지 않습니다.',
          ],
        },
      ],
    },
    {
      heading: '제6조 (지식재산권)',
      blocks: [
        {
          type: 'paragraph',
          text: '서비스가 제작한 콘텐츠·디자인·소프트웨어에 대한 지식재산권은 서비스에 귀속됩니다. 이용자가 입력한 데이터의 권리는 이용자에게 있습니다.',
        },
      ],
    },
    {
      heading: '제7조 (준거법 및 분쟁 해결)',
      blocks: [
        {
          type: 'paragraph',
          text: '본 약관은 대한민국 법령에 따라 해석되며, 서비스와 이용자 간 분쟁은 관련 법령 및 상호 협의에 따라 해결합니다.',
        },
      ],
    },
  ],
};

/* ════════════════ 소개 ════════════════ */
const about: LegalPage = {
  key: 'about',
  path: '/about/',
  seoTitle: '웨딩셈 소개 - AI 결혼 준비 플랫폼 | 웨딩셈',
  title: '웨딩셈 소개',
  description:
    '웨딩셈은 복잡한 결혼 비용을 항목별로 정리하고, 체크리스트·AI 상담으로 결혼 준비를 돕는 무료 플랫폼입니다. 서비스 미션과 제공 기능을 소개합니다.',
  intro:
    '웨딩셈(WeddingSem)은 "결혼 준비의 시작, 결혼 예산 관리부터"라는 생각에서 출발한 AI 기반 결혼 준비 플랫폼입니다. 막막한 결혼 비용을 누구나 쉽게 계획하도록 돕습니다.',
  showUpdated: false,
  sections: [
    {
      heading: '우리의 미션',
      blocks: [
        {
          type: 'paragraph',
          text: '결혼 준비는 정보 비대칭이 큰 영역입니다. "결혼 비용이 얼마"라는 숫자는 무엇을 포함하느냐에 따라 천차만별이고, 무엇부터 해야 할지도 막막합니다. 웨딩셈은 실제 비용 데이터를 기반으로 예산을 투명하게 계획하고, 준비 과정을 차근차근 안내해 결혼을 준비하는 모든 커플의 부담을 덜어드리는 것을 목표로 합니다.',
        },
      ],
    },
    {
      heading: '제공 기능',
      blocks: [
        {
          type: 'list',
          items: [
            '예산 시뮬레이터: 항목별 비용을 입력하면 평균과 비교 분석',
            'D-day 체크리스트: 결혼일 기준 시기별 준비 항목 자동 생성',
            'AI 상담(Q&A): 결혼 준비 궁금증을 실데이터 기반으로 해결',
            '결혼 가이드·FAQ: 비용·순서·스드메 등 핵심 정보 콘텐츠',
          ],
        },
      ],
    },
    {
      heading: '데이터와 콘텐츠',
      blocks: [
        {
          type: 'paragraph',
          text: '웨딩셈의 비용 범위와 가이드는 공개된 결혼 비용 통계와 실제 견적 사례를 참고해 작성하며, 시장 변화에 맞춰 지속적으로 갱신합니다. 모든 정보는 참고용이며 실제 비용은 지역·시기·업체에 따라 달라질 수 있습니다.',
        },
      ],
    },
    {
      heading: '운영팀과 편집팀',
      blocks: [
        {
          type: 'paragraph',
          text: `본 서비스는 ${OPERATOR_NAME}가 운영합니다. 웨딩셈 편집팀은 결혼 준비 정보를 다루는 콘텐츠 제작·검수를 담당하며, 공개 통계와 실제 견적 사례를 교차 확인해 가이드를 작성합니다.`,
        },
        {
          type: 'list',
          items: [
            '운영 주체: ' + OPERATOR_NAME,
            '문의: ' + CONTACT_EMAIL + ' (서비스·제휴·개인정보)',
            '콘텐츠 제작·검수: 웨딩셈 편집팀',
            '콘텐츠 제작 기준과 데이터 출처 정책은 「편집·제작 원칙」 페이지에서 투명하게 공개합니다.',
          ],
        },
      ],
    },
    {
      heading: '콘텐츠 제작 방법론(요약)',
      blocks: [
        {
          type: 'paragraph',
          text: '웨딩셈의 모든 비용 가이드는 ① 공개된 결혼 비용 통계·조사(검증 가능한 경우 출처를 본문에 링크), ② 실제 견적·후기 사례, ③ 웨딩셈이 자체적으로 정리한 추정 범위(기준·면책 명시)를 결합해 작성합니다. 특정 업체를 홍보하거나 근거 없는 수치를 임의로 만들지 않으며, 가격은 항상 "범위"로 제시하고 지역·시기·업체에 따른 편차를 함께 안내합니다.',
        },
      ],
    },
  ],
};

/* ════════════════ [CL-ADSENSE-CONTENT-20260630] 편집·제작 원칙 ════════════════ */
const editorial: LegalPage = {
  key: 'editorial',
  path: '/editorial/',
  seoTitle: '편집·제작 원칙 - 데이터 출처와 검수 기준 | 웨딩셈',
  title: '편집·제작 원칙',
  description:
    '웨딩셈이 결혼 비용 가이드를 어떻게 제작·검수하는지, 데이터 출처와 갱신 주기, 정정 절차를 투명하게 공개합니다. 신뢰할 수 있는 정보를 위한 우리의 약속입니다.',
  intro:
    '웨딩셈은 결혼을 준비하는 분들이 믿고 참고할 수 있는 정보를 제공하기 위해 명확한 제작·검수 원칙을 따릅니다. 이 페이지는 우리가 콘텐츠를 어떻게 만들고, 어떤 데이터를 쓰며, 어떻게 갱신·정정하는지를 투명하게 설명합니다.',
  showUpdated: true,
  sections: [
    {
      heading: '콘텐츠 제작 원칙',
      blocks: [
        {
          type: 'list',
          items: [
            '정확성 우선: 모든 비용은 단정적 숫자가 아니라 "범위"로 제시하고, 지역·시기·업체별 편차를 함께 안내합니다.',
            '근거 기반: 가능한 경우 공개 통계·조사를 본문에 출처로 링크하고, 외부 근거가 없는 항목은 "웨딩셈 자체 추정"임을 명시합니다.',
            '날조 금지: 존재하지 않는 출처나 임의로 부풀린 수치를 만들지 않습니다.',
            '중립성: 특정 업체·브랜드를 광고하거나 대가를 받고 순위를 매기지 않습니다.',
            '실용성: 체크리스트·표·사례 중심으로, 실제 준비에 바로 쓸 수 있게 구성합니다.',
          ],
        },
      ],
    },
    {
      heading: '데이터 출처 정책',
      blocks: [
        {
          type: 'paragraph',
          text: '웨딩셈의 비용 범위는 세 가지 축으로 작성합니다.',
        },
        {
          type: 'list',
          items: [
            '① 공개 통계·조사: 통계청 등 공공기관 자료, 결혼정보회사·소비자기관의 공개 발표 등 검증 가능한 자료(해당 글 하단 "참고 자료"에 링크).',
            '② 실제 견적·후기 사례: 공개된 견적서·후기에서 반복적으로 확인되는 가격대.',
            '③ 웨딩셈 자체 추정: 위 자료로 직접 커버되지 않는 항목은 보수적 범위로 추정하고, 그 사실과 기준을 본문에 명시합니다.',
          ],
        },
        {
          type: 'callout',
          text: '모든 정보는 참고용입니다. 실제 계약 전에는 반드시 해당 업체·기관의 최신 공식 정보를 직접 확인하시기 바랍니다.',
        },
      ],
    },
    {
      heading: '검수 절차',
      blocks: [
        {
          type: 'list',
          items: [
            '작성: 웨딩셈 편집팀이 주제별로 자료를 모아 초안을 작성합니다.',
            '교차 확인: 본문의 수치·주장을 공개 자료·사례와 대조해 검수합니다.',
            '갱신: 시장 변화·통계 갱신에 맞춰 정기적으로 본문과 최종 수정일을 업데이트합니다.',
          ],
        },
      ],
    },
    {
      heading: '갱신과 정정',
      blocks: [
        {
          type: 'paragraph',
          text: `각 가이드 상단에는 최종 수정일이 표시됩니다. 내용에 오류가 있거나 더 정확한 자료를 알고 계시다면 ${CONTACT_EMAIL} 으로 알려주세요. 확인 후 신속히 정정하고 수정 이력을 반영합니다.`,
        },
      ],
    },
  ],
};

/* ════════════════ 문의 ════════════════ */
const contact: LegalPage = {
  key: 'contact',
  path: '/contact/',
  seoTitle: '문의하기 | 웨딩셈',
  title: '문의하기',
  description:
    '웨딩셈 서비스 이용 문의, 의견·제안, 개인정보 관련 요청을 보내실 수 있는 방법을 안내합니다.',
  intro:
    '서비스 이용 중 궁금한 점이나 개선 의견이 있으시면 언제든 연락 주세요. 보내주신 의견은 서비스 개선에 소중히 반영됩니다.',
  showUpdated: false,
  sections: [
    {
      heading: '이메일 문의',
      blocks: [
        {
          type: 'paragraph',
          text: `서비스·제휴·개인정보 관련 문의는 이메일 ${CONTACT_EMAIL} 으로 보내주시면 확인 후 답변드립니다.`,
        },
      ],
    },
    {
      heading: '서비스 내 의견 보내기',
      blocks: [
        {
          type: 'paragraph',
          text: '웨딩셈 화면 하단의 "의견 보내기" 버튼을 통해 기능 제안·버그 신고를 바로 전달하실 수 있습니다. 로그인 없이도 이용 가능합니다.',
        },
      ],
    },
    {
      heading: '문의 시 안내',
      blocks: [
        {
          type: 'list',
          items: [
            '개인정보 열람·삭제 요청 시 본인 확인이 필요할 수 있습니다.',
            '문의 내용에 따라 답변까지 영업일 기준 며칠이 소요될 수 있습니다.',
            '광고·제휴 제안도 위 이메일로 환영합니다.',
          ],
        },
      ],
    },
  ],
};

export const LEGAL_PAGES: Record<LegalPage['key'], LegalPage> = {
  privacy,
  terms,
  about,
  contact,
  editorial, // [CL-ADSENSE-CONTENT-20260630]
};

export function getLegalPage(key: string | undefined): LegalPage | undefined {
  if (!key) return undefined;
  return LEGAL_PAGES[key as LegalPage['key']];
}

export const LEGAL_PAGE_LIST: LegalPage[] = [privacy, terms, about, contact, editorial];
