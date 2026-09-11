import { z } from 'zod';
import express from 'express';
import { Conversation, User } from '../models/index.js';
import { authenticate, authorize, validate, validateQuery, AppError } from '../middleware/index.js';
import { processChatQuestion, saveConversation, getConversationHistory, webSearch, confirmWebSearch, callWebSearchLLM } from '../services/chat.js';

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

    if (result.needsPermission) {
      return res.json({
        needsPermission: true,
        permissionPrompt: result.permissionPrompt,
        message: result.message,
      });
    }

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
      citations: result.webSearch ? [] : extractCitations(fullAnswer, context),
      webSources: result.webSearch ? [] : undefined,
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
  const citationRegex = /\[Source: ([^\],]+), p\.([^\]]+)\]/g;
  const citations = [];
  let match;

  while ((match = citationRegex.exec(answer)) !== null) {
    const filename = match[1];
    const page = match[2];
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

router.post('/web-search', authenticate, authorize('student'), validate(z.object({
  question: z.string().min(1).max(2000),
  subject: z.string().min(1),
})), async (req, res, next) => {
  try {
    const { question, subject } = req.body;
    const studentId = req.user._id;

    const student = await User.findById(studentId).lean();
    const studentProfile = {
      college: student?.college || 'Parul University',
      program: student?.program || 'btech',
      field: student?.field || 'Computer Engineering',
      fieldCategory: student?.fieldCategory || 'Engineering',
      subject: subject,
      semester: student?.semester || '1',
    };

    const searchResults = await webSearch(question, studentProfile);

    if (searchResults.length === 0) {
      return res.json({
        answer: "I couldn't find relevant information on the web for your question.",
        sources: [],
      });
    }

    const stream = await callWebSearchLLM(question, searchResults, studentProfile);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    for await (const chunk of stream) {
      const content = chunk.message.content;
      res.write(content);
    }

    res.end();

  } catch (error) {
    next(error);
  }
});

router.post('/confirm-web-search', authenticate, authorize('student'), validate(z.object({
  question: z.string().min(1).max(2000),
  subject: z.string().min(1),
  conversationId: z.string().optional(),
})), async (req, res, next) => {
  try {
    const { question, subject, conversationId } = req.body;
    const studentId = req.user._id;

    if (!req.user.subjects.includes(subject)) {
      throw new AppError('You are not enrolled in this subject', 403);
    }

    const student = await User.findById(studentId).lean();
    const studentProfile = {
      college: student?.college || 'Parul University',
      program: student?.program || 'btech',
      field: student?.field || 'Computer Engineering',
      fieldCategory: student?.fieldCategory || 'Engineering',
      subject: subject,
      semester: student?.semester || '1',
    };

    const searchResults = await webSearch(question, studentProfile);

    if (searchResults.length === 0) {
      return res.json({
        answer: "I couldn't find relevant information on the web for your question.",
        sources: [],
      });
    }

    const stream = await callWebSearchLLM(question, searchResults, studentProfile);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    for await (const chunk of stream) {
      const content = chunk.message.content;
      res.write(content);
    }

    res.end();
  } catch (error) {
    next(error);
  }
});

export default router;