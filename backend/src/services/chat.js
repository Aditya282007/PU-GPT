import ollama from 'ollama';
import { searchChunks } from './ingestion.js';
import { Conversation, FlaggedQuestion } from '../models/index.js';

const QWEN_MODEL = 'phi4:14b';
const PHI4_MODEL = 'phi4:14b';

const QWEN_SYSTEM_PROMPT = `You are a curriculum assistant for Parul University. Answer questions using ONLY the provided course material excerpts. 

Rules:
1. Cite sources inline using [doc:X] format where X is the citation index
2. If the context doesn't contain enough information, say so clearly
3. Never hallucinate or use external knowledge
4. Be concise but complete
5. Use the same language as the student's question`;

const PHI4_SYSTEM_PROMPT = `You are a reasoning specialist for math, science, and code questions. 

Given a student question and relevant course material excerpts:
1. Analyze the problem step by step
2. Show your reasoning clearly
3. Derive the answer strictly from the provided material
4. If the material is insufficient, state what's missing
5. Output your reasoning AND the final answer clearly separated

You do NOT face students directly. Your output feeds into the answer generator.`;

const MATH_SCIENCE_KEYWORDS = [
  'calculate', 'solve', 'equation', 'formula', 'derivative', 'integral',
  'theorem', 'proof', 'algorithm', 'code', 'program', 'function',
  'physics', 'chemistry', 'biology', 'mathematics', 'math',
  'compute', 'evaluate', 'simplify', 'factor', 'matrix', 'vector',
  'probability', 'statistics', 'regression', 'optimization',
];

function needsPhi4Routing(question, subject) {
  const lowerQuestion = question.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  
  const mathScienceSubjects = ['mathematics', 'math', 'physics', 'chemistry', 'biology', 'computer science', 'programming', 'data science'];
  const isMathScienceSubject = mathScienceSubjects.some(s => lowerSubject.includes(s));
  
  const hasKeywords = MATH_SCIENCE_KEYWORDS.some(k => lowerQuestion.includes(k));
  
  return isMathScienceSubject || hasKeywords;
}

async function callPhi4(question, context) {
  const prompt = `Question: ${question}

Context excerpts:
${context.map((c, i) => `[${i}] ${c.text}`).join('\n\n')}

Reason step by step and provide the final answer.`;

  const response = await ollama.chat({
    model: PHI4_MODEL,
    messages: [
      { role: 'system', content: PHI4_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    options: { temperature: 0.1 },
  });

  return response.message.content;
}

async function callQwen(question, context, phi4Reasoning = null) {
  let prompt = `Question: ${question}

Context excerpts:
${context.map((c, i) => `[${i}] ${c.text}`).join('\n\n')}`;

  if (phi4Reasoning) {
    prompt += `\n\nReasoning from specialist:\n${phi4Reasoning}`;
  }

  prompt += '\n\nAnswer with inline citations [doc:X]:';

  const response = await ollama.chat({
    model: QWEN_MODEL,
    messages: [
      { role: 'system', content: QWEN_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    options: { temperature: 0.2 },
    stream: true,
  });

  return response;
}

function extractCitations(answer, context) {
  const citationRegex = /\[doc:(\d+)\]/g;
  const citations = [];
  let match;
  
  while ((match = citationRegex.exec(answer)) !== null) {
    const index = parseInt(match[1]);
    if (context[index]) {
      citations.push({
        chunkId: `${context[index].metadata.documentId}-${context[index].metadata.chunkIndex}`,
        documentId: context[index].metadata.documentId,
        excerpt: context[index].text.slice(0, 300),
        page: context[index].metadata.chunkIndex,
        score: context[index].score,
      });
    }
  }
  
  return citations;
}

export async function processChatQuestion(studentId, question, subject, conversationId = null) {
  const filters = { subject };
  const context = await searchChunks(question, filters, 8);

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

  const usePhi4 = needsPhi4Routing(question, subject);
  let phi4Reasoning = null;

  if (usePhi4) {
    phi4Reasoning = await callPhi4(question, relevantContext);
  }

  const stream = await callQwen(question, relevantContext, phi4Reasoning);
  
  return {
    escalated: false,
    stream,
    context: relevantContext,
    usePhi4,
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