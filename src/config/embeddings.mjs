import { OllamaEmbeddings } from "@langchain/ollama";
import { env } from "./env.mjs";

export async function getEmbeddings() {
  return new OllamaEmbeddings({
    model: env.embeddings.model,
    baseUrl: env.ollama.baseUrl,
  });
}

