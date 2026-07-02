import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

export const contactsRouter = Router();
contactsRouter.use(requireAuth);

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  notes: z.string().max(500).optional().nullable(),
});

async function withBalance<T extends { id: string }>(contact: T) {
  const sum = await prisma.split.aggregate({
    _sum: { amount: true },
    where: { contactId: contact.id, settledAt: null },
  });
  return { ...contact, owedToYou: Number(sum._sum.amount ?? 0) };
}

contactsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.userId },
      orderBy: { name: "asc" },
    });
    res.json(await Promise.all(contacts.map(withBalance)));
  })
);

contactsRouter.post(
  "/",
  validateBody(contactSchema),
  asyncHandler(async (req, res) => {
    const contact = await prisma.contact.create({ data: { ...req.body, userId: req.userId! } });
    res.status(201).json(await withBalance(contact));
  })
);

contactsRouter.patch(
  "/:id",
  validateBody(contactSchema.partial()),
  asyncHandler(async (req, res) => {
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) throw new HttpError(404, "Contact not found");
    const contact = await prisma.contact.update({ where: { id: existing.id }, data: req.body });
    res.json(await withBalance(contact));
  })
);

contactsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.contact.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!existing) throw new HttpError(404, "Contact not found");
    const splitCount = await prisma.split.count({ where: { contactId: existing.id } });
    if (splitCount > 0) {
      throw new HttpError(400, "Cannot delete a contact with split history");
    }
    await prisma.contact.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

contactsRouter.get(
  "/:id/splits",
  asyncHandler(async (req, res) => {
    const contact = await prisma.contact.findFirst({ where: { id: req.params.id, userId: req.userId } });
    if (!contact) throw new HttpError(404, "Contact not found");
    const splits = await prisma.split.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "desc" },
      include: { transaction: { include: { category: true, account: true, creditCard: true } } },
    });
    res.json(splits);
  })
);
