import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExtendedBudgetItem, COST_SPLIT_OPTIONS, CostSplitType } from './BudgetTable';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { CHART_COLORS, COST_SPLIT_COLORS } from '@/lib/chart-colors';

interface Budget {
  id: string;
  name: string;
  items: ExtendedBudgetItem[];
}

interface BudgetComparisonDashboardProps {
  budgets: Budget[];
}

export function BudgetComparisonDashboard({ budgets }: BudgetComparisonDashboardProps) {
  if (budgets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        비교할 예산 옵션이 없습니다.
      </div>
    );
  }

  // Calculate totals for each budget
  const budgetTotals = budgets.map(budget => ({
    name: budget.name,
    total: budget.items.reduce((sum, item) => sum + item.amount, 0),
  }));

  // Calculate category breakdown for each budget
  const categoryComparison = BUDGET_CATEGORIES.map(category => {
    const row: Record<string, any> = { category: category.name, icon: category.icon };
    budgets.forEach(budget => {
      const categoryTotal = budget.items
        .filter(item => item.category === category.id)
        .reduce((sum, item) => sum + item.amount, 0);
      row[budget.name] = categoryTotal;
    });
    return row;
  });

  // Find min and max budgets
  const sortedTotals = [...budgetTotals].sort((a, b) => a.total - b.total);
  const minBudget = sortedTotals[0];
  const maxBudget = sortedTotals[sortedTotals.length - 1];
  const difference = maxBudget.total - minBudget.total;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
              <span className="font-medium">{formatKoreanWon(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Total Comparison Cards - Mobile: 2 cols, Tablet+: 4 cols */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {budgetTotals.map((budget, index) => (
          <Card key={`total-${index}`} className={index === 0 ? 'ring-2 ring-primary' : ''}> {/* [CL-HOME-FIX-20260315-120000] */}
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                {budget.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div 
                className="text-lg sm:text-2xl font-bold truncate" 
                style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
              >
                {formatKoreanWon(budget.total)}
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
                ₩{budget.total.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Difference Summary */}
      {budgets.length > 1 && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">최저 vs 최고 차이</p>
                <p className="text-xl sm:text-3xl font-bold text-primary">{formatKoreanWon(difference)}</p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground text-[11px] sm:text-xs">최저</p>
                  <p className="font-semibold text-success text-xs sm:text-sm">{minBudget.name}</p>
                  <p className="text-[11px] sm:text-xs">{formatKoreanWon(minBudget.total)}</p>
                </div>
                <div className="text-lg sm:text-2xl text-muted-foreground">→</div>
                <div className="text-center">
                  <p className="text-muted-foreground text-[11px] sm:text-xs">최고</p>
                  <p className="font-semibold text-destructive text-xs sm:text-sm">{maxBudget.name}</p>
                  <p className="text-[11px] sm:text-xs">{formatKoreanWon(maxBudget.total)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Comparison Bar Chart */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">옵션별 총 예산 비교</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetTotals} layout="vertical">
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatKoreanWon(value)}
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={60}
                  fontSize={10}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {budgetTotals.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Comparison Chart */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">카테고리별 비교</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="h-64 sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryComparison}>
                <XAxis 
                  dataKey="category" 
                  fontSize={9}
                  tick={{ fontSize: 9 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  tickFormatter={(value) => formatKoreanWon(value)}
                  fontSize={9}
                  tick={{ fontSize: 9 }}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {budgets.map((budget, index) => (
                  <Bar 
                    key={budget.id}
                    dataKey={budget.name} 
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Category Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">카테고리별 상세 비교</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-xs sm:text-sm min-w-[300px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 sm:px-3">카테고리</th>
                  {budgets.map((budget, index) => (
                    <th 
                      key={budget.id} 
                      className="text-right py-2 px-2 sm:px-3 whitespace-nowrap"
                      style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                    >
                      {budget.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryComparison.map((row) => (
                  <tr key={row.category} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-2 sm:px-3 whitespace-nowrap">
                      <span className="mr-1 sm:mr-2">{row.icon}</span>
                      <span className="hidden sm:inline">{row.category}</span>
                      <span className="sm:hidden text-[11px]">{row.category}</span>
                    </td>
                    {budgets.map((budget) => (
                      <td key={budget.id} className="text-right py-2 px-2 sm:px-3 font-medium whitespace-nowrap text-[11px] sm:text-sm">
                        {row[budget.name] > 0 ? formatKoreanWon(row[budget.name]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-primary/10 font-bold">
                  <td className="py-2 px-2 sm:px-3">총계</td>
                  {budgets.map((budget) => (
                    <td key={budget.id} className="text-right py-2 px-2 sm:px-3 text-primary text-[11px] sm:text-sm whitespace-nowrap">
                      {formatKoreanWon(budgetTotals.find(b => b.name === budget.name)?.total || 0)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Split Summary */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">분담별 비용 비교</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full text-xs sm:text-sm min-w-[300px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 sm:px-3">분담</th>
                  {budgets.map((budget, index) => (
                    <th 
                      key={budget.id} 
                      className="text-right py-2 px-2 sm:px-3 whitespace-nowrap"
                      style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                    >
                      {budget.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COST_SPLIT_OPTIONS.map((splitOpt) => {
                  const splitTotals = budgets.map(budget => ({
                    budgetId: budget.id,
                    total: budget.items
                      .filter(item => (item.cost_split || '-') === splitOpt.value)
                      .reduce((sum, item) => sum + item.amount, 0)
                  }));
                  const hasAnyValue = splitTotals.some(t => t.total > 0);
                  if (!hasAnyValue && splitOpt.value === '-') return null;
                  
                  return (
                    <tr key={splitOpt.value} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-2 sm:px-3 whitespace-nowrap">
                        <span 
                          className="inline-block w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-1 sm:mr-2"
                          style={{ backgroundColor: COST_SPLIT_COLORS[splitOpt.value] }}
                        />
                        {splitOpt.label}
                      </td>
                      {splitTotals.map((st, idx) => (
                        <td 
                          key={st.budgetId} 
                          className="text-right py-2 px-2 sm:px-3 font-medium whitespace-nowrap text-[11px] sm:text-sm"
                        >
                          {st.total > 0 ? formatKoreanWon(st.total) : '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}