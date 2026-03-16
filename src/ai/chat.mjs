import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../config/llm.mjs";
import { cleanRawResponse } from "../common/utils.mjs";

const SYSTEM_PROMPT_TEMPLATE = `
  You are a helpful and knowledgeable AI Assistant.

  ### STRICT PROHIBITIONS (READ CAREFULLY):
  1.  **NO CITATIONS**: You must **NEVER** mention "Document 1", "The context", "The provided text", "The documents", or "retrieved information".
  2.  **NO SUMMARIES**: Do **NOT** provide a summary of the documents if the user hasn't asked for one.
  3.  **NO META-TALK**: Do not explain where you got your information. Present it as your own knowledge.
  4.  **NO OPENING PHRASES**: You must **NEVER** start your response with "Based on the context provided", "According to the information", or similar phrases. Start directly with the answer.

  ### INSTRUCTIONS:
  1.  **Role**: Act as a knowledgeable, helpful, and professional assistant. Answer questions across various topics.
  2.  **Language**: Respond ONLY in English. Use clear, concise language appropriate for the user.
  3.  **Using Information**:
      -   Use the provided CONTEXT to answer the user's question accurately.
      -   Integrate the information naturally into your response.
      -   If the CONTEXT is irrelevant, ignore it and use your internal knowledge.
  4.  **Missing Question**: If the user's input is empty or unclear, simply ask: "How can I help you today?" Do NOT summarize the context.
  5.  **Response Format**:
      -   **Reasoning**: If you perform any internal reasoning, you **MUST** enclose it within \`<think>...</think>\` tags.
      -   **Style**: Use a natural, conversational style. **Avoid using bullet points**. Write in complete paragraphs. Only use lists if strictly necessary for readability.
      -   **Structure**: Start directly with the answer.
      -   **Format**: Use **Markdown**.
      -   **Tone**: Helpful, professional, and friendly.

  ### DISCLAIMER:
  Remember that I am an AI assistant and my responses are based on available information and should be verified when needed.
`;

const PROMPT_TEMPLATE = `
	QUESTION:
	{question}

	CONTEXT (retrieved):
	{context}

  STRICT PROHIBITIONS (READ CAREFULLY):
  1.  **NO CITATIONS**: You must **NEVER** mention "Document 1", "The context", "The provided text", "The documents", or "retrieved information".
  2.  **NO SUMMARIES**: Do **NOT** provide a summary of the documents if the user hasn't asked for one.
  3.  **NO META-TALK**: Do not explain where you got your information. Present it as your own knowledge.
  4.  **NO OPENING PHRASES**: You must **NEVER** start your response with "Based on the context provided", "According to the information", or similar phrases. Start directly with the answer.

  **Reasoning**: If you perform any internal reasoning, you **MUST** enclose it within \`<think>...</think>\` tags.
`;

const llm = await getChatModel();

export async function generateAnswer({ question, context, history }) {
	const prompt = ChatPromptTemplate.fromMessages([
		SystemMessagePromptTemplate.fromTemplate(SYSTEM_PROMPT_TEMPLATE),
		new MessagesPlaceholder("history"),
		HumanMessagePromptTemplate.fromTemplate(PROMPT_TEMPLATE),
	]);
	const chain = prompt.pipe(llm).pipe(new StringOutputParser());
	const rawAnswer = await chain.invoke({
		question,
		context: context || "N/A",
		history: history || [],
	});
	const cleanedAnswer = cleanRawResponse(rawAnswer);
	return cleanedAnswer;
}