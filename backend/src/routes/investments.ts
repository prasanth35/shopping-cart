import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isoDate } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const investmentsRouter = Router();
investmentsRouter.use(requireAuth);

const investmentSchema = z.object({
  fundName: z.string().min(1).max(160),
  folioNumber: z.string().max(80).optional().nullable(),
  category: z.string().max(60).optional().nullable(),
  currentNav: z.coerce.number().positive().default(0),
  isArchived: z.boolean().default(false),
});

async function withHoldingStats<T extends { id: string; currentNav: unknown }>(investment: T) {
  const txns = await prisma.investmentTransaction.findMany({ where: { investmentId: investment.id } });
  let units = 0;
  let invested = 0;
  for (const t of txns) {
    const txnUnits = Number(t.units);
    const txnAmount = Number(t.amount);
    if (t.type === "SELL") {
      units -= txnUnits;
      invested -= txnAmount;
    } else {
      units += txnUnits;
      invested += txnAmount;
    }
  }
  const currentValue = units * Number(investment.currentNav);
  return {
    ...investment,
    units,
    investedAmount: invested,
    currentValue,
    gainLoss: currentValue - invested,
    avgNav: units !== 0 ? invested / units : 0,
  };
}

investmentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const investments = await prisma.investment.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    res.json(await Promise.all(investments.map(withHoldingStats)));
  })
);

investmentsRouter.post(
  "/",
  validateBody(investmentSchema),
  asyncHandler(async (req, res) => {
    const investment = await prisma.investment.create({
      data: { ...req.body, navUpdatedAt: new Date(), userId: req.userId! },
    });
    res.status(201).json(await withHoldingStats(investment));
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
    const data: Record<string, unknown> = { ...req.body };
    if (req.body.currentNav !== undefined) data.navUpdatedAt = new Date();
    const investment = await prisma.investment.update({ where: { id: existing.id }, data });
    res.json(await withHoldingStats(investment));
  })
);

investmentsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Investment not found");
    await prisma.investment.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const investmentTxnSchema = z.object({
  type: z.enum(["BUY", "SELL", "SIP"]),
  units: z.coerce.number().positive(),
  nav: z.coerce.number().positive(),
  amount: z.coerce.number().positive(),
  date: isoDate.default(() => new Date()),
  note: z.string().max(300).optional().nullable(),
});

investmentsRouter.get(
  "/:id/transactions",
  asyncHandler(async (req, res) => {
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!investment) throw new HttpError(404, "Investment not found");
    const txns = await prisma.investmentTransaction.findMany({
      where: { investmentId: investment.id },
      orderBy: { date: "desc" },
    });
    res.json(txns);
  })
);

investmentsRouter.post(
  "/:id/transactions",
  validateBody(investmentTxnSchema),
  asyncHandler(async (req, res) => {
    const investment = await prisma.investment.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!investment) throw new HttpError(404, "Investment not found");
    await prisma.investmentTransaction.create({
      data: { ...req.body, investmentId: investment.id },
    });
    res.status(201).json(await withHoldingStats(investment));
  })
);
