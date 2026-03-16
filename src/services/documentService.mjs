import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";
import { getEmbeddings } from "../config/embeddings.mjs";
import { getQdrantVectorStore } from "../config/database.mjs";
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

export async function ingestDocument(name, buffer, mimeType, options = {}) {
  if (!buffer?.length) throw new Error("Uploaded document is empty");

  const {
    chunkSize = env.ingestion.chunkSize,
    chunkOverlap = env.ingestion.chunkOverlap,
    minChunkLen = env.ingestion.minChunkLen,
    maxSpecialRatio = env.ingestion.maxSpecialRatio
  } = options;

  const pdfDocs = await loadPdfDocuments(buffer, mimeType, name);
  if (!pdfDocs.length) throw new Error("Unable to extract content from the provided PDF document");

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  const chunks = await splitter.splitDocuments(pdfDocs);
  const filteredChunks = chunks.filter((chunk) => isValidChunk(chunk.pageContent, minChunkLen, maxSpecialRatio));

  const finalDocs = filteredChunks.map((doc) => {
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        [constant.documentMetadata.source]:
          doc.metadata?.[constant.documentMetadata.source] ?? name,
        [constant.documentMetadata.page]:
          doc.metadata?.[constant.documentMetadata.page] ?? 0,
      },
    });
  });

  if (!finalDocs.length) throw new Error("No valid content chunks were produced from the document.");

  const embeddings = await getEmbeddings();
  const vectorStore = await getQdrantVectorStore(embeddings);

  for (let i = 0; i < finalDocs.length; i += env.ingestion.qdrantBatch) {
    const slice = finalDocs.slice(i, i + env.ingestion.qdrantBatch);
    await vectorStore.addDocuments(slice);
    logger.info(`| uploadDocument | Ingested ${Math.min(i + env.ingestion.qdrantBatch, finalDocs.length)} / ${finalDocs.length} chunks to Qdrant`);
  }

  return {
    name: name,
    pages: pdfDocs.length,
    rawChunks: chunks.length,
    filteredChunks: filteredChunks.length,
    ingestedChunks: finalDocs.length,
  };
}

export function formatDocs(scored) {
  if (!scored?.length) return "N/A";
  return scored
    .map(([doc, score], i) => {
        const meta = doc.metadata || {};
        const source = meta.source ? `Source: ${meta.source}` : null;
        const page = meta.page ? `Page: ${meta.page}` : null;
        const metaStr = [source, page].filter(Boolean).join(" | ");
        
        return `[Document ${i + 1}] (Relevance: ${score.toFixed(2)})\n${metaStr ? `Metadata: ${metaStr}\n` : ""}Content:\n${doc.pageContent?.trim()}`;
    })
    .join("\n");
}