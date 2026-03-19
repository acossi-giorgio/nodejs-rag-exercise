import { config as loadEnv } from "dotenv";
loadEnv();

export const env = {
  port: Number(process.env.PORT),

  mongo: {
    uri: process.env.MONGODB_URI,
    db: process.env.MONGODB_DB,
    collections: {
        sessions: process.env.MONGODB_SESSIONS_COLLECTION,
        interactions: process.env.MONGODB_INTERACTIONS_COLLECTION,
        documents: process.env.MONGODB_DOCUMENTS_COLLECTION,
        mqttTemperature: process.env.MONGODB_MQTT_TEMPERATURE_COLLECTION,
        mqttHumidity: process.env.MONGODB_MQTT_HUMIDITY_COLLECTION,
    }
  },

  qdrant: {
    url: process.env.QDRANT_URL,
    collection: process.env.QDRANT_COLLECTION,
    distance: process.env.QDRANT_DISTANCE_METRIC
  },

  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL
  },

  chat: {
    model: process.env.CHAT_MODEL,
    temperature: Number(process.env.CHAT_MODEL_TEMPERATURE),
    maxTokens: Number(process.env.CHAT_MODEL_MAX_TOKENS),
    topP: Number(process.env.CHAT_MODEL_TOP_P),
    topK: Number(process.env.CHAT_MODEL_TOP_K),
    presencePenalty: Number(process.env.CHAT_MODEL_PRESENCE_PENALTY),
    numContext: Number(process.env.CHAT_MODEL_NUM_CONTEXT),
  },

  embeddings: {
    model: process.env.EMBEDDINGS_MODEL
  },

  mqtt: {
    url: process.env.MQTT_URL,
    clientId: process.env.MQTT_CLIENT_ID,
  },

  rag: {
      nChunks: Number(process.env.N_CHUNK),
      nHistory: Number(process.env.N_HISTORY),
      threshold: Number(process.env.CHUNK_SCORE_THRESHOLD)
  },

  ingestion: {
      chunkSize: Number(process.env.CHUNK_SIZE),
      chunkOverlap: Number(process.env.CHUNK_OVERLAP),
      qdrantBatch: Number(process.env.QDRANT_BATCH),
      minChunkLen: Number(process.env.MIN_CHUNK_LEN),
      maxSpecialRatio: Number(process.env.MAX_SPECIAL_RATIO),
      allowedMimeTypes: process.env.ALLOWED_MIME_TYPES
  },

  rewriter: {
      model: process.env.REWRITER_MODEL,
      temperature: Number(process.env.REWRITER_MODEL_TEMPERATURE),
      maxTokens: Number(process.env.REWRITER_MODEL_MAX_TOKENS),
      topP: Number(process.env.REWRITER_MODEL_TOP_P),
      topK: Number(process.env.REWRITER_MODEL_TOP_K),
      presencePenalty: Number(process.env.REWRITER_MODEL_PRESENCE_PENALTY),
      numContext: Number(process.env.REWRITER_MODEL_NUM_CONTEXT),
  }
};
