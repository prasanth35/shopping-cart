import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Wallet, CreditCard, TrendingUp, PiggyBank } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

// Validated categorical palette (see dataviz skill) — fixed slot order, never cycled per-render.
const INCOME_COLOR = "#2a78d6";
const EXPENSE_COLOR = "#e34948";
const MUTED_INK = "#898781";
const GRID_COLOR = "#e1e0d9";

function StatTile({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone?: "good" | "critical";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-full bg-primary/10 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className="text-2xl font-semibold"
            style={tone === "good" ? { color: "#006300" } : tone === "critical" ? { color: "#d03b3b" } : undefined}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short" });
}

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  if (isLoading || !data) {
    return <p className="text-muted-foreground">Loading dashboard…</p>;
  }

  const trendData = data.trend.map((t) => ({ ...t, label: monthLabel(t.month) }));
  const maxCategory = Math.max(1, ...data.expenseByCategory.map((c) => c.total));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Net worth</p>
        <p className="text-5xl font-semibold tracking-tight">{formatMoney(data.netWorth)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Bank balance" value={formatMoney(data.totalAccountBalance)} icon={Wallet} />
        <StatTile label="Credit card outstanding" value={formatMoney(data.totalCardOutstanding)} icon={CreditCard} tone="critical" />
        <StatTile label="Investments" value={formatMoney(data.investmentValue)} icon={TrendingUp} tone="good" />
        <StatTile label="This month net" value={formatMoney(data.monthIncome - data.monthExpense)} icon={PiggyBank} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Income vs expense — last 6 months</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ left: -12, right: 12 }}>
                <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="0" />
                <XAxis dataKey="label" tick={{ fill: MUTED_INK, fontSize: 12 }} axisLine={{ stroke: GRID_COLOR }} tickLine={false} />
                <YAxis
                  tick={{ fill: MUTED_INK, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
                />
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{ borderRadius: 8, borderColor: GRID_COLOR, fontSize: 13 }}
                />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={INCOME_COLOR}
                  strokeWidth={2}
                  fill={INCOME_COLOR}
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke={EXPENSE_COLOR}
                  strokeWidth={2}
                  fill={EXPENSE_COLOR}
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by category — this month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expenseByCategory.length === 0 && (
              <p className="text-sm text-muted-foreground">No expenses recorded this month yet.</p>
            )}
            {data.expenseByCategory.map((cat) => (
              <div key={cat.categoryId ?? "uncategorized"} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                  <span className="font-medium">{formatMoney(cat.total)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(cat.total / maxCategory) * 100}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.accountBalances.map((a) => (
              <div key={a.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{a.name}</span>
                <span className="font-medium">{formatMoney(a.balance)}</span>
              </div>
            ))}
            {data.accountBalances.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.goals.map((g) => (
              <div key={g.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{g.name}</span>
                  <span className="font-medium">
                    {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.progressPct}%` }} />
                </div>
              </div>
            ))}
            {data.goals.length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
