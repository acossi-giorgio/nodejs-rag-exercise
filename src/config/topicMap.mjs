import { env } from "./env.mjs";

export const topicCollectionMap = {
  "sensors":     "sensors",
  "devices":     "devices",
  "alerts":      "alerts",
  "temperature": env.mongo.collections.mqttTemperature,
  "humidity":    env.mongo.collections.mqttHumidity,
};

export const subscribedTopics = Object.keys(topicCollectionMap);
