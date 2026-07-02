import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./lib/env";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { authRouter } from "./routes/auth";
import { accountsRouter } from "./routes/accounts";
import { creditCardsRouter } from "./routes/creditCards";
import { categoriesRouter } from "./routes/categories";
import { transactionsRouter } from "./routes/transactions";
import { goalsRouter } from "./routes/goals";
import { investmentsRouter } from "./routes/investments";
import { vaultRouter } from "./routes/vault";
import { dashboardRouter } from "./routes/dashboard";
import { exportRouter } from "./routes/export";
import { contactsRouter } from "./routes/contacts";
import { splitsRouter } from "./routes/splits";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin ?? true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/accounts", accountsRouter);
  app.use("/api/credit-cards", creditCardsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/investments", investmentsRouter);
  app.use("/api/vault", vaultRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/contacts", contactsRouter);
  app.use("/api/splits", splitsRouter);

  app.use("/api", notFound);
  app.use(errorHandler);

  return app;
}
