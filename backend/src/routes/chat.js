import { z } from 'zod';
import express from 'express';
import { Conversation, FlaggedQuestion } from '../models/index.js';
import { authenticate, authorize, validate, validateQuery, AppError } from '../middleware/index.js';
import { processChatQuestion, saveConversation, getConversationHistory } from '../services/chat.js';

const router = express.Router();

const askSchema = z.object({
  question: z.string().min(1).max(2000),
  subject: z.string().min(1),
  conversationId: z.string().optional(),
});

router.post('/ask', authenticate, authorize('student'), validate(askSchema), async (req, res, next) => {
  try {
    const { question, subject, conversationId } = req.body;
    const studentId = req.user._id;

    if (!req.user.subjects.includes(subject)) {
      throw new AppError('You are not enrolled in this subject', 403);
    }

    const result = await processChatQuestion(studentId, question, subject, conversationId);

    if (result.escalated) {
      return res.json({
        escalated: true,
        flaggedId: result.flaggedId,
        message: result.message,
      });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    let fullAnswer = '';
    const context = result.context;

    for await (const chunk of result.stream) {
      const content = chunk.message.content;
      fullAnswer += content;
      res.write(content);
    }

    res.end();

    const userMessage = { role: 'user', content: question, citations: [], timestamp: new Date() };
    const assistantMessage = { 
      role: 'assistant', 
      content: fullAnswer, 
      citations: extractCitations(fullAnswer, context),
      timestamp: new Date() 
    };

    const messages = [
      ...(await getConversationMessages(conversationId)),
      userMessage,
      assistantMessage,
    ];

    await saveConversation(studentId, subject, messages, conversationId);

  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      console.error('Stream error:', error);
      res.end();
    }
  }
});

async function getConversationMessages(conversationId) {
  if (!conversationId) return [];
  const conv = await Conversation.findById(conversationId).lean();
  return conv?.messages || [];
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

router.get('/history', authenticate, authorize('student'), validateQuery(z.object({
  subject: z.string().optional().or(z.literal('')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
}).transform(d => ({ ...d, subject: d.subject === '' ? undefined : d.subject }))), async (req, res, next) => {
  try {
    const { subject, page, limit } = req.query;
    const conversations = await getConversationHistory(req.user._id, subject);
    
    const start = (page - 1) * limit;
    const paginated = conversations.slice(start, start + limit);

    res.json({
      conversations: paginated.map(c => ({
        id: c._id,
        subject: c.subject,
        title: c.title,
        messageCount: c.messages.length,
        lastMessageAt: c.updatedAt,
        createdAt: c.createdAt,
      })),
      pagination: {
        page,
        limit,
        total: conversations.length,
        pages: Math.ceil(conversations.length / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/history/:id', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, studentId: req.user._id }).lean();
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }
    res.json({ conversation });
  } catch (error) {
    next(error);
  }
});

router.delete('/history/:id', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const result = await Conversation.findOneAndDelete({ _id: req.params.id, studentId: req.user._id });
    if (!result) {
      throw new AppError('Conversation not found', 404);
    }
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/flagged', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const flagged = await FlaggedQuestion.find({ studentId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ flaggedQuestions: flagged });
  } catch (error) {
    next(error);
  }
});

export default router;