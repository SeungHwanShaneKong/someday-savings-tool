// [CL-SAMPLE-SHEET-20260718-100000] 비로그인 랜딩 "엑셀형 예산 예시표" — 정적·읽기전용·논인터랙티브.
//  목적: 새 방문자가 "전 항목이 이렇게 깔끔하게 정리된다"를 보고 로그인 욕구를 느끼게 한다.
//  데이터는 sample-budget.ts(순수 파생, 하드코딩 0). 편집 요소 0 — 계산기 '예시'일 뿐 실입력 아님.
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { formatKoreanWon } from '@/lib/budget-categories';
import { SOURCE_TEXT } from '@/lib/average-costs';
import { buildSampleBudget, sampleBudgetTotal } from '@/lib/sample-budget';
import { trackFunnel } from '@/lib/analytics/funnel-events';

const CATEGORIES = buildSampleBudget();
const TOTAL = sampleBudgetTotal(CATEGORIES);

export function SampleBudgetSheet() {
  const navigate = useNavigate();

  const handleCta = () => {
    trackFunnel('landing_hero_cta_click', { method: 'sample_sheet' });
    navigate('/auth');
  };

  return (
    <section
      aria-label="결혼 예산 예시표"
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">결혼 비용, 이렇게 한눈에 정리돼요</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">전국 평균 기준 예시 — 로그인하면 내 금액으로 바뀌어요</p>
        </div>
        <Badge variant="secondary" className="flex-shrink-0 border-0 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          예시
        </Badge>
      </div>

      {/* 엑셀 시트형 표 — 읽기전용(편집 요소 0). 가로 스크롤 컨테이너로 모바일 오버플로 방지. */}
      <div className="overflow-x-auto rounded-xl border border-border/60">
        <Table className="text-xs">
          <TableBody>
            {CATEGORIES.map((cat) => (
              <Fragment key={cat.id}>
                {/* 카테고리 헤더 행 — 아이콘+이름+소계 */}
                <TableRow className="border-b-0 bg-secondary/60 hover:bg-secondary/60">
                  <TableCell className="py-2 font-semibold text-foreground">
                    <span className="mr-1" aria-hidden="true">{cat.icon}</span>
                    {cat.name}
                  </TableCell>
                  <TableCell className="py-2 text-right font-semibold tabular-nums text-foreground">
                    {formatKoreanWon(cat.subtotal)}
                  </TableCell>
                  <TableCell className="hidden py-2 sm:table-cell" aria-hidden="true" />
                </TableRow>
                {/* 서브 항목 행 — 항목/평균가/근거 */}
                {cat.items.map((item) => (
                  <TableRow key={`${cat.id}-${item.id}`} className="odd:bg-background even:bg-secondary/20">
                    <TableCell className="py-1.5 pl-6 text-muted-foreground">{item.name}</TableCell>
                    <TableCell className="py-1.5 text-right tabular-nums text-foreground">
                      {formatKoreanWon(item.amount)}
                    </TableCell>
                    <TableCell className="hidden py-1.5 text-[10px] text-muted-foreground/70 sm:table-cell">
                      {item.note ?? ''}
                    </TableCell>
                  </TableRow>
                ))}
              </Fragment>
            ))}
            {/* 총액 행 */}
            <TableRow className="border-t-2 border-border bg-primary/5 hover:bg-primary/5">
              <TableCell className="py-2.5 text-sm font-bold text-primary">총 예상 비용</TableCell>
              <TableCell className="py-2.5 text-right text-sm font-bold tabular-nums text-primary">
                {formatKoreanWon(TOTAL)}
              </TableCell>
              <TableCell className="hidden py-2.5 sm:table-cell" aria-hidden="true" />
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground/70">{SOURCE_TEXT}</p>

      <Button onClick={handleCta} className="mt-4 h-11 w-full gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        로그인하고 내 예산 만들기
      </Button>
    </section>
  );
}
