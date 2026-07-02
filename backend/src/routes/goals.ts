import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isoDate, positiveMoney } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const goalsRouter = Router();
goalsRouter.use(requireAuth);

const goalSchema = z.object({
  name: z.string().min(1).max(120),
  targetAmount: positiveMoney,
  targetDate: isoDate.optional().nullable(),
  linkedAccountId: z.string().uuid().optional().nullable(),
  isArchived: z.boolean().default(false),
});

async function withProgress<T extends { id: string; targetAmount: unknown }>(goal: T) {
  const sum = await prisma.goalContribution.aggregate({
    _sum: { amount: true },
    where: { goalId: goal.id },
  });
  const currentAmount = Number(sum._sum.amount ?? 0);
  return { ...goal, currentAmount, progressPct: Math.min(100, (currentAmount / Number(goal.targetAmount)) * 100) };
}

goalsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const goals = await prisma.goal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json(await Promise.all(goals.map(withProgress)));
  })
);

goalsRouter.post(
  "/",
  validateBody(goalSchema),
  asyncHandler(async (req, res) => {
    const goal = await prisma.goal.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(await withProgress(goal));
  })
);

goalsRouter.patch(
  "/:id",
  validateBody(goalSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) throw new HttpError(404, "Goal not found");
    const goal = await prisma.goal.update({ where: { id: existing.id }, data: req.body });
    res.json(await withProgress(goal));
  })
);

goalsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) throw new HttpError(404, "Goal not found");
    await prisma.goal.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const contributionSchema = z.object({
  amount: positiveMoney,
  date: isoDate.default(() => new Date()),
  note: z.string().max(300).optional().nullable(),
});

goalsRouter.post(
  "/:id/contribute",
  validateBody(contributionSchema),
  asyncHandler(async (req, res) => {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!goal) throw new HttpError(404, "Goal not found");
    await prisma.goalContribution.create({ data: { ...req.body, goalId: goal.id } });
    res.status(201).json(await withProgress(goal));
  })
);

goalsRouter.get(
  "/:id/contributions",
  asyncHandler(async (req, res) => {
    const goal = await prisma.goal.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!goal) throw new HttpError(404, "Goal not found");
    const contributions = await prisma.goalContribution.findMany({
      where: { goalId: goal.id },
      orderBy: { date: "desc" },
    });
    res.json(contributions);
  })
);
