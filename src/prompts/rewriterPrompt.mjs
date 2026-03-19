import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

const SYSTEM_PROMPT_TEMPLATE = `
You are a search query optimizer.
Your only job is to rewrite the user question into a clear, self-contained search query optimized for semantic vector search.

## Rules
- Output ONLY the rewritten query. No explanations, no preamble, no extra text.
- Make the query specific and keyword-rich.
- If the conversation history provides context (e.g. "what about that?", "and for the other one?"), resolve any reference into an explicit standalone query.
- Do NOT answer the question. Only rewrite it.
- Keep it concise: 1-2 sentences maximum.
- If the question is already clear and standalone, return it unchanged.
`;

const HUMAN_TEMPLATE = `{question}`;

export function buildRewriterPrompt() {
  return ChatPromptTemplate.fromMessages([
    ["system", SYSTEM_PROMPT_TEMPLATE],
    new MessagesPlaceholder("history"),
    ["human", HUMAN_TEMPLATE],
  ]);
}
