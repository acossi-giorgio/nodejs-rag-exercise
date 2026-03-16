import { constant } from "../config/constat.mjs";
import { getMongoDb } from "../config/database.mjs";
import { createInteraction, getInteractions } from "../repositories/interactionsRepository.mjs";
import { getSession, createSession } from "../repositories/sessionsRepository.mjs";
import { validateInteractionRequest } from "../schemas/interactionSchema.mjs";
import { generateChatResponse } from "../services/aiService.mjs";
import { getDocuments } from "../repositories/documentRepository.mjs";
import { env } from "../config/env.mjs";
import { logger } from "../config/logger.mjs";


export async function interactionHandler(req, res) {
    const logPrefix = "| interactionHandler |";
    try {
        logger.info(`${logPrefix} Ask interaction request received`);
        const body = req.body || {};
        const { valid, errors } = validateInteractionRequest(body);
        if (!valid) return res.status(400).json({ error: "Invalid request body", details: errors });
        const { sessionId, question } = body;
        const db = await getMongoDb();

        let session;
        if (!sessionId){
            session = await createSession(db);
            logger.info(`${logPrefix} Created new session with ID ${session._id}`);
        } else {
            session = await getSession(db, sessionId);
            logger.info(`${logPrefix} Retrieved session with ID ${session._id}`);
        }

        const interactions = await getInteractions(db, session._id, env.rag.nHistory);
        const documents = await getDocuments(db);
        const sources = documents.map(doc => doc.name);

        let payload = {};
    
        logger.info(`${logPrefix} Performing RAG interaction`);
        const { rephrasedQuestion, answer, chunks } = await generateChatResponse(
            question,
            sources,
            interactions
        );

        await createInteraction(db, session._id, question, rephrasedQuestion, answer, chunks);

        payload = { question, rephrasedQuestion, answer, chunks };
    
        logger.info(`${logPrefix} Interaction processed successfully`);
        return res.status(200).json(payload);
    } catch (err) {
        logger.error(`${logPrefix} ${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}