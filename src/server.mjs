import { env } from "./config/env.mjs";
import { createApp } from "./app.mjs";
import { logger } from "./config/logger.mjs";
import { startMqttConsumer } from "./jobs/mqttConsumer.mjs";

const app = createApp();
app.listen(env.port, () => {
  logger.info(`Listening on http://localhost:${env.port}`);
});

startMqttConsumer().catch((err) =>
  logger.error(`Failed to start MQTT consumer: ${err.message}`)
);
