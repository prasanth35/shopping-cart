import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { isoDate } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const splitsRouter = Router();
splitsRouter.use(requireAuth);

const settleSchema = z.object({
  accountId: z.string().uuid(),
  date: isoDate.default(() => new Date()),
});

// Settling logs the reimbursement as a real INCOME transaction into the
// account you choose, so your balances stay accurate once a friend pays you back.
splitsRouter.post(
  "/:id/settle",
  validateBody(settleSchema),
  asyncHandler(async (req, res) => {
    const split = await prisma.split.findFirst({
      where: { id: req.params.id, contact: { userId: req.userId } },
      include: { contact: true, transaction: true },
    });
    if (!split) throw new HttpError(404, "Split not found");
    if (split.settledAt) throw new HttpError(400, "This split is already settled");

    const account = await prisma.account.findFirst({
      where: { id: req.body.accountId, userId: req.userId },
    });
    if (!account) throw new HttpError(404, "Account not found");

    const { date } = req.body as z.infer<typeof settleSchema>;

    const result = await prisma.$transaction(async (tx) => {
      const incomeTxn = await tx.transaction.create({
        data: {
          userId: req.userId!,
          type: "INCOME",
          amount: split.amount,
          date,
          note: `${split.contact.name} paid back: ${split.transaction.note ?? "split expense"}`,
          accountId: account.id,
        },
      });
      return tx.split.update({
        where: { id: split.id },
        data: { settledAt: date, settledTransactionId: incomeTxn.id },
        include: { contact: true },
      });
    });

    res.json(result);
  })
);
