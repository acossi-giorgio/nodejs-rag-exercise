import { env } from "../config/env.mjs";

export async function getInteractions(db, sessionId, limit) {
  const col = db.collection(env.mongo.collections.interactions);
  const rows = await col.find({ sessionId }).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.reverse();
}

export async function createInteraction(db, sessionId, question, result = {}) {
  const col = db.collection(env.mongo.collections.interactions);
  const interaction = {
    sessionId,
    question,
    ...result,
    createdAt: new Date(),
  };
  await col.insertOne(interaction);
}
