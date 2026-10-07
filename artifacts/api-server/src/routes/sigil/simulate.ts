import { Router, type IRouter } from "express";
import { createEvidenceRpc } from "./evidence-rpc.js";
import { isSupportedNetwork } from "./ethereum.js";
import { parseExecutionInput, checkExecution } from "./execution-check.js";

const router: IRouter = Router();
router.post("/simulate", (_req, res) => {
  res.status(422).json({ error: "execution_analysis_unavailable",
    message: "Complete execution analysis is unavailable. Use /simulate-v2 for bounded read-only checks and explicit limitations." });
});
router.post("/simulate-v2", async (req, res) => {
  const input = parseExecutionInput(req.body);
  if (!input || !isSupportedNetwork(input.network)) {
    res.status(400).json({ error: "validation_error", message: "Invalid or unsupported execution-check input." });
    return;
  }
  const controller = new AbortController();
  const aborted = () => controller.abort();
  const closed = () => { if (!res.writableEnded) controller.abort(); };
  req.on("aborted", aborted);
  res.on("close", closed);
  try {
    if (req.aborted || res.destroyed) controller.abort();
    if (controller.signal.aborted) return;
    let rpc;
    try { rpc = input.transaction?.to ? createEvidenceRpc(input.network, controller.signal) : undefined; }
    catch { /* Provider configuration failure is unavailable evidence. */ }
    const result = await checkExecution(input, rpc);
    if (!controller.signal.aborted && !res.writableEnded && !res.destroyed) res.json(result);
  } finally {
    req.off("aborted", aborted);
    res.off("close", closed);
  }
});
export default router;
