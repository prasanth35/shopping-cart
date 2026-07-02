import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";
import { computeAccountBalance } from "./accounts";
import { computeCreditCardOutstanding } from "./creditCards";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function monthRange(offset: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset + 1, 1));
  return { start, end };
}

const RANGE_MONTHS: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };

const summaryQuerySchema = z.object({
  range: z.enum(["1m", "3m", "6m", "12m"]).default("6m"),
});

dashboardRouter.get(
  "/summary",
  validateQuery(summaryQuerySchema),
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const { range } = req.query as unknown as z.infer<typeof summaryQuerySchema>;
    const monthsBack = RANGE_MONTHS[range];

    const [accounts, creditCards, investments, goals] = await Promise.all([
      prisma.account.findMany({ where: { userId, isActive: true } }),
      prisma.creditCard.findMany({ where: { userId, isActive: true } }),
      prisma.investment.findMany({ where: { userId, isArchived: false } }),
      prisma.goal.findMany({ where: { userId, isArchived: false } }),
    ]);

    const accountBalances = await Promise.all(
      accounts.map(async (a) => ({ id: a.id, name: a.name, balance: await computeAccountBalance(a.id) }))
    );
    const cardOutstanding = await Promise.all(
      creditCards.map(async (c) => ({ id: c.id, name: c.name, outstanding: await computeCreditCardOutstanding(c.id) }))
    );

    // Investment contributions already reduce the source account's balance
    // (see computeAccountBalance), so net worth adds the manually-tracked
    // current value back in — same pattern as goal savings below.
    const investmentValue = investments.reduce((s, inv) => s + Number(inv.currentValue), 0);

    const totalAccountBalance = accountBalances.reduce((s, a) => s + a.balance, 0);
    const totalCardOutstanding = cardOutstanding.reduce((s, c) => s + c.outstanding, 0);
    const netWorth = totalAccountBalance + investmentValue - totalCardOutstanding;

    const { start: periodStart } = monthRange(monthsBack - 1);
    const { end: periodEnd } = monthRange(0);
    const [periodIncome, periodExpense] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: "INCOME", date: { gte: periodStart, lt: periodEnd } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: "EXPENSE", date: { gte: periodStart, lt: periodEnd } },
      }),
    ]);

    const trend: { month: string; income: number; expense: number }[] = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const { start, end } = monthRange(i);
      const [inc, exp] = await Promise.all([
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, type: "INCOME", date: { gte: start, lt: end } },
        }),
        prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { userId, type: "EXPENSE", date: { gte: start, lt: end } },
        }),
      ]);
      trend.push({
        month: start.toISOString().slice(0, 7),
        income: Number(inc._sum.amount ?? 0),
        expense: Number(exp._sum.amount ?? 0),
      });
    }

    const categoryBreakdown = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "EXPENSE", date: { gte: periodStart, lt: periodEnd } },
      _sum: { amount: true },
    });
    const categories = await prisma.category.findMany({
      where: { id: { in: categoryBreakdown.map((c) => c.categoryId).filter((id): id is string => !!id) } },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
    const expenseByCategory = categoryBreakdown
      .map((c) => ({
        categoryId: c.categoryId,
        name: c.categoryId ? categoryMap.get(c.categoryId)?.name ?? "Uncategorized" : "Uncategorized",
        color: c.categoryId ? categoryMap.get(c.categoryId)?.color ?? "#94a3b8" : "#94a3b8",
        total: Number(c._sum.amount ?? 0),
      }))
      .sort((a, b) => b.total - a.total);

    const goalsSummary = await Promise.all(
      goals.map(async (g) => {
        const sum = await prisma.transaction.aggregate({
          _sum: { amount: true },
          where: { goalId: g.id, type: "GOAL_CONTRIBUTION" },
        });
        const current = Number(sum._sum.amount ?? 0);
        return {
          id: g.id,
          name: g.name,
          targetAmount: Number(g.targetAmount),
          currentAmount: current,
          progressPct: Math.min(100, (current / Number(g.targetAmount)) * 100),
        };
      })
    );
    // Goal contributions reduce the source account's spendable balance, but the
    // money is still yours (just earmarked) — add it back in for net worth.
    const goalSavings = goalsSummary.reduce((s, g) => s + g.currentAmount, 0);

    const owedToYou = await prisma.split.aggregate({
      _sum: { amount: true },
      where: { contact: { userId }, settledAt: null },
    });

    res.json({
      netWorth: netWorth + goalSavings,
      totalAccountBalance,
      totalCardOutstanding,
      investmentValue,
      goalSavings,
      owedToYou: Number(owedToYou._sum.amount ?? 0),
      accountBalances,
      cardOutstanding,
      range,
      periodIncome: Number(periodIncome._sum.amount ?? 0),
      periodExpense: Number(periodExpense._sum.amount ?? 0),
      trend,
      expenseByCategory,
      goals: goalsSummary,
    });
  })
);
