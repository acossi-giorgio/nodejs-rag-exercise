import { env } from "./env.mjs";

export const topicCollectionMap = {
  "temperature": env.mongo.collections.mqttTemperature,
  "humidity":    env.mongo.collections.mqttHumidity,
};

export const subscribedTopics = Object.keys(topicCollectionMap);
