import { Router, type IRouter } from "express";
import healthRouter from "./health";
import approvalsRouter from "./sigil/approvals.js";
import sigilRouter from "./sigil/index.js";
import simulateRouter from "./sigil/simulate.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sigil", sigilRouter);
router.use("/sigil", simulateRouter);
router.use("/sigil", approvalsRouter);

export default router;
