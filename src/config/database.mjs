import { MongoClient } from "mongodb";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { env } from "./env.mjs";


let mongoInstance = null;
export async function getMongoDb() {
  if(!mongoInstance) {
    mongoInstance = new MongoClient(env.mongo.uri);
    mongoInstance.connect();
  }
  return mongoInstance.db(env.mongo.db);
}

let qdrantClientInstance = null;
export function getQdrantClient() {
  if (!qdrantClientInstance) {
    qdrantClientInstance = new QdrantClient({ url: env.qdrant.url });
  }
  return qdrantClientInstance;
}

let qdrantInstance = null;
export function getQdrantVectorStore(embeddings) {
  if (qdrantInstance) return qdrantInstance;

  qdrantInstance = (async () => {
    const client = new QdrantClient({ url: env.qdrant.url });

    const dim = (await embeddings.embedQuery("dim-check")).length;

    const store = new QdrantVectorStore(embeddings, {
      client,
      collectionName: env.qdrant.collection,
      collectionConfig: {
        vectors: {
          size: dim,
          distance: env.qdrant.distance
        },
      },
    });

    await store.ensureCollection();
    return store;
  })();

  return qdrantInstance;
}
