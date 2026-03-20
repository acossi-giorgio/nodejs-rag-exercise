import { logger } from "../config/logger.mjs";
import { getMongoDb } from "../config/database.mjs";
import { createDocument, getDocument, deleteDocument } from "../repositories/documentRepository.mjs";
import { validateUploadDocument } from "../schemas/documentSchema.mjs";
import { ingestDocument, deleteDocumentVectors } from "../services/documentService.mjs";
import { sanitizeDocumentName } from "../common/utils.mjs";

export async function uploadDocumentHandler(req, res) {
  try {
    logger.info(`Upload document request received`);
    let payload = req.file;
    const body = req.body || {};

    const db = await getMongoDb();
    const { valid, errors } = validateUploadDocument(payload, body);
    if (!valid) return res.status(400).json({ error: "Invalid request", details: errors });

    const sanitizedName = sanitizeDocumentName(payload.originalname);

    const existingDoc = await getDocument(db, sanitizedName);
    if (existingDoc)
      return res.status(400).json({ error: "Document already exists" });

    const options = {
      chunkSize: body.chunkSize ? parseInt(body.chunkSize) : undefined,
      chunkOverlap: body.chunkOverlap ? parseInt(body.chunkOverlap) : undefined,
      minChunkLen: body.minChunkLen ? parseInt(body.minChunkLen) : undefined,
      maxSpecialRatio: body.maxSpecialRatio ? parseFloat(body.maxSpecialRatio) : undefined,
    };

    Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);

    const ingestionResult = await ingestDocument(
      sanitizedName,
      payload.buffer,
      payload.mimetype,
      options
    );

    const insertedId = await createDocument(db, sanitizedName);

    logger.info(`Document '${ingestionResult.name}' ingested successfully`);
    return res.status(201).json({
      id: insertedId?.toString(),
      name: ingestionResult.name,
      stats: {
        pages: ingestionResult.pages,
        rawChunks: ingestionResult.rawChunks,
        filteredChunks: ingestionResult.filteredChunks,
        ingestedChunks: ingestionResult.ingestedChunks,
      },
    });
  } catch (err) {
    logger.error(`${err?.name} ${err?.message}`, { stack: err?.stack });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function deleteDocumentHandler(req, res) {
  try {
    let name = req.params.name;
    if (!name) return res.status(400).json({ error: "Document name is required" });

    const sanitizedName = sanitizeDocumentName(name);
    const db = await getMongoDb();
    const existingDoc = await getDocument(db, sanitizedName);
    if (!existingDoc) return res.status(404).json({ error: "Document not found" });

    await deleteDocumentVectors(sanitizedName);
    await deleteDocument(db, sanitizedName);

    logger.info(`Document '${sanitizedName}' deleted successfully`);
    return res.status(200).json({ message: "Document deleted successfully", name: sanitizedName });
  } catch (err) {
    logger.error(`${err?.name} ${err?.message}`, { stack: err?.stack });
    return res.status(500).json({ error: "Internal Server Error" });
  }
}