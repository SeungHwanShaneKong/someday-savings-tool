// [CL-BRAND-V2-20260711-173300] WeddingMark v2 — 브랜드 마크(brand/mark.svg)와 동일 지오메트리 패밀리.
// 컨셉 '하트+반지 결합': 볼드 하트 바디의 두 로브에 링 홀이 뚫려 — 하트인 동시에 겹친 두 웨딩링.
// 구 버전(파랑+핑크 링 2개)은 러버블풍 오브로 읽혀 폐기하고 파비콘/OG 와 시각 정체성을 통일한다.
// 색상 규칙: CSS 토큰/currentColor 만(하드코딩 hex 금지) —
//   하트 바디 = hsl(var(--brand-pink)) (26~44px 렌더에서 그라데이션은 미식별 → 단색)
//   링 림 = hsl(var(--brand-pink-soft)) · 스파클 = currentColor(부모 문맥 제어, 기존 계약 유지).
// 기하는 100 좌표계(마스터와 동일 수치)를 scale(0.44)로 48 뷰박스에 배치 — 단일소스 일관성.
// 장식용 아이콘이므로 aria-hidden 고정 — 의미 전달은 부모 텍스트 책임.

export interface WeddingMarkProps {
  /** 렌더 크기(px). 기본 40 */
  size?: number;
  className?: string;
}

export function WeddingMark({ size = 40, className }: WeddingMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <g transform="translate(2.4 2.2) scale(0.44)">
        {/* 하트 바디 + 링 홀 2개(evenodd 펀치) — brand/mark.svg 와 동일 패스 */}
        <path
          fill="hsl(var(--brand-pink))"
          fillRule="evenodd"
          d="M 50 94
             Q 35.5 73 12.6 49.4
             A 24 24 0 1 1 50 19.34
             A 24 24 0 1 1 87.4 49.4
             Q 64.5 73 50 94
             Z
             M 43 34 A 12 12 0 1 0 19 34 A 12 12 0 1 0 43 34 Z
             M 81 34 A 12 12 0 1 0 57 34 A 12 12 0 1 0 81 34 Z"
        />
        {/* 링 홀 안쪽 림 — 반지의 폴리시드 인상 */}
        <circle cx="31" cy="34" r="12" stroke="hsl(var(--brand-pink-soft))" strokeWidth="4" opacity="0.9" />
        <circle cx="69" cy="34" r="12" stroke="hsl(var(--brand-pink-soft))" strokeWidth="4" opacity="0.9" />
      </g>
      {/* 스파클 1개 — 우상단 반짝임(4-point star, 기존 브랜드 요소 계승) */}
      <path
        d="M40.5 3 C41 5.1 41.9 6 44 6.5 C41.9 7 41 7.9 40.5 10 C40 7.9 39.1 7 37 6.5 C39.1 6 40 5.1 40.5 3 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}
