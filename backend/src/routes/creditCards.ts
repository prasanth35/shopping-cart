import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isoDate, positiveMoney } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const creditCardsRouter = Router();
creditCardsRouter.use(requireAuth);

const cardSchema = z.object({
  name: z.string().min(1).max(120),
  bank: z.string().min(1).max(120),
  creditLimit: positiveMoney,
  billingCycleDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  isActive: z.boolean().default(true),
});

async function computeOutstanding(cardId: string): Promise<number> {
  const [spend, payments] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { creditCardId: cardId, type: "EXPENSE" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { creditCardId: cardId, type: "CC_PAYMENT" },
    }),
  ]);
  return Number(spend._sum.amount ?? 0) - Number(payments._sum.amount ?? 0);
}

creditCardsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const cards = await prisma.creditCard.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    const withOutstanding = await Promise.all(
      cards.map(async (card) => ({
        ...card,
        outstanding: await computeOutstanding(card.id),
      }))
    );
    res.json(withOutstanding);
  })
);

creditCardsRouter.post(
  "/",
  validateBody(cardSchema),
  asyncHandler(async (req, res) => {
    const card = await prisma.creditCard.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json({ ...card, outstanding: 0 });
  })
);

creditCardsRouter.patch(
  "/:id",
  validateBody(cardSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.creditCard.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Credit card not found");
    const card = await prisma.creditCard.update({ where: { id: existing.id }, data: req.body });
    res.json({ ...card, outstanding: await computeOutstanding(card.id) });
  })
);

creditCardsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.creditCard.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Credit card not found");
    const txnCount = await prisma.transaction.count({ where: { creditCardId: existing.id } });
    if (txnCount > 0) {
      await prisma.creditCard.update({ where: { id: existing.id }, data: { isActive: false } });
      return res.json({ archived: true });
    }
    await prisma.creditCard.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const paySchema = z.object({
  accountId: z.string().uuid(),
  amount: positiveMoney,
  date: isoDate.default(() => new Date()),
  note: z.string().max(500).optional(),
});

creditCardsRouter.post(
  "/:id/pay",
  validateBody(paySchema),
  asyncHandler(async (req, res) => {
    const card = await prisma.creditCard.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!card) throw new HttpError(404, "Credit card not found");
    const account = await prisma.account.findFirst({
      where: { id: req.body.accountId, userId: req.userId },
    });
    if (!account) throw new HttpError(404, "Account not found");

    const { amount, date, note } = req.body as z.infer<typeof paySchema>;
    const txn = await prisma.transaction.create({
      data: {
        userId: req.userId!,
        type: "CC_PAYMENT",
        amount,
        date,
        note: note ?? `Payment to ${card.name}`,
        accountId: account.id,
        creditCardId: card.id,
      },
    });
    res.status(201).json({ ...txn, outstanding: await computeOutstanding(card.id) });
  })
);

export { computeOutstanding as computeCreditCardOutstanding };
