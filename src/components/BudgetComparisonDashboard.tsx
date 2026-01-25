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

interface Budget {
  id: string;
  name: string;
  items: ExtendedBudgetItem[];
}

interface BudgetComparisonDashboardProps {
  budgets: Budget[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
  'hsl(221, 83%, 53%)',
  'hsl(280, 65%, 60%)',
];

const COST_SPLIT_COLORS: Record<CostSplitType, string> = {
  'groom': 'hsl(221, 83%, 53%)',
  'bride': 'hsl(340, 75%, 55%)',
  'together': 'hsl(145, 65%, 42%)',
  '-': 'hsl(var(--muted-foreground))',
};

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
    <div className="space-y-6">
      {/* Total Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {budgetTotals.map((budget, index) => (
          <Card key={budget.name} className={index === 0 ? 'ring-2 ring-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {budget.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                {formatKoreanWon(budget.total)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₩{budget.total.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Difference Summary */}
      {budgets.length > 1 && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">최저 vs 최고 차이</p>
                <p className="text-3xl font-bold text-primary">{formatKoreanWon(difference)}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">최저</p>
                  <p className="font-semibold text-success">{minBudget.name}</p>
                  <p className="text-xs">{formatKoreanWon(minBudget.total)}</p>
                </div>
                <div className="text-2xl text-muted-foreground">→</div>
                <div className="text-center">
                  <p className="text-muted-foreground">최고</p>
                  <p className="font-semibold text-destructive">{maxBudget.name}</p>
                  <p className="text-xs">{formatKoreanWon(maxBudget.total)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Total Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">옵션별 총 예산 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetTotals} layout="vertical">
                <XAxis 
                  type="number" 
                  tickFormatter={(value) => formatKoreanWon(value)}
                  fontSize={12}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {budgetTotals.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">카테고리별 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryComparison}>
                <XAxis 
                  dataKey="category" 
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tickFormatter={(value) => formatKoreanWon(value)}
                  fontSize={11}
                  width={70}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {budgets.map((budget, index) => (
                  <Bar 
                    key={budget.id}
                    dataKey={budget.name} 
                    fill={COLORS[index % COLORS.length]}
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
        <CardHeader>
          <CardTitle className="text-lg">카테고리별 상세 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">카테고리</th>
                  {budgets.map((budget, index) => (
                    <th 
                      key={budget.id} 
                      className="text-right py-2 px-3"
                      style={{ color: COLORS[index % COLORS.length] }}
                    >
                      {budget.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categoryComparison.map((row) => (
                  <tr key={row.category} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <span className="mr-2">{row.icon}</span>
                      {row.category}
                    </td>
                    {budgets.map((budget) => (
                      <td key={budget.id} className="text-right py-2 px-3 font-medium">
                        {row[budget.name] > 0 ? formatKoreanWon(row[budget.name]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-primary/10 font-bold">
                  <td className="py-2 px-3">총계</td>
                  {budgets.map((budget) => (
                    <td key={budget.id} className="text-right py-2 px-3 text-primary">
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
        <CardHeader>
          <CardTitle className="text-lg">분담별 비용 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">분담</th>
                  {budgets.map((budget, index) => (
                    <th 
                      key={budget.id} 
                      className="text-right py-2 px-3"
                      style={{ color: COLORS[index % COLORS.length] }}
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
                      <td className="py-2 px-3">
                        <span 
                          className="inline-block w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COST_SPLIT_COLORS[splitOpt.value] }}
                        />
                        {splitOpt.label}
                      </td>
                      {splitTotals.map((st, idx) => (
                        <td 
                          key={st.budgetId} 
                          className="text-right py-2 px-3 font-medium"
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