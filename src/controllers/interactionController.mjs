import { getMongoDb } from "../config/database.mjs";
import { createInteraction, getInteractions } from "../repositories/interactionsRepository.mjs";
import { getSession, createSession } from "../repositories/sessionsRepository.mjs";
import { validateInteractionRequest } from "../schemas/interactionSchema.mjs";
import { getPipeline } from "../services/pipelineService.mjs";
import { getDocuments } from "../repositories/documentRepository.mjs";
import { env } from "../config/env.mjs";
import { logger } from "../config/logger.mjs";


export async function interactionHandler(req, res) {
    try {
        logger.info(`Ask interaction request received`);
        const body = req.body || {};
        const { valid, errors } = validateInteractionRequest(body);
        if (!valid) return res.status(400).json({ error: "Invalid request body", details: errors });
        const { sessionId, question, type } = body;
        const db = await getMongoDb();

        let session;
        if (!sessionId){
            session = await createSession(db);
            logger.info(`Created new session with ID ${session._id}`);
        } else {
            session = await getSession(db, sessionId);
            logger.info(`Retrieved session with ID ${session._id}`);
        }

        const interactions = await getInteractions(db, session._id, env.rag.nHistory);
        const documents = await getDocuments(db);
        const sources = documents.map(doc => doc.name);

        let payload = {};
    
        logger.info(`Performing ${type} pipeline interaction`);
        let pipeline;

        pipeline = getPipeline(type);
        if(!pipeline) {
            logger.warn(`Invalid pipeline type: ${type}`);
            return res.status(400).json({ error: `Invalid pipeline type: ${type}` });
        }
        const result = await pipeline(
            question,
            sources,
            interactions
        );
        await createInteraction(db, session._id, question, result);
        payload = { sessionId: session._id, question, ...result };
        logger.info(`Interaction processed successfully`);
        return res.status(200).json(payload);
    } catch (err) {
        logger.error(`${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}