import { z } from 'zod';
import express from 'express';
import { Document, Conversation } from '../models/index.js';
import { authenticate, authorize, validate, validateQuery, AppError } from '../middleware/index.js';

const router = express.Router();

// Teacher insights endpoint
router.get('/insights', authenticate, authorize('teacher', 'admin'), validateQuery(z.object({
  subject: z.string().optional().or(z.literal('')),
  days: z.coerce.number().int().positive().default(7),
}).transform(d => ({ ...d, subject: d.subject === '' ? undefined : d.subject }))), async (req, res, next) => {
  try {
    const { subject, days } = req.query;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const filter = { createdAt: { $gte: cutoff } };
    if (req.user.role === 'teacher') {
      filter.subject = { $in: req.user.subjects };
    }
    if (subject) filter.subject = subject;

    const conversations = await Conversation.find({ 
      studentId: { $exists: true },
      updatedAt: { $gte: cutoff },
      ...(subject ? { subject } : {}),
    }).lean();

    const topicCounts = {};
    const subjectCounts = {};

    conversations.flatMap(c => c.messages.filter(m => m.role === 'user' && m.content).map(m => ({ subject: c.subject, text: m.content })))
      .forEach(item => {
        const subj = item.subject || 'unknown';
        subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
        
        const text = item.text || '';
        const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
        words.forEach(w => {
          topicCounts[w] = (topicCounts[w] || 0) + 1;
        });
      });

    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    const bySubject = Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([subject, count]) => ({ subject, count }));

    res.json({ insights: { topTopics, bySubject, totalQuestions: conversations.length, periodDays: days } });
  } catch (error) {
    next(error);
  }
});

export default router;