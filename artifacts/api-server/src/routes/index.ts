import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sigilRouter from "./sigil/index.js";
import simulateRouter from "./sigil/simulate.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sigil", sigilRouter);
router.use("/sigil", simulateRouter);

export default router;
