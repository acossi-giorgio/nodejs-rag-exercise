import { getMqttClient } from "../config/mqtt.mjs";
import { getMongoDb } from "../config/database.mjs";
import { saveMqttEvent } from "../repositories/mqttEventRepository.mjs";
import { topicCollectionMap, subscribedTopics } from "../config/topicMap.mjs";
import { validateMqttPayload } from "../schemas/mqttSchema.mjs";
import { logger } from "../config/logger.mjs";

export async function startMqttConsumer() {
  const [client, db] = await Promise.all([getMqttClient(), getMongoDb()]);

  client.subscribe(subscribedTopics, (err) => {
    if (err) {
      logger.error(`MQTT subscribe error: ${err.message}`);
      return;
    }
    logger.info(`MQTT consumer subscribed to topics: ${subscribedTopics.join(", ")}`);
  });

  client.on("message", async (topic, message) => {
    try {
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch {
        payload = message.toString();
      }

      const { valid, errors } = validateMqttPayload(topic, payload);
      if (!valid) {
        logger.warn(`MQTT payload validation failed [topic=${topic}]: ${JSON.stringify(errors)}`);
        return;
      }

      const collectionName = topicCollectionMap[topic];
      if (!collectionName) {
        logger.warn(`MQTT message received on unknown topic "${topic}" — skipped`);
        return;
      }

      const id = await saveMqttEvent(db, topic, payload, collectionName);
      logger.info(
        `MQTT event persisted topic: ${topic} collection:${collectionName} id=${id}`
      );
    } catch (err) {
      logger.error(`MQTT message handling error: ${err.message}`);
    }
  });

  client.on("error", (err) => {
    logger.error(`MQTT client error: ${err.message}`);
  });

  client.on("reconnect", () => {
    logger.warn("MQTT client reconnecting...");
  });
}
