import app from "./app";
import { assertRequiredEnv } from "./env.js";
import { logger } from "./lib/logger";
import { seedHallOfShame } from "./routes/sigil/hall-of-shame-seed.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

assertRequiredEnv();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed Hall of Shame entries once (fire and forget — won't block requests)
  setTimeout(() => seedHallOfShame(), 2000);
});
