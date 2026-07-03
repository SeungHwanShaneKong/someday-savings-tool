// [CL-TOP20-P1-MARK-20260703-010000] WeddingMark — 웨딩셈 브랜드 모티프 SVG.
// Top 20 로드맵 P1(#4 일부): 랜딩 히어로의 generic Sparkles 아이콘을 대체하는 커스텀 마크.
// 결혼 반지 2개의 교차(위빙: 상단 교차부는 왼쪽 링이 위, 하단 교차부는 오른쪽 링이 위) + 상단 스파클 1개.
// 색상 규칙: CSS 토큰/currentColor 만 사용(하드코딩 hex 금지) —
//   왼쪽 링 = hsl(var(--primary)) · 오른쪽 링 = hsl(var(--chart-2)) (rose 340 75% 55%)
//   스파클 = currentColor (부모에서 text-primary 등으로 문맥 제어 가능).
// 장식용 아이콘이므로 aria-hidden 고정 — 의미 전달이 필요하면 부모에서 텍스트로 제공할 것.

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
      {/* 왼쪽 링 — primary */}
      <circle cx="19" cy="29" r="10" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      {/* 오른쪽 링 — chart-2(rose). 나중에 그려져 두 교차부에서 왼쪽 링 위를 지난다 */}
      <circle cx="29" cy="29" r="10" stroke="hsl(var(--chart-2))" strokeWidth="2.5" />
      {/*
        위빙 아크 — 상단 교차점(24, 20.34) 주변에서만 왼쪽 링의 호(θ −85°→−35°)를 다시 위에 그려
        "상단은 왼쪽이 위, 하단은 오른쪽이 위"의 자연스러운 interlocking 을 만든다.
      */}
      <path
        d="M19.87 19.04 A10 10 0 0 1 27.19 23.26"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* 스파클 1개 — 오른쪽 링 상단의 반짝임 (4-point star) */}
      <path
        d="M30.5 5 C31 7.1 31.9 8 34 8.5 C31.9 9 31 9.9 30.5 12 C30 9.9 29.1 9 27 8.5 C29.1 8 30 7.1 30.5 5 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}
