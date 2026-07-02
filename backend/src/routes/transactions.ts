import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { isoDate, positiveMoney } from "../lib/schemas";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody, validateQuery } from "../middleware/validate";

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);

const baseTxnFields = {
  amount: positiveMoney,
  date: isoDate,
  note: z.string().max(500).optional().nullable(),
  payee: z.string().max(160).optional().nullable(),
  tags: z.array(z.string().max(40)).max(20).default([]),
};

const splitSchema = z.object({
  contactId: z.string().uuid(),
  amount: positiveMoney,
});

const txnSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("INCOME"),
    ...baseTxnFields,
    accountId: z.string().uuid(),
    categoryId: z.string().uuid(),
  }),
  z.object({
    type: z.literal("EXPENSE"),
    ...baseTxnFields,
    accountId: z.string().uuid().optional(),
    creditCardId: z.string().uuid().optional(),
    categoryId: z.string().uuid(),
    // Splits: portions of this expense that a contact owes you back. Only
    // honored on create — editing splits after the fact isn't supported yet.
    splits: z.array(splitSchema).max(20).optional(),
  }),
  z.object({
    type: z.literal("TRANSFER"),
    ...baseTxnFields,
    accountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
  }),
]);

function validateTxnPayload(body: z.infer<typeof txnSchema>) {
  if (body.type === "EXPENSE" && !body.accountId && !body.creditCardId) {
    throw new HttpError(400, "Expense must have either an account or a credit card");
  }
  if (body.type === "EXPENSE" && body.accountId && body.creditCardId) {
    throw new HttpError(400, "Expense cannot have both an account and a credit card");
  }
  if (body.type === "TRANSFER" && body.accountId === body.toAccountId) {
    throw new HttpError(400, "Cannot transfer to the same account");
  }
  if (body.type === "EXPENSE" && body.splits && body.splits.length > 0) {
    const splitTotal = body.splits.reduce((sum, s) => sum + s.amount, 0);
    if (splitTotal > body.amount) {
      throw new HttpError(400, "Split amounts can't exceed the expense total");
    }
  }
}

const TXN_TYPES = ["INCOME", "EXPENSE", "TRANSFER", "CC_PAYMENT", "GOAL_CONTRIBUTION"] as const;

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  accountId: z.string().uuid().optional(),
  creditCardId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  type: z.enum(TXN_TYPES).optional(),
  search: z.string().max(200).optional(),
});

function buildWhere(userId: string, q: z.infer<typeof listQuerySchema>): Prisma.TransactionWhereInput {
  return {
    userId,
    ...(q.from || q.to
      ? { date: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
      : {}),
    ...(q.accountId ? { OR: [{ accountId: q.accountId }, { toAccountId: q.accountId }] } : {}),
    ...(q.creditCardId ? { creditCardId: q.creditCardId } : {}),
    ...(q.categoryId ? { categoryId: q.categoryId } : {}),
    ...(q.type ? { type: q.type } : {}),
    ...(q.search
      ? {
          OR: [
            { note: { contains: q.search, mode: "insensitive" } },
            { payee: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

const txnInclude = {
  account: true,
  toAccount: true,
  creditCard: true,
  category: true,
  goal: true,
  splits: { include: { contact: true } },
} satisfies Prisma.TransactionInclude;

transactionsRouter.get(
  "/",
  validateQuery(listQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuerySchema>;
    const where = buildWhere(req.userId!, q);
    const [items, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: txnInclude,
      }),
      prisma.transaction.count({ where }),
    ]);
    res.json({ items, total, page: q.page, pageSize: q.pageSize });
  })
);

transactionsRouter.post(
  "/",
  validateBody(txnSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof txnSchema>;
    validateTxnPayload(body);

    const splits = body.type === "EXPENSE" ? body.splits : undefined;
    if (splits && splits.length > 0) {
      const contactCount = await prisma.contact.count({
        where: { userId: req.userId, id: { in: splits.map((s) => s.contactId) } },
      });
      if (contactCount !== new Set(splits.map((s) => s.contactId)).size) {
        throw new HttpError(400, "One or more contacts were not found");
      }
    }

    const { splits: _splits, ...rest } = body as typeof body & { splits?: unknown };
    const txn = await prisma.transaction.create({
      data: {
        ...(rest as Prisma.TransactionUncheckedCreateInput),
        userId: req.userId!,
        ...(splits && splits.length > 0
          ? { splits: { create: splits.map((s) => ({ contactId: s.contactId, amount: s.amount })) } }
          : {}),
      },
      include: txnInclude,
    });
    res.status(201).json(txn);
  })
);

transactionsRouter.patch(
  "/:id",
  validateBody(txnSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Transaction not found");
    if (existing.type === "GOAL_CONTRIBUTION" || existing.type === "CC_PAYMENT") {
      throw new HttpError(400, `${existing.type} transactions can't be edited — delete and re-create instead`);
    }
    const body = req.body as z.infer<typeof txnSchema>;
    validateTxnPayload(body);
    const txn = await prisma.transaction.update({
      where: { id: existing.id },
      data: {
        type: body.type,
        amount: body.amount,
        date: body.date,
        note: body.note,
        payee: body.payee,
        tags: body.tags,
        accountId: "accountId" in body ? body.accountId ?? null : null,
        toAccountId: "toAccountId" in body ? body.toAccountId ?? null : null,
        creditCardId: "creditCardId" in body ? body.creditCardId ?? null : null,
        categoryId: "categoryId" in body ? body.categoryId ?? null : null,
      },
      include: txnInclude,
    });
    res.json(txn);
  })
);

transactionsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Transaction not found");
    await prisma.transaction.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
