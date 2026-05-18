import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getMissingRequiredEnv } from "../env.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", (_req, res) => {
  const missingEnv = getMissingRequiredEnv();
  res.status(missingEnv.length ? 503 : 200).json({
    status: missingEnv.length ? "missing_env" : "ready",
    missingEnv,
    optional: {
      ETHERSCAN_API_KEY: Boolean(process.env.ETHERSCAN_API_KEY),
    },
  });
});

export default router;
