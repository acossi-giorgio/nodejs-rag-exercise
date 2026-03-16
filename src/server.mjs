import { env } from "./config/env.mjs";
import { createApp } from "./app.mjs";
import { logger } from "./config/logger.mjs";

const app = createApp();
app.listen(env.port, () => {
  logger.info(`listening on http://localhost:${env.port}`);
});
