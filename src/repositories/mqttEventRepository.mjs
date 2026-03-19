export async function saveMqttEvent(db, topic, payload, collectionName) {
  const collection = db.collection(collectionName);
  const result = await collection.insertOne({
    topic,
    payload,
    receivedAt: new Date(),
  });
  return result.insertedId;
}

export async function getLatestReading(db, collectionName) {
  return db.collection(collectionName).findOne({}, { sort: { receivedAt: -1 } });
}
