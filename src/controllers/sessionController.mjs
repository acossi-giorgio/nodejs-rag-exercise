import { getMongoDb } from "../config/database.mjs";
import { createSession } from "../repositories/sessionsRepository.mjs";
import { logger } from "../config/logger.mjs";

export async function startSessionHandler(req, res) {
    const logPrefix = "| startSessionHandler |";
    try {
    logger.info(`${logPrefix} Start session request received`);
        const db = await getMongoDb();
        const sessionId = await createSession(db);
        logger.info(`${logPrefix} Session ${sessionId} started successfully`);
        return res.status(201).json({ sessionId });
    } catch (err) {
        logger.error(`${logPrefix} ${err?.name} ${err?.message}`, { stack: err?.stack });
        return res.status(500).json({ error: "Internal Server Error" });
    }
}