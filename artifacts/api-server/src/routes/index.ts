import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sigilRouter from "./sigil/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sigil", sigilRouter);

export default router;
