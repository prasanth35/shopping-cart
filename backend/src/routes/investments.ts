import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isoDate, positiveMoney } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const investmentsRouter = Router();
investmentsRouter.use(requireAuth);

const INVESTMENT_TYPES = ["SIP", "MUTUAL_FUND", "NPS", "FD", "RD", "OTHER"] as const;

const investmentSchema = z.object({
  name: z.string().min(1).max(160),
  type: z.enum(INVESTMENT_TYPES),
  referenceNumber: z.string().max(80).optional().nullable(),
  isArchived: z.boolean().default(false),
});

async function withStats<T extends { id: string; currentValue: unknown }>(investment: T) {
  const sum = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { investmentId: investment.id, type: "INVESTMENT_CONTRIBUTION" },
  });
  const investedAmount = Number(sum._sum.amount ?? 0);
  const currentValue = Number(investment.currentValue);
  return { ...investment, investedAmount, gainLoss: currentValue - investedAmount };
}

investmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const investments = await prisma.investment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json(await Promise.all(investments.map(withStats)));
  })
);

investmentsRouter.post(
  "/",
  validateBody(investmentSchema),
  asyncHandler(async (req, res) => {
    const investment = await prisma.investment.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(await withStats(investment));
  })
);

investmentsRouter.patch(
  "/:id",
  validateBody(investmentSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Investment not found");
    const investment = await prisma.investment.update({ where: { id: existing.id }, data: req.body });
    res.json(await withStats(investment));
  })
);

investmentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Investment not found");
    const txnCount = await prisma.transaction.count({ where: { investmentId: existing.id } });
    if (txnCount > 0) {
      throw new HttpError(400, "Cannot delete an investment with contributions; archive it instead");
    }
    await prisma.investment.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const contributionSchema = z.object({
  accountId: z.string().uuid(),
  amount: positiveMoney,
  date: isoDate.default(() => new Date()),
  note: z.string().max(300).optional().nullable(),
});

// Contributing deducts the amount from the chosen account's spendable balance
// (a real transaction, not just a tally) so it's always clear where the money came from.
investmentsRouter.post(
  "/:id/contribute",
  validateBody(contributionSchema),
  asyncHandler(async (req, res) => {
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!investment) throw new HttpError(404, "Investment not found");
    const account = await prisma.account.findFirst({
      where: { id: req.body.accountId, userId: req.userId },
    });
    if (!account) throw new HttpError(404, "Account not found");

    const { accountId, amount, date, note } = req.body as z.infer<typeof contributionSchema>;
    await prisma.transaction.create({
      data: {
        userId: req.userId!,
        type: "INVESTMENT_CONTRIBUTION",
        amount,
        date,
        note: note ?? `Contribution to ${investment.name}`,
        accountId,
        investmentId: investment.id,
      },
    });
    res.status(201).json(await withStats(investment));
  })
);

investmentsRouter.get(
  "/:id/contributions",
  asyncHandler(async (req, res) => {
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!investment) throw new HttpError(404, "Investment not found");
    const contributions = await prisma.transaction.findMany({
      where: { investmentId: investment.id, type: "INVESTMENT_CONTRIBUTION" },
      orderBy: { date: "desc" },
      include: { account: true },
    });
    res.json(contributions);
  })
);

const currentValueSchema = z.object({ currentValue: positiveMoney });

investmentsRouter.patch(
  "/:id/current-value",
  validateBody(currentValueSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Investment not found");
    const investment = await prisma.investment.update({
      where: { id: existing.id },
      data: { currentValue: req.body.currentValue, valueUpdatedAt: new Date() },
    });
    res.json(await withStats(investment));
  })
);
