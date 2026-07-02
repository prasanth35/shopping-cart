import { Router } from "express";
import { stringify } from "csv-stringify";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateQuery } from "../middleware/validate";

export const exportRouter = Router();
exportRouter.use(requireAuth);

const exportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// Vault data is intentionally never included in any export.
exportRouter.get(
  "/transactions.csv",
  validateQuery(exportQuerySchema),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof exportQuerySchema>;
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        ...(q.from || q.to
          ? { date: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
          : {}),
      },
      orderBy: { date: "asc" },
      include: { account: true, toAccount: true, creditCard: true, category: true, goal: true, investment: true },
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");

    const stringifier = stringify({
      header: true,
      columns: [
        "date",
        "type",
        "amount",
        "category",
        "account",
        "to_account",
        "credit_card",
        "goal",
        "investment",
        "payee",
        "note",
        "tags",
      ],
    });
    stringifier.pipe(res);
    for (const t of transactions) {
      stringifier.write({
        date: t.date.toISOString().slice(0, 10),
        type: t.type,
        amount: t.amount.toString(),
        category: t.category?.name ?? "",
        account: t.account?.name ?? "",
        to_account: t.toAccount?.name ?? "",
        credit_card: t.creditCard?.name ?? "",
        goal: t.goal?.name ?? "",
        investment: t.investment?.name ?? "",
        payee: t.payee ?? "",
        note: t.note ?? "",
        tags: t.tags.join("|"),
      });
    }
    stringifier.end();
  })
);
