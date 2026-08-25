import { Document } from '../models/index.js';
import { config } from '../config/index.js';
import { ChromaClient } from 'chromadb';
import ollama from 'ollama';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const chroma = new ChromaClient({ path: config.chromaUrl });
const COLLECTION_NAME = 'pu-gpt-documents';

async function getCollection() {
  try {
    return await chroma.getCollection({ name: COLLECTION_NAME });
  } catch {
    return await chroma.createCollection({ name: COLLECTION_NAME });
  }
}

function chunkText(text, options = {}) {
  const { chunkSize = 800, overlap = 100 } = options;
  const chunks = [];
  let start = 0;
  
  // Safety check for empty or very large text
  if (!text || text.length === 0) {
    return chunks;
  }
  
  // Cap text length to prevent memory issues
  const maxTextLength = 50000; // 50KB max
  if (text.length > maxTextLength) {
    text = text.slice(0, maxTextLength);
  }
  
  // Maximum chunks to prevent runaway loops
  const maxChunks = 1000;
  
  let prevStart = -1;
  while (start < text.length && chunks.length < maxChunks) {
    // Safety: prevent infinite loop if start doesn't advance
    if (start <= prevStart) {
      console.error('ChunkText: start not advancing, breaking');
      break;
    }
    prevStart = start;
    
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    // Ensure end > start
    if (end <= start) {
      end = Math.min(start + chunkSize, text.length);
    }
    if (end <= start) {
      break;
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) {
      chunks.push(chunk);
    }

    // Ensure start advances
    const nextStart = end - overlap;
    if (nextStart <= start) {
      start = start + chunkSize; // Force advance by at least chunkSize
    } else {
      start = nextStart;
    }
    
    if (start >= text.length || start < 0) break;
  }

  return chunks;
}

async function extractText(filePath, fileType) {
  // Handle teacher-generated content
  if (filePath === 'teacher-response') {
    throw new Error('Teacher response should use processDocumentWithText');
  }

  const buffer = await fs.readFile(filePath);

  if (fileType === 'application/pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (fileType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export async function processDocumentWithText(documentId, text) {
  let document = await Document.findById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  try {
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error('No valid chunks extracted from document');
    }

    const embeddings = await generateEmbeddings(chunks);

    const collection = await getCollection();

    const ids = chunks.map((_, i) => `${documentId}-${i}`);
    const metadatas = chunks.map((chunk, i) => ({
      documentId: documentId.toString(),
      department: document.department,
      subject: document.subject,
      semester: document.semester,
      unit: document.unit || '',
      chunkIndex: i,
      text: chunk.slice(0, 500),
    }));

    await collection.add({
      ids,
      embeddings,
      documents: chunks,
      metadatas,
    });

    document.status = 'indexed';
    document.chunkCount = chunks.length;
    document.indexedAt = new Date();
    await document.save();

    console.log(`Document ${documentId} indexed with ${chunks.length} chunks`);
  } catch (error) {
    document.status = 'failed';
    document.errorMessage = error.message;
    await document.save();
    throw error;
  }
}

function normalizeVector(vec) {
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? vec.map(v => v / norm) : vec;
}

async function generateEmbeddings(texts) {
  const embeddings = [];
  const batchSize = 5; // Process in small batches to avoid OOM
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    for (const text of batch) {
      const response = await ollama.embeddings({
        model: 'bge-m3:latest',
        prompt: text,
      });
      embeddings.push(normalizeVector(response.embedding));
    }
    // Allow GC between batches
    if (global.gc) global.gc();
  }
  return embeddings;
}

export async function processDocument(documentId) {
  let document = await Document.findById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  try {
    const text = await extractText(document.fileUrl, document.fileType);
    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error('No valid chunks extracted from document');
    }

    const embeddings = await generateEmbeddings(chunks);

    const collection = await getCollection();

    const ids = chunks.map((_, i) => `${documentId}-${i}`);
    const metadatas = chunks.map((chunk, i) => ({
      documentId: documentId.toString(),
      department: document.department,
      subject: document.subject,
      semester: document.semester,
      unit: document.unit || '',
      chunkIndex: i,
      text: chunk.slice(0, 500),
    }));

    await collection.add({
      ids,
      embeddings,
      documents: chunks,
      metadatas,
    });

    document.status = 'indexed';
    document.chunkCount = chunks.length;
    document.indexedAt = new Date();
    await document.save();

    console.log(`Document ${documentId} indexed with ${chunks.length} chunks`);
  } catch (error) {
    document.status = 'failed';
    document.errorMessage = error.message;
    await document.save();
    throw error;
  }
}

export async function searchChunks(query, filters = {}, topK = 5) {
  const collection = await getCollection();
  const queryEmbedding = (await ollama.embeddings({
    model: 'bge-m3:latest',
    prompt: query,
  })).embedding;
  
  // Normalize query embedding to match stored vectors
  const norm = Math.sqrt(queryEmbedding.reduce((sum, v) => sum + v * v, 0));
  const normalizedQuery = norm > 0 ? queryEmbedding.map(v => v / norm) : queryEmbedding;

  const where = {};
  if (filters.department) where.department = filters.department;
  if (filters.subject) where.subject = filters.subject;
  if (filters.semester) where.semester = filters.semester;

  const results = await collection.query({
    queryEmbeddings: [normalizedQuery],
    nResults: topK,
    where: Object.keys(where).length > 0 ? where : undefined,
    include: ['documents', 'metadatas', 'distances'],
  });

  return results.documents[0].map((doc, i) => ({
    text: doc,
    metadata: results.metadatas[0][i],
    distance: results.distances[0][i],
    score: 1 - results.distances[0][i],
  }));
}

export async function deleteDocumentChunks(documentId) {
  const collection = await getCollection();
  try {
    await collection.delete({
      where: { documentId: documentId.toString() },
    });
  } catch (error) {
    console.warn('Failed to delete document chunks:', error.message);
  }
}