import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { formatDocs } from "../services/documentService.mjs";
import { env } from "../config/env.mjs";
import { getEmbeddings } from "../config/embeddings.mjs";
import { getQdrantVectorStore } from "../config/database.mjs";
import { generateAnswer as generateChatAnswer } from "../ai/chat.mjs";
import { rephraseAnswer } from "../ai/rephraser.mjs";
import { logger } from "../config/logger.mjs";


function buildHistory(interactions) {
    if (!Array.isArray(interactions) || interactions.length === 0) return [];
    return interactions.flatMap(interaction => {
        if (!interaction) return [];
        const q = interaction.question ?? "";
        const a = interaction.answer ?? "";
        return [new HumanMessage(q), new AIMessage(a)];
    });
}


export async function generateChatResponse(
    question,
    sources = [],
    interactions = []
) {
    logger.debug('Generate chat response start');

    logger.info('Rephrase user question');
    const rephrasedQuestion = await rephraseAnswer(question, "");
    logger.debug(`rephrasedQuestion: ${rephrasedQuestion}`);

    const history = buildHistory(interactions);
    const embeddings = await getEmbeddings();
    const vectorStore = await getQdrantVectorStore(embeddings);

    const nChunks = env.rag.nChunks || 5;

    logger.info(`Retrieve chunks from vector store`);
    let chunks = [];
    if (sources && Array.isArray(sources) && sources.length) {
        logger.info(`Performing vector searches for sources: ${sources.join(', ')}`);
        const searches = await Promise.all(
            sources.map(async (s) => {
                const filter = { must: [ { key: "metadata.source", match: { value: s } } ] };
                return await vectorStore.similaritySearchWithScore(rephrasedQuestion, nChunks, filter);
            })
        );
        chunks = searches.flat();
    } else {
        logger.info('Performing global vector search');
        chunks = await vectorStore.similaritySearchWithScore(rephrasedQuestion, nChunks);
    }

    const filtered = chunks.filter(([_, score]) => score >= env.rag.threshold);
    filtered.sort((a, b) => b[1] - a[1]);
    const topChunks = filtered.slice(0, env.rag?.nChunks);

    const context = formatDocs(topChunks);

    const answer = await generateChatAnswer({
        question: rephrasedQuestion,
        context,
        history,
    });

    return { rephrasedQuestion, answer, chunks: topChunks };
}