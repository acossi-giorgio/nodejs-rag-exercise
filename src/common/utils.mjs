import path from "path";
import { logger } from "../config/logger.mjs";

export function cleanRawResponse(raw) {
  if (raw == null) return "";
  let text = Array.isArray(raw) ? raw.map(c => (c?.text ?? c)).join(" ") : raw;
  if (typeof text !== "string") text = String(text ?? "");

  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  
  if (/^[\s\S]*?<\/think>/i.test(text)) {
      text = text.replace(/^[\s\S]*?<\/think>/i, "");
  } else {
      text = text.replace(/<\/think>/gi, "");
  }
  text = text.replace(/<think>/gi, "");
  text = text.trim();
  
  if (text.startsWith("````") || text.startsWith("```")) {
    const fenceMatch = /```(?:json)?\n([\s\S]*?)```/i.exec(text);
    if (fenceMatch) text = fenceMatch[1].trim();
  }
  return text;
}

export function decodeBase64(content) {
    if (typeof content !== "string") throw new Error("Document content must be a base64 string.");
    const normalized = content.replace(/\s/g, "");
    if (!normalized) throw new Error("Document content cannot be empty.");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) throw new Error("Document content is not valid base64.");
    if (normalized.length % 4 === 1) throw new Error("Document content is not valid base64.");
    const buffer = Buffer.from(normalized, "base64");
    if (!buffer.length) throw new Error("Decoded document is empty.");
    return { buffer, base64: normalized };
}

export function sanitizeDocumentName(name) {
  return path.basename(name).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function logPrompt(prompt, input, history) {
  if (history?.length) {
    const hist = history.map((m) => `[${m.getType()}]: ${m.content}`).join("\n");
    logger.debug(`History:\n${hist}`);
  }
  const msgs = (await prompt.formatMessages(input)).map((m) => `[${m.getType()}]: ${m.content}`).join("\n");
  logger.debug(`Prompt:\n${msgs}`);
}
