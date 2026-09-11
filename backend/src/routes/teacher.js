import { z } from 'zod';
import express from 'express';
import { Document, Conversation } from '../models/index.js';
import { authenticate, authorize, validate, validateQuery, AppError } from '../middleware/index.js';
import { processDocument, processDocumentWithText } from '../services/ingestion.js';

const router = express.Router();

const respondSchema = z.object({
  response: z.string().min(1).max(5000),
  convertToContent: z.boolean().optional(),
});

const querySchema = z.object({
  subject: z.string().optional().or(z.literal('')),
  status: z.enum(['open', 'answered']).optional().or(z.literal('')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
}).transform(d => ({
  ...d,
  subject: d.subject === '' ? undefined : d.subject,
  status: d.status === '' ? undefined : d.status,
}));

router.get('/', authenticate, authorize('teacher', 'admin'), validateQuery(querySchema), async (req, res, next) => {
  try {
    const { subject, status, page, limit } = req.query;
    const filter = {};

    if (req.user.role === 'teacher') {
      const teacherSubjects = req.user.subjects;
      filter.subject = { $in: teacherSubjects };
    }
    if (subject) filter.subject = subject;
    if (status) filter.status = status;

    const [questions, total] = await Promise.all([
      FlaggedQuestion.find(filter)
        .populate('studentId', 'name email')
        .populate('answeredBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      FlaggedQuestion.countDocuments(filter),
    ]);

    res.json({
      flaggedQuestions: questions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/respond', authenticate, authorize('teacher', 'admin'), validate(respondSchema), async (req, res, next) => {
  try {
    const { response, convertToContent } = req.body;
    const flagged = await FlaggedQuestion.findById(req.params.id);

    if (!flagged) {
      throw new AppError('Flagged question not found', 404);
    }

    if (req.user.role === 'teacher' && !req.user.subjects.includes(flagged.subject)) {
      throw new AppError('Not authorized for this subject', 403);
    }

    flagged.status = 'answered';
    flagged.teacherResponse = response;
    flagged.answeredBy = req.user._id;
    flagged.answeredAt = new Date();
    await flagged.save();

    if (convertToContent) {
      const doc = await Document.create({
        title: `Teacher Answer: ${flagged.question.slice(0, 50)}...`,
        uploadedBy: req.user._id,
        department: req.user.department,
        subject: flagged.subject,
        semester: 'all',
        unit: 'teacher-generated',
        fileUrl: 'teacher-response',
        fileType: 'text/plain',
        fileSize: response.length,
        status: 'processing',
      });

      await processDocumentWithText(doc._id, response);
    }

    res.json({ flaggedQuestion: flagged });
  } catch (error) {
    next(error);
  }
});

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

    const questions = await FlaggedQuestion.find(filter).lean();
    const conversations = await Conversation.find({ 
      studentId: { $in: questions.map(q => q.studentId) },
      updatedAt: { $gte: cutoff },
      ...(subject ? { subject } : {}),
    }).lean();

    const topicCounts = {};
    const subjectCounts = {};

    [...questions, ...conversations.flatMap(c => c.messages.filter(m => m.role === 'user' && m.content).map(m => ({ subject: c.subject, text: m.content })))]
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

    res.json({ insights: { topTopics, bySubject, totalQuestions: questions.length, periodDays: days } });
  } catch (error) {
    next(error);
  }
});

export default router;