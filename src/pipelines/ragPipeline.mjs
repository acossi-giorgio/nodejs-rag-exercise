import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { env } from "../config/env.mjs";
import { getEmbeddings } from "../config/embeddings.mjs";
import { getQdrantVectorStore } from "../config/database.mjs";
import { getChatModel } from "../config/llm.mjs";
import { cleanRawResponse, logPrompt } from "../common/utils.mjs";
import { buildRagPrompt, formatChunks } from "../prompts/ragPrompt.mjs";
import { logger } from "../config/logger.mjs";

const llm = await getChatModel();

export async function runRagPipeline(question, sources = [], interactions = []) {
    logger.info("RAG pipeline start");

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
            logger.info("Retrieving chunks from vector store");
            const embeddings = await getEmbeddings();
            const vectorStore = await getQdrantVectorStore(embeddings);
            const raw = await vectorStore.similaritySearchWithScore(context.question, env.rag.nChunks);
            const chunks = raw
                .filter(([, score]) => score >= env.rag.threshold)
                .sort((a, b) => b[1] - a[1])
                .slice(0, env.rag.nChunks);
            return { ...context, chunks };
        }),
        RunnableLambda.from(async (context) => {
            logger.info("Generating answer with RAG context");
            const prompt = buildRagPrompt();
            const input = {
                question: context.question,
                context: formatChunks(context.chunks),
                history: context.history ?? [],
            };
            await logPrompt(prompt, input, context.history);
            const chain = prompt.pipe(llm).pipe(new StringOutputParser());
            const rawAnswer = await chain.invoke(input);
            logger.debug("Response", { rawAnswer });
            return { ...context, answer: cleanRawResponse(rawAnswer) };
        }),
    ]);

    const result = await pipeline.invoke({ question, sources, interactions });
    logger.info("RAG pipeline completed successfully");
    return {
        answer: result.answer,
        chunks: result.chunks,
    };
}
