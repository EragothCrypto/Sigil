import { Router, type IRouter } from "express";
import healthRouter from "./health";
import approvalsRouter from "./sigil/approvals.js";
import sigilRouter from "./sigil/index.js";
import simulateRouter from "./sigil/simulate.js";
import solanaMonitorRouter from "./sigil/solana-monitor.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sigil", sigilRouter);
router.use("/sigil", simulateRouter);
router.use("/sigil", approvalsRouter);
router.use("/sigil", solanaMonitorRouter);

export default router;
