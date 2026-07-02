import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

const categorySchema = z.object({
  name: z.string().min(1).max(80),
  kind: z.enum(["INCOME", "EXPENSE"]),
  color: z.string().max(20).default("#6366f1"),
  icon: z.string().max(60).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { name: "asc" },
    });
    res.json(categories);
  })
);

categoriesRouter.post(
  "/",
  validateBody(categorySchema),
  asyncHandler(async (req, res) => {
    try {
      const category = await prisma.category.create({ data: { ...req.body, userId: req.userId! } });
      res.status(201).json(category);
    } catch {
      throw new HttpError(409, "A category with this name and kind already exists");
    }
  })
);

categoriesRouter.patch(
  "/:id",
  validateBody(categorySchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Category not found");
    const category = await prisma.category.update({ where: { id: existing.id }, data: req.body });
    res.json(category);
  })
);

categoriesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.category.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Category not found");
    const txnCount = await prisma.transaction.count({ where: { categoryId: existing.id } });
    if (txnCount > 0) {
      throw new HttpError(400, "Cannot delete a category that has transactions; reassign them first");
    }
    await prisma.category.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);
