// [CL-ADMIN-VISITOR-20260709-231827] 일별 접속자(익명 vs 로그인 + 비율) 카드 — Admin 페이지뷰 추이 바로 위.
//   ComposedChart 필수: Recharts AreaChart 는 Line 자식을 무음 미렌더(GraphicalChild=Area 만) → 혼합 시리즈는
//   반드시 ComposedChart. 스택 Area 2개(익명/로그인) + 우축 로그인 비율 dashed Line + 좌축 total 7일 MA.
import { Card } from '@/components/ui/card';
import {
  ComposedChart, Area, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { VisitorTrendPoint } from '@/lib/admin/trend-compute';

/** VisitorTrendPoint + total 7일 이동평균(앞 6개는 null — 가짜 0 금지) */
export type VisitorTrendCardPoint = VisitorTrendPoint & { totalMA7: number | null };

interface VisitorTrendCardProps {
  points: VisitorTrendCardPoint[];
  /** 익명 방문 데이터 존재 여부(RPC 미배포/무데이터 시 false → 익명 Area·비율선 숨김 + 안내) */
  anonAvailable: boolean;
}

// Admin.tsx chartTooltipStyle 과 동일 값(페이지 모듈 역참조=순환 위험 → 상수 복제, 값 계약은 스모크 테스트가 아님)
const chartTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '13px',
};

const round1 = (v: number) => Math.round(v * 10) / 10;

export function VisitorTrendCard({ points, anonAvailable }: VisitorTrendCardProps) {
  const totalSum = points.reduce((s, p) => s + p.total, 0);
  const loginSum = points.reduce((s, p) => s + p.loginUsers, 0);
  const loginPct = totalSum > 0 ? round1((loginSum / totalSum) * 100) : null;

  return (
    <Card className="p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm sm:text-base font-semibold leading-relaxed">일별 접속자 (추정)</h3>
        <span className="text-xs sm:text-sm text-muted-foreground">
          접속 {totalSum.toLocaleString()}
          {loginPct !== null && ` · 로그인 비율 ${loginPct}%`}
        </span>
      </div>
      {!anonAvailable && points.length > 0 && (
        <p className="text-[11px] text-muted-foreground/70 mb-1">
          익명 방문 데이터 없음 — 로그인 사용자 기준만 표시 중이에요. (track-visit Edge 함수 · anon_page_views 마이그 배포 후 수집)
        </p>
      )}
      {points.length > 0 ? (
        <div className="h-56 sm:h-64 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points}>
              <defs>
                <linearGradient id="gradVisitorAnon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradVisitorLogin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
              <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              {anonAvailable && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v: number) => `${v}%`}
                />
              )}
              <RechartsTooltip
                contentStyle={chartTooltipStyle}
                formatter={(value: number | null, name: string) => {
                  if (value === null || value === undefined) return ['—', name];
                  if (name === '로그인 비율') return [`${round1(value)}%`, name];
                  if (name === '접속자 7일 평균') return [`${round1(value)}명`, name];
                  return [`${value}명`, name];
                }}
                labelFormatter={(label) => `날짜: ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: '13px' }} />
              {anonAvailable && (
                <Area
                  yAxisId="left"
                  stackId="visitors"
                  type="monotone"
                  dataKey="anonSessions"
                  name="익명 방문자"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#gradVisitorAnon)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              )}
              <Area
                yAxisId="left"
                stackId="visitors"
                type="monotone"
                dataKey="loginUsers"
                name="로그인 사용자"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradVisitorLogin)"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalMA7"
                name="접속자 7일 평균"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                legendType="plainline"
              />
              {anonAvailable && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="loginRatio"
                  name="로그인 비율"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  dot={false}
                  legendType="plainline"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">아직 접속자 데이터가 없어요.</p>
      )}
      <p className="text-[11px] text-muted-foreground/70 mt-2">
        익명=세션 수·로그인=사용자 수 기준 합산 추정 · 같은 날 로그인 전 방문은 익명에 1회 포함될 수 있어요.
      </p>
    </Card>
  );
}
