import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "../lib/jwt";
import { asyncHandler, HttpError } from "../middleware/errorHandler";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { authRateLimit } from "../middleware/rateLimit";

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// This app is single-user (personal home use). Setup is only allowed once,
// so it can't be abused as an open signup endpoint.
authRouter.post(
  "/setup",
  authRateLimit,
  validateBody(credentialsSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findFirst();
    if (existing) {
      throw new HttpError(409, "Setup has already been completed");
    }
    const { email, password } = req.body as z.infer<typeof credentialsSchema>;
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash } });
    const token = signSession({ userId: user.id, email: user.email });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.status(201).json({ id: user.id, email: user.email });
  })
);

authRouter.get(
  "/setup-required",
  asyncHandler(async (_req, res) => {
    const existing = await prisma.user.findFirst();
    res.json({ setupRequired: !existing });
  })
);

authRouter.post(
  "/login",
  authRateLimit,
  validateBody(credentialsSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof credentialsSchema>;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const token = signSession({ userId: user.id, email: user.email });
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
    res.json({ id: user.id, email: user.email });
  })
);

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).send();
});

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
    res.json({ id: user.id, email: user.email });
  })
);

export const verifyPasswordSchema = z.object({
  password: z.string().min(1),
});

export async function verifyUserPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return bcrypt.compare(password, user.passwordHash);
}
