import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { v4 as uuid } from "uuid";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "../config/embeddings.mjs";
import { getQdrantVectorStore, getQdrantClient } from "../config/database.mjs";
import { constant } from "../config/constat.mjs";
import { logger } from "../config/logger.mjs";
import { env } from "../config/env.mjs";


function isValidChunk(content, minChunkLen, maxSpecialRatio) {
  if (!content) return false;
  if (content.length < minChunkLen) return false;
  const specials = content.match(/[^A-Za-z0-9\s.,;:'"()?!\-]/g);
  if (specials) {
    const ratio = specials.length / content.length;
    if (ratio > maxSpecialRatio) return false;
  }
  return true;
}

function normalizeDocuments(rawDocs, sourceName) {
  return rawDocs.map((doc) => {
    const page =
      doc.metadata?.loc?.pageNumber ??
      doc.metadata?.page ??
      doc.metadata?.pdf?.pageNumber ??
      0;
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        [constant.documentMetadata.source]: sourceName,
        [constant.documentMetadata.page]: Number(page) || 0,
      },
    });
  });
}

async function loadPdfDocuments(buffer, mimeType, sourceName) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "upload-"));
  const tmpPath = path.join(tmpDir, sourceName);
  try {
    await fs.writeFile(tmpPath, buffer);
    const loader = new PDFLoader(tmpPath, { splitPages: true });
    const docs = await loader.load();
    return normalizeDocuments(docs, sourceName);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function loadTextDocuments(buffer, sourceName) {
  const text = buffer.toString("utf-8");
  if (!text.trim()) throw new Error("Text file is empty");
  const doc = new Document({
    pageContent: text,
    metadata: {
      [constant.documentMetadata.source]: sourceName,
      [constant.documentMetadata.page]: 0,
    },
  });
  return [doc];
}

async function loadDocuments(buffer, mimeType, sourceName) {
  if (mimeType === "application/pdf") return loadPdfDocuments(buffer, mimeType, sourceName);
  if (mimeType === "text/plain") return loadTextDocuments(buffer, sourceName);
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

export async function ingestDocument(name, buffer, mimeType, options = {}) {
  if (!buffer?.length) throw new Error("Uploaded document is empty");

  const {
    chunkSize = env.ingestion.chunkSize,
    chunkOverlap = env.ingestion.chunkOverlap,
    minChunkLen = env.ingestion.minChunkLen,
    maxSpecialRatio = env.ingestion.maxSpecialRatio
  } = options;

  const rawDocs = await loadDocuments(buffer, mimeType, name);
  if (!rawDocs.length) throw new Error("Unable to extract content from the provided document");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks = await splitter.splitDocuments(rawDocs);
  const filteredChunks = chunks.filter((chunk) => isValidChunk(chunk.pageContent, minChunkLen, maxSpecialRatio));

  const finalDocs = filteredChunks.map((doc) => {
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        [constant.documentMetadata.source]: doc.metadata?.[constant.documentMetadata.source] ?? name,
        [constant.documentMetadata.page]: doc.metadata?.[constant.documentMetadata.page] ?? 0,
        [constant.documentMetadata.chunkId]: uuid(),
      },
    });
  });

  if (!finalDocs.length) throw new Error("No valid content chunks were produced from the document.");

  const embeddings = await getEmbeddings();
  const vectorStore = await getQdrantVectorStore(embeddings);

  for (let i = 0; i < finalDocs.length; i += env.ingestion.qdrantBatch) {
    const slice = finalDocs.slice(i, i + env.ingestion.qdrantBatch);
    await vectorStore.addDocuments(slice);
    logger.info(`Ingested ${Math.min(i + env.ingestion.qdrantBatch, finalDocs.length)} / ${finalDocs.length} chunks to Qdrant`);
  }

  return {
    name: name,
    pages: rawDocs.length,
    rawChunks: chunks.length,
    filteredChunks: filteredChunks.length,
    ingestedChunks: finalDocs.length,
  };
}

export async function deleteDocumentVectors(name) {
  const client = getQdrantClient();
  await client.delete(env.qdrant.collection, {
    wait: true,
    filter: {
      must: [{
        key: constant.documentMetadata.source,
        match: { value: name },
      }],
    },
  });
}