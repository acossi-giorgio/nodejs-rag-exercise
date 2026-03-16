import { ChatOllama } from "@langchain/ollama";
import { env } from "./env.mjs";

export async function getChatModel() {
    return new ChatOllama({
        model: env.chat.model,
        baseUrl: env.ollama.baseUrl,
        temperature: env.chat.temperature,
    });
}

export async function getRewriterModel() {
    return new ChatOllama({
        model: env.rewriter.model,
        baseUrl: env.ollama.baseUrl,
        temperature: env.rewriter.temperature,
    });
}