import jwt from "jsonwebtoken";
import { env } from "./env";

export interface SessionPayload {
  userId: string;
  email: string;
}

const EXPIRES_IN = "30d";

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: EXPIRES_IN });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, env.jwtSecret) as SessionPayload;
}

export const SESSION_COOKIE = "session";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProduction,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};
