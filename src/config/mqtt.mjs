import mqtt from "mqtt";
import { env } from "./env.mjs";
import { logger } from "./logger.mjs";

let mqttClientInstance = null;

export async function getMqttClient() {
  if (mqttClientInstance) return mqttClientInstance;

  mqttClientInstance = await new Promise((resolve, reject) => {
    const client = mqtt.connect(env.mqtt.url, {
      clientId: env.mqtt.clientId,
      clean: true,
      reconnectPeriod: 5000,
    });

    client.once("connect", () => {
      logger.info(`MQTT connected to ${env.mqtt.url}`);
      resolve(client);
    });

    client.once("error", (err) => {
      logger.error(`MQTT connection error: ${err.message}`);
      reject(err);
    });
  });

  return mqttClientInstance;
}
