import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getMissingRequiredEnv } from "../env.js";
import { ensureAnalysesSchema } from "./sigil/analysis-schema.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

function safeDatabaseError(error: unknown): { code?: string; message: string } {
  const err = error as { code?: string; message?: string };
  return {
    code: err.code,
    message: err.message?.split("\n")[0] ?? "Database connection failed",
  };
}

router.get("/readyz", async (_req, res) => {
  const missingEnv = getMissingRequiredEnv();
  let database: { status: "unchecked" | "ready" | "error"; error?: { code?: string; message: string } } = {
    status: missingEnv.includes("DATABASE_URL") ? "unchecked" : "ready",
  };

  if (!missingEnv.includes("DATABASE_URL")) {
    try {
      await ensureAnalysesSchema();
    } catch (error) {
      database = {
        status: "error",
        error: safeDatabaseError(error),
      };
    }
  }

  const ready = missingEnv.length === 0 && database.status === "ready";

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : missingEnv.length ? "missing_env" : "storage_error",
    missingEnv,
    database,
    optional: {
      ETHERSCAN_API_KEY: Boolean(process.env.ETHERSCAN_API_KEY),
    },
  });
});

export default router;
