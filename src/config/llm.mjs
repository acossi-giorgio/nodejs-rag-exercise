import { ChatOllama } from "@langchain/ollama";
import { env } from "./env.mjs";

export async function getChatModel() {
  return new ChatOllama({
    model: env.chat.model,
    baseUrl: env.ollama.baseUrl,
    temperature: env.chat.temperature,
    numPredict: env.chat.maxTokens,
    topP: env.chat.topP,
    topK: env.chat.topK,
    presencePenalty: env.chat.presencePenalty,
    numCtx: env.chat.numContext,
  });
}

export async function getRewriterModel() {
  return new ChatOllama({
    model: env.rewriter.model,
    baseUrl: env.ollama.baseUrl,
    temperature: env.rewriter.temperature,
    numPredict: env.rewriter.maxTokens,
    topP: env.rewriter.topP,
    topK: env.rewriter.topK,
    presencePenalty: env.rewriter.presencePenalty,
    numCtx: env.rewriter.numContext,
    stop: ["\n", "<|end|>", "<|endoftext|>"],
  });
}