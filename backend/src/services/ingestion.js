import { Document } from '../models/index.js';
import { config } from '../config/index.js';
import { ChromaClient } from 'chromadb';
import { Ollama } from 'ollama';
import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const ollama = new Ollama({ host: 'http://localhost:11434' });

const SUBJECT_CHUNK_CONFIG = {
  'Engineering': { chunkSize: 800, overlap: 100 },
  'Life Sciences': { chunkSize: 1500, overlap: 200 },
  'Business': { chunkSize: 1500, overlap: 200 },
  'Law': { chunkSize: 1800, overlap: 200 },
  'Creative': { chunkSize: 1800, overlap: 200 },
  'default': { chunkSize: 1500, overlap: 200 },
};

function getChunkConfig(subject) {
  if (SUBJECT_CHUNK_CONFIG[subject]) {
    return SUBJECT_CHUNK_CONFIG[subject];
  }
  
  for (const [category, config] of Object.entries(SUBJECT_CHUNK_CONFIG)) {
    if (subject.toLowerCase().includes(category.toLowerCase())) {
      return config;
    }
  }
  
  return SUBJECT_CHUNK_CONFIG.default;
}

function getSubjectCategory(subject) {
  const subjectToCategory = {
    'Computer Engineering': 'Engineering',
    'Computer Science': 'Engineering',
    'Information Technology': 'Engineering',
    'Electronics': 'Engineering',
    'Electrical': 'Engineering',
    'Mechanical': 'Engineering',
    'Civil': 'Engineering',
    'Chemical': 'Engineering',
    'Biotechnology': 'Life Sciences',
    'Pharmacy': 'Life Sciences',
    'Microbiology': 'Life Sciences',
    'Pharmacology': 'Life Sciences',
    'Business Administration': 'Business',
    'Commerce': 'Business',
    'Management': 'Business',
    'Law': 'Law',
    'Legal Studies': 'Law',
    'Fine Arts': 'Creative',
    'Design': 'Creative',
    'Architecture': 'Creative',
    'Literature': 'Creative',
    'Humanities': 'Creative',
  };
  
  return subjectToCategory[subject] || 'Engineering';
}

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
  const subject = options?.subject;
  const config = getChunkConfig(subject);
  const { chunkSize = config.chunkSize, overlap = config.overlap } = options;
  const chunks = [];
  let start = 0;
  
  if (!text || text.length === 0) {
    return chunks;
  }
  
  const maxTextLength = 50000;
  if (text.length > maxTextLength) {
    text = text.slice(0, maxTextLength);
  }
  
  const maxChunks = 1000;
  let prevStart = -1;
  
  while (start < text.length && chunks.length < maxChunks) {
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

    const nextStart = end - overlap;
    if (nextStart <= start) {
      start = start + chunkSize;
    } else {
      start = nextStart;
    }
    
    if (start >= text.length || start < 0) break;
  }

  return chunks;
}

async function extractText(filePath, fileType) {
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

async function generateEmbeddings(texts) {
  const embeddings = [];
  for (const text of texts) {
    const response = await ollama.embeddings({
      model: 'bge-m3',
      prompt: text,
    });
    embeddings.push(response.embedding);
  }
  return embeddings;
}

export async function processDocumentWithText(documentId, text) {
  let document = await Document.findById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  try {
    const chunks = chunkText(text, { subject: document.subject });

    if (chunks.length === 0) {
      throw new Error('No valid chunks extracted from document');
    }

    const embeddings = await generateEmbeddings(chunks);

    const collection = await getCollection();

    const ids = chunks.map((_, i) => `${documentId}-${i}`);
    const filename = document.title || `teacher-response-${documentId}`;
    const metadatas = chunks.map((chunk, i) => ({
      documentId: documentId.toString(),
      college: document.college,
      department: document.department,
      subject: document.subject,
      semester: document.semester,
      unit: document.unit || '',
      chunkIndex: i,
      sourceDoc: filename,
      page: i + 1,
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

export async function deleteDocumentChunks(documentId) {
  const collection = await getCollection();
  try {
    await collection.delete({
      where: { documentId: documentId.toString() },
    });
    console.log(`Deleted chunks for document ${documentId}`);
  } catch (error) {
    console.error(`Error deleting chunks for document ${documentId}:`, error);
    throw error;
  }
}

export async function processDocument(documentId) {
  let document = await Document.findById(documentId);
  if (!document) {
    throw new Error('Document not found');
  }

  try {
    const text = await extractText(document.fileUrl, document.fileType);
    const chunks = chunkText(text, { subject: document.subject });

    if (chunks.length === 0) {
      throw new Error('No valid chunks extracted from document');
    }

    const embeddings = await generateEmbeddings(chunks);

    const collection = await getCollection();

    const ids = chunks.map((_, i) => `${documentId}-${i}`);
    const metadatas = chunks.map((chunk, i) => ({
      documentId: documentId.toString(),
      college: document.college,
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

export async function searchChunks(query, filters = {}, topK = 6) {
  const collection = await getCollection();
  
  const whereConditions = [];
  if (filters.college) whereConditions.push({ college: { $eq: filters.college } });
  if (filters.department) whereConditions.push({ department: { $eq: filters.department } });
  if (filters.subject) whereConditions.push({ subject: { $eq: filters.subject } });
  if (filters.semester) whereConditions.push({ semester: { $eq: filters.semester } });

  const where = whereConditions.length === 1 ? whereConditions[0] : 
                whereConditions.length > 1 ? { $and: whereConditions } : {};

  const queryEmbedding = await generateEmbeddings([query]);
  
  const results = await collection.query({
    queryEmbeddings: queryEmbedding,
    nResults: topK,
    where: whereConditions.length > 0 ? where : undefined,
  });

  if (!results.documents || !results.documents[0] || results.documents[0].length === 0) {
    return [];
  }

  const documents = results.documents[0];
  const metadatas = results.metadatas[0];
  const distances = results.distances[0];

  return documents.map((text, i) => {
    const distance = distances[i];
    // Convert Euclidean distance to similarity score (0-1 range)
    // For normalized embeddings, max distance is ~2, but actual distances can be larger
    const score = Math.max(0, 1 - distance / 1000);
    return {
      text,
      metadata: metadatas[i],
      score,
    };
  });
}