// [CL-BRAND-V5-20260711-191500] WeddingMark v5 — 브랜드 마크(brand/mark-small.svg)와 동일 지오메트리 패밀리.
// 컨셉 '하트 위 플래티넘 인터로킹 웨딩링': 핑크 하트 바디 위에 두꺼운 도넛 밴드(진짜 반지 두께) 2개가
// 부분 겹침 + 상단 weave(왼쪽 밴드가 위). 얇은 스트로크 링(v3)은 마스터 대비 가늘어 폐기.
// 색상 규칙: CSS 토큰/currentColor 만(하드코딩 hex 금지) —
//   하트 바디 = hsl(var(--brand-pink)) · 밴드 = hsl(var(--brand-ring))(펄 화이트=플래티넘) · 스파클 = currentColor.
// 기하는 100 좌표계(mark-small 과 동일 수치: 도넛 외경 r13/내경 r7, center (42.5,41)/(57.5,41))를
// scale(0.44)로 48 뷰박스 배치. 장식용 아이콘이므로 aria-hidden 고정 — 의미 전달은 부모 텍스트 책임.

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
        {/* 하트 바디 */}
        <path
          fill="hsl(var(--brand-pink))"
          d="M 50 94 Q 35.5 73 12.6 49.4 A 24 24 0 1 1 50 19.34 A 24 24 0 1 1 87.4 49.4 Q 64.5 73 50 94 Z"
        />
        {/* 인터로킹 플래티넘 도넛 밴드 2개 (하트 중심, 부분 겹침) — mark-small 과 동일 수치 */}
        <g fill="hsl(var(--brand-ring))" fillRule="evenodd">
          <path d="M 29.5 41 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0 Z M 35.5 41 a 7 7 0 1 1 14 0 a 7 7 0 1 1 -14 0 Z" />
          <path d="M 44.5 41 a 13 13 0 1 0 26 0 a 13 13 0 1 0 -26 0 Z M 50.5 41 a 7 7 0 1 1 14 0 a 7 7 0 1 1 -14 0 Z" />
        </g>
        {/* weave — 상단 교차에서 왼쪽 밴드가 위 */}
        <path
          d="M 44.0 30.2 A 10 10 0 0 1 52.6 39.9"
          fill="none"
          stroke="hsl(var(--brand-ring))"
          strokeWidth="6"
        />
      </g>
      {/* 스파클 1개 — 우상단 반짝임(4-point star) */}
      <path
        d="M40.5 3 C41 5.1 41.9 6 44 6.5 C41.9 7 41 7.9 40.5 10 C40 7.9 39.1 7 37 6.5 C39.1 6 40 5.1 40.5 3 Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}
