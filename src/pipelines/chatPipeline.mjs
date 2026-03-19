import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { getChatModel } from "../config/llm.mjs";
import { cleanRawResponse, logPrompt } from "../common/utils.mjs";
import { buildChatPrompt } from "../prompts/chatPrompt.mjs";
import { logger } from "../config/logger.mjs";

const llm = await getChatModel();

export async function runChatPipeline(question, _sources = [], interactions = []) {
    logger.info("Chat pipeline start");

    const pipeline = RunnableSequence.from([
        RunnableLambda.from(async (context) => {
            logger.info("Building interaction history");
            const history = (context.interactions ?? []).flatMap((i) => [
                new HumanMessage(i.question ?? ""),
                new AIMessage(i.answer ?? ""),
            ]);
            return { ...context, history };
        }),
        RunnableLambda.from(async (context) => {
            logger.info("Generating answer (chat-only, no retrieval)");
            const prompt = buildChatPrompt();
            const input = {
                question: context.question,
                history: context.history ?? [],
            };
            await logPrompt(prompt, input, context.history);
            const chain = prompt.pipe(llm).pipe(new StringOutputParser());
            const rawAnswer = await chain.invoke(input);
            logger.debug("Response", { rawAnswer });
            return { ...context, answer: cleanRawResponse(rawAnswer) };
        }),
    ]);

    const result = await pipeline.invoke({ question, interactions });
    logger.info("Chat pipeline completed successfully");
    return {
        answer: result.answer,
    };
}
