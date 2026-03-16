import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getRewriterModel } from "../config/llm.mjs";
import { cleanRawResponse } from "../common/utils.mjs";

const REWRITE_SYSTEM_PROMPT = `
    You are a prompt rewriter for Retrieval-Augmented Generation.
    Output ONLY the corrected/optimized prompt as plain text.
    Rules:
    - Preserve user intent and meaning; fix grammar and clarity.
    - Do not invent facts or add constraints that aren't in the input.
    - Keep named entities explicit; expand ambiguous acronyms only if expanded in the input.
    - Prefer concise, unambiguous phrasing helpful for retrieval.
    - Keep the original language of the user.
    - NO preface, NO quotes, NO code fences, NO markdown, NO extra text.
`;

const REWRITE_HUMAN_TEMPLATE = `
    USER_PROMPT:
    {userPrompt}

    OPTIONAL_CONTEXT:
    {context}

    Return only the rewritten prompt as plain text.
`;

const llm = await getRewriterModel();

export async function rephraseAnswer(userPrompt, context) {
      const logPrefix = "| rephraseAnswer |";
  const prompt = ChatPromptTemplate.fromMessages([
    SystemMessagePromptTemplate.fromTemplate("{system}"),
    HumanMessagePromptTemplate.fromTemplate(REWRITE_HUMAN_TEMPLATE),
  ]);

  const chain = prompt.pipe(llm).pipe(new StringOutputParser());
  const raw = await chain.invoke({
    system: REWRITE_SYSTEM_PROMPT,
    userPrompt,
    context,
  });
  console.log(`${logPrefix} raw:`, raw);

  return cleanRawResponse(raw);
}