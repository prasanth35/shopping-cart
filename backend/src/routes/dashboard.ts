import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
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

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;

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

    let investmentValue = 0;
    for (const inv of investments) {
      const txns = await prisma.investmentTransaction.findMany({ where: { investmentId: inv.id } });
      let units = 0;
      for (const t of txns) units += t.type === "SELL" ? -Number(t.units) : Number(t.units);
      investmentValue += units * Number(inv.currentNav);
    }

    const totalAccountBalance = accountBalances.reduce((s, a) => s + a.balance, 0);
    const totalCardOutstanding = cardOutstanding.reduce((s, c) => s + c.outstanding, 0);
    const netWorth = totalAccountBalance + investmentValue - totalCardOutstanding;

    const { start: monthStart, end: monthEnd } = monthRange(0);
    const [monthIncome, monthExpense] = await Promise.all([
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: "INCOME", date: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
      }),
    ]);

    const trend: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
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
      where: { userId, type: "EXPENSE", date: { gte: monthStart, lt: monthEnd } },
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
        const sum = await prisma.goalContribution.aggregate({
          _sum: { amount: true },
          where: { goalId: g.id },
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

    res.json({
      netWorth,
      totalAccountBalance,
      totalCardOutstanding,
      investmentValue,
      accountBalances,
      cardOutstanding,
      monthIncome: Number(monthIncome._sum.amount ?? 0),
      monthExpense: Number(monthExpense._sum.amount ?? 0),
      trend,
      expenseByCategory,
      goals: goalsSummary,
    });
  })
);
