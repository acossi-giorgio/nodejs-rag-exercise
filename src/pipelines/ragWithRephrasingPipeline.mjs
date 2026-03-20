import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { env } from "../config/env.mjs";
import { getEmbeddings } from "../config/embeddings.mjs";
import { getQdrantVectorStore } from "../config/database.mjs";
import { getChatModel, getRewriterModel } from "../config/llm.mjs";
import { cleanRawResponse, logPrompt } from "../common/utils.mjs";
import { buildRagPrompt, formatChunks } from "../prompts/ragPrompt.mjs";
import { buildRewriterPrompt } from "../prompts/rewriterPrompt.mjs";
import { logger } from "../config/logger.mjs";

const llm = await getChatModel();
const rewriter = await getRewriterModel();

export async function runRagWithRephrasingPipeline(question, sources = [], interactions = []) {
    logger.info("RAG with rephrasing pipeline start");

    logger.info("Building interaction history");
    const history = interactions.flatMap((i) => [
        new HumanMessage(i.question ?? ""),
        new AIMessage(i.answer ?? ""),
    ]);

    logger.info("Rewriting query for retrieval");
    const rewriterPrompt = buildRewriterPrompt();
    const rewrittenQuestion = await rewriterPrompt
        .pipe(rewriter)
        .pipe(new StringOutputParser())
        .invoke({ question, history });
    logger.debug("Query rewrite", { original: question, rewritten: rewrittenQuestion });

    logger.info("Retrieving chunks from vector store");
    const embeddings = await getEmbeddings();
    const vectorStore = await getQdrantVectorStore(embeddings);
    const raw = await vectorStore.similaritySearchWithScore(rewrittenQuestion, env.rag.nChunks);
    const chunks = raw
        .filter(([, score]) => score >= env.rag.threshold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, env.rag.nChunks);

    logger.info("Generating answer with RAG context");
    const prompt = buildRagPrompt();
    const input = { question, context: formatChunks(chunks), history };
    await logPrompt(prompt, input, history);
    const rawAnswer = await prompt
        .pipe(llm)
        .pipe(new StringOutputParser())
        .invoke(input);
    logger.debug("Response", { rawAnswer });

    logger.info("RAG with rephrasing pipeline completed successfully");
    return {
        answer: cleanRawResponse(rawAnswer),
        rewrittenQuestion,
        chunks,
    };
}
