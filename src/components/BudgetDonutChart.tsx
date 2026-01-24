import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { BUDGET_CATEGORIES, formatKoreanWon } from '@/lib/budget-categories';
import { BudgetItem } from '@/hooks/useBudget';

interface BudgetDonutChartProps {
  items: BudgetItem[];
}

const COLORS = [
  'hsl(213, 100%, 50%)',  // Primary blue
  'hsl(340, 75%, 55%)',   // Pink
  'hsl(145, 65%, 42%)',   // Green
  'hsl(38, 92%, 50%)',    // Orange
  'hsl(262, 83%, 58%)',   // Purple
];

export function BudgetDonutChart({ items }: BudgetDonutChartProps) {
  const data = BUDGET_CATEGORIES.map((category, index) => {
    const categoryItems = items.filter(item => item.category === category.id);
    const total = categoryItems.reduce((sum, item) => sum + item.amount, 0);
    return {
      name: category.name,
      value: total,
      icon: category.icon,
      color: COLORS[index % COLORS.length],
    };
  }).filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        아직 입력된 예산이 없어요
      </div>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => formatKoreanWon(value)}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-small text-muted-foreground">총 예산</p>
          <p className="text-subheading font-bold text-foreground">{formatKoreanWon(total)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {data.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-caption text-muted-foreground truncate">
              {entry.icon} {entry.name}
            </span>
            <span className="text-caption font-medium text-foreground ml-auto">
              {Math.round((entry.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
