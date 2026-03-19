import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../config/llm.mjs";
import { cleanRawResponse, logPrompt } from "../common/utils.mjs";
import { buildChatPrompt } from "../prompts/chatPrompt.mjs";
import { logger } from "../config/logger.mjs";

const llm = await getChatModel();

export async function runChatPipeline(question, _sources = [], interactions = []) {
    logger.info("Chat pipeline start");

    logger.info("Building interaction history");
    const history = interactions.flatMap((i) => [
        new HumanMessage(i.question ?? ""),
        new AIMessage(i.answer ?? ""),
    ]);

    logger.info("Generating answer (chat-only, no retrieval)");
    const prompt = buildChatPrompt();
    const input = { question, history };
    await logPrompt(prompt, input, history);
    const rawAnswer = await prompt.pipe(llm).pipe(new StringOutputParser()).invoke(input);
    logger.debug("Response", { rawAnswer });

    logger.info("Chat pipeline completed successfully");
    return { answer: cleanRawResponse(rawAnswer) };
}
