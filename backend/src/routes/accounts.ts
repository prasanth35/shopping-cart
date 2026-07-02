import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { money } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const accountsRouter = Router();
accountsRouter.use(requireAuth);

const accountSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.string().min(1).max(60),
  currency: z.string().min(1).max(10).default("INR"),
  openingBalance: money.default(0),
  isActive: z.boolean().default(true),
});

async function computeBalance(accountId: string): Promise<number> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const [incoming, outgoing] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        OR: [
          { toAccountId: accountId, type: "TRANSFER" },
          { accountId, type: "INCOME" },
        ],
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        accountId,
        type: { in: ["EXPENSE", "TRANSFER", "CC_PAYMENT"] },
      },
    }),
  ]);
  const opening = Number(account.openingBalance);
  const inSum = Number(incoming._sum.amount ?? 0);
  const outSum = Number(outgoing._sum.amount ?? 0);
  return opening + inSum - outSum;
}

accountsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const accounts = await prisma.account.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "asc" },
    });
    const withBalance = await Promise.all(
      accounts.map(async (account) => ({
        ...account,
        balance: await computeBalance(account.id),
      }))
    );
    res.json(withBalance);
  })
);

accountsRouter.post(
  "/",
  validateBody(accountSchema),
  asyncHandler(async (req, res) => {
    const account = await prisma.account.create({
      data: { ...req.body, userId: req.userId! },
    });
    res.status(201).json({ ...account, balance: Number(account.openingBalance) });
  })
);

accountsRouter.patch(
  "/:id",
  validateBody(accountSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Account not found");
    const account = await prisma.account.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ ...account, balance: await computeBalance(account.id) });
  })
);

accountsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Account not found");
    const txnCount = await prisma.transaction.count({
      where: { OR: [{ accountId: existing.id }, { toAccountId: existing.id }] },
    });
    if (txnCount > 0) {
      await prisma.account.update({ where: { id: existing.id }, data: { isActive: false } });
      return res.json({ archived: true });
    }
    await prisma.account.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

export { computeBalance as computeAccountBalance };
