import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { decryptVaultPayload, encryptVaultPayload } from "../lib/crypto";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { vaultRateLimit } from "../middleware/rateLimit";
import { verifyUserPassword } from "./auth";

export const vaultRouter = Router();
vaultRouter.use(requireAuth, vaultRateLimit);

const passwordDataSchema = z.object({
  site: z.string().max(200).optional(),
  username: z.string().max(200).optional(),
  password: z.string().max(500),
  notes: z.string().max(2000).optional(),
});

const cardDataSchema = z.object({
  cardholderName: z.string().max(200).optional(),
  cardNumber: z.string().max(40),
  expiry: z.string().max(10).optional(),
  cvv: z.string().max(10).optional(),
  bank: z.string().max(120).optional(),
  notes: z.string().max(2000).optional(),
});

const noteDataSchema = z.object({
  body: z.string().max(4000),
});

const vaultEntrySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PASSWORD"), title: z.string().min(1).max(160), data: passwordDataSchema }),
  z.object({ type: z.literal("CARD"), title: z.string().min(1).max(160), data: cardDataSchema }),
  z.object({ type: z.literal("NOTE"), title: z.string().min(1).max(160), data: noteDataSchema }),
]);

// List/detail responses never include decrypted content, only metadata.
function toMetadata(entry: { id: string; type: string; title: string; createdAt: Date; updatedAt: Date }) {
  return { id: entry.id, type: entry.type, title: entry.title, createdAt: entry.createdAt, updatedAt: entry.updatedAt };
}

vaultRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const entries = await prisma.vaultEntry.findMany({
      where: { userId: req.userId },
      orderBy: { title: "asc" },
    });
    res.json(entries.map(toMetadata));
  })
);

vaultRouter.post(
  "/",
  validateBody(vaultEntrySchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof vaultEntrySchema>;
    const { ciphertext, iv, authTag } = encryptVaultPayload(JSON.stringify(body.data));
    const entry = await prisma.vaultEntry.create({
      data: { userId: req.userId!, type: body.type, title: body.title, ciphertext, iv, authTag },
    });
    res.status(201).json(toMetadata(entry));
  })
);

vaultRouter.patch(
  "/:id",
  validateBody(vaultEntrySchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.vaultEntry.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Vault entry not found");
    const body = req.body as z.infer<typeof vaultEntrySchema>;
    const { ciphertext, iv, authTag } = encryptVaultPayload(JSON.stringify(body.data));
    const entry = await prisma.vaultEntry.update({
      where: { id: existing.id },
      data: { type: body.type, title: body.title, ciphertext, iv, authTag },
    });
    res.json(toMetadata(entry));
  })
);

vaultRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.vaultEntry.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) throw new HttpError(404, "Vault entry not found");
    await prisma.vaultEntry.delete({ where: { id: existing.id } });
    res.status(204).send();
  })
);

const revealSchema = z.object({ password: z.string().min(1) });

// Defense in depth: revealing decrypted secrets requires re-entering the
// account login password, even though the request is already authenticated.
vaultRouter.post(
  "/:id/reveal",
  validateBody(revealSchema),
  asyncHandler(async (req, res) => {
    const entry = await prisma.vaultEntry.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!entry) throw new HttpError(404, "Vault entry not found");
    const ok = await verifyUserPassword(req.userId!, req.body.password);
    if (!ok) throw new HttpError(401, "Incorrect password");
    const data = JSON.parse(
      decryptVaultPayload({ ciphertext: entry.ciphertext, iv: entry.iv, authTag: entry.authTag })
    );
    res.json({ ...toMetadata(entry), data });
  })
);
