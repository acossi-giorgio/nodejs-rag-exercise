import { MongoClient } from "mongodb";
import { QdrantClient } from "@qdrant/js-client-rest";
import { QdrantVectorStore } from "@langchain/qdrant";
import { env } from "./env.mjs";
import { InfluxDB } from '@influxdata/influxdb-client';


let influxInstance = null;
export async function getInfluxDb() {
  if (influxInstance) return influxInstance;

  influxInstance = (async () => {
    const { url, token, org, bucket, precision } = env.influx || {};
    const client = new InfluxDB({ url, token });
    const writeApi = client.getWriteApi(org, bucket, precision);
    const queryApi = client.getQueryApi(org);
    return {
      client,
      writeApi,
      queryApi,
      org,
      bucket,
      writePoint: (point) => writeApi.writePoint(point),
      flush: async () => { await writeApi.flush(); },
      close: async () => { await writeApi.close(); }
    };
  })();
  return await influxInstance;
}

let mongoInstance = null;
export async function getMongoDb() {
  if(!mongoInstance) {
    mongoInstance = new MongoClient(env.mongo.uri);
    mongoInstance.connect();
  }
  return mongoInstance.db(env.mongo.db);
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
