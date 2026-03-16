import { env } from "../config/env.mjs";

export async function getDocuments(db){
  const documents = db.collection(env.mongo.collections.documents);
  return await documents.find().toArray();
}

export async function createDocument(db, name) {
  const documents = db.collection(env.mongo.collections.documents);
  const result = await documents.insertOne({ name, createdAt: new Date() });
  return result.insertedId;
}

export async function getDocument(db, documentName){
  const documents = db.collection(env.mongo.collections.documents);
  return await documents.findOne({ name: documentName });
}