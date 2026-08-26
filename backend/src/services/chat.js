import ollama from 'ollama';
import { searchChunks } from './ingestion.js';
import { Conversation, FlaggedQuestion } from '../models/index.js';

const LLM_MODEL = 'qwen2.5:3b-instruct-q4_K_M';

const SYSTEM_PROMPT = `You are the course assistant for {department} at Parul University, helping students
with {subject} ({semester}). Answer strictly from the retrieved course material below —
do not use outside knowledge, even if you know the answer.

RETRIEVED CONTEXT:
{retrieved_chunks}

STUDENT QUESTION:
{student_question}

RULES:
1. Answer only using the retrieved context. If it doesn't contain enough information,
   say so plainly rather than guessing.
2. Cite every factual claim: [Source: {filename}, p.{page}].
3. **Provide detailed, thorough explanations** — include all relevant details from the context. Don't be brief; students need complete understanding.
4. When comparing concepts (e.g., StringBuffer vs StringBuilder), include the full comparison.
4. Format with Markdown; use LaTeX (\\( \\) inline, \\[ \\] block) for any math notation.`;

const MATH_SCIENCE_KEYWORDS = [
  'calculate', 'solve', 'equation', 'formula', 'derivative', 'integral',
  'theorem', 'proof', 'algorithm', 'code', 'program', 'function',
  'physics', 'chemistry', 'biology', 'mathematics', 'math',
  'compute', 'evaluate', 'simplify', 'factor', 'matrix', 'vector',
  'probability', 'statistics', 'regression', 'optimization',
];

function needsPhi4Routing(question, subject) {
  return false; // Single model only
}

async function callLLM(question, context, department, subject, semester) {
  // Build context with source info for citations
  const contextChunks = context.map((c, i) => {
    const filename = c.metadata?.sourceDoc || c.metadata?.documentId || 'unknown';
    const page = c.metadata?.page || c.metadata?.chunkIndex || 'N/A';
    return `[Source: ${filename}, p.${page}]\n${c.text}`;
  }).join('\n\n');

  const systemPrompt = SYSTEM_PROMPT
    .replace('{department}', department)
    .replace('{subject}', subject)
    .replace('{semester}', semester)
    .replace('{retrieved_chunks}', contextChunks)
    .replace('{student_question}', question);

  const response = await ollama.chat({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    options: { 
      temperature: 0.2,
      num_predict: 1000,
      num_ctx: 4096,
      keep_alive: -1,
    },
    stream: true,
  });

  return response;
}

function extractCitations(answer, context) {
  const citationRegex = /\[Source: ([^\],]+), p\.([^\]]+)\]/g;
  const citations = [];
  let match;
  
  while ((match = citationRegex.exec(answer)) !== null) {
    const filename = match[1];
    const page = match[2];
    // Find matching context
    const matchingContext = context.find(c => {
      const metaFilename = c.metadata?.sourceDoc || c.metadata?.documentId || '';
      const metaPage = c.metadata?.page || c.metadata?.chunkIndex;
      return metaFilename === filename && String(metaPage) === String(page);
    });
    if (matchingContext) {
      citations.push({
        chunkId: `${matchingContext.metadata.documentId}-${matchingContext.metadata.chunkIndex}`,
        documentId: matchingContext.metadata.documentId,
        excerpt: matchingContext.text.slice(0, 300),
        page: matchingContext.metadata.page || matchingContext.metadata.chunkIndex,
        score: matchingContext.score,
      });
    }
  }
  
  return citations;
}

export async function processChatQuestion(studentId, question, subject, conversationId = null) {
  const filters = { subject };
  const context = await searchChunks(question, filters, 6); // top-k = 6 for more comprehensive context

  // Filter out low relevance results (distance > 1.5 = score < -0.5)
  const relevantContext = context.filter(c => c.score > -0.5);
  
  if (relevantContext.length === 0) {
    const flagged = await FlaggedQuestion.create({
      studentId,
      question,
      subject,
      reason: context.length === 0 ? 'empty_context' : 'low_confidence',
      conversationId,
    });
    
    return {
      escalated: true,
      flaggedId: flagged._id,
      message: "I don't have enough from your course material to answer this confidently — I've passed it to your instructor.",
    };
  }

  const stream = await callLLM(question, relevantContext, 'Computer Science Engineering', subject, '1');
  
  return {
    escalated: false,
    stream,
    context: relevantContext,
  };
}

export async function saveConversation(studentId, subject, messages, conversationId = null) {
  if (conversationId) {
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.messages = messages;
      conversation.updatedAt = new Date();
      if (!conversation.title && messages.length > 0) {
        conversation.title = messages[0].content.slice(0, 50);
      }
      await conversation.save();
      return conversation;
    }
  }

  const conversation = await Conversation.create({
    studentId,
    subject,
    messages,
    title: messages[0]?.content.slice(0, 50) || 'New Conversation',
  });
  
  return conversation;
}

export async function getConversationHistory(studentId, subject = null) {
  const filter = { studentId };
  if (subject) filter.subject = subject;
  
  return Conversation.find(filter)
    .sort({ updatedAt: -1 })
    .lean();
}