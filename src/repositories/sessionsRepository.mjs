import { env } from "../config/env.mjs";
import { constant } from "../config/constat.mjs";
import { ObjectId } from "mongodb";

function toObjectId(id) {
    if (!id) return null;
    if (id instanceof ObjectId) return id;
    if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
    return null;
}

export async function getSession(db, sessionId) {
    const sessions = db.collection(env.mongo.collections.sessions);
    const _id = toObjectId(sessionId);
    if (!_id) return null;
    const sess = await sessions.findOne({ _id });
    return sess;
}

export async function createSession(db) {
    const sessions = db.collection(env.mongo.collections.sessions);
    const now = new Date();
    const session = {
        createdAt: now,
        updatedAt: now
    };
    const result = await sessions.insertOne(session);
    return { _id: result.insertedId, ...session };
}

export async function updateSessionStatus(db, sessionId, status) {
    const sessions = db.collection(env.mongo.collections.sessions);
    const _id = toObjectId(sessionId);
    if (!_id) return;
    const patch = { status, updatedAt: new Date() };
    await sessions.updateOne({ _id }, { $set: patch });
    return;
}