import { z } from 'zod';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Document } from '../models/index.js';
import { authenticate, authorize, validate, validateQuery, AppError } from '../middleware/index.js';
import { config } from '../config/index.js';
import { processDocument, processDocumentWithText, deleteDocumentChunks } from '../services/ingestion.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF, DOCX, and TXT files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxFileSize },
});

const uploadSchema = z.object({
  department: z.string().min(1),
  subject: z.string().min(1),
  semester: z.string().min(1),
  unit: z.string().optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
});

const querySchema = z.object({
  department: z.string().optional().or(z.literal('')),
  subject: z.string().optional().or(z.literal('')),
  semester: z.string().optional().or(z.literal('')),
  status: z.enum(['processing', 'indexed', 'failed']).optional().or(z.literal('')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
}).transform(d => ({
  ...d,
  department: d.department === '' ? undefined : d.department,
  subject: d.subject === '' ? undefined : d.subject,
  semester: d.semester === '' ? undefined : d.semester,
  status: d.status === '' ? undefined : d.status,
}));

router.post('/upload', authenticate, authorize('teacher', 'admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const parsed = uploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { department, subject, semester, unit } = parsed.data;

    // Check if teacher has access to this subject
    if (req.user.role === 'teacher' && !req.user.subjects.includes(subject)) {
      throw new AppError('You do not have permission to upload to this subject', 403);
    }

    const document = await Document.create({
      title: req.file.originalname,
      uploadedBy: req.user._id,
      department,
      subject,
      semester,
      unit,
      fileUrl: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'processing',
    });

    processDocument(document._id).catch(err => {
      console.error('Document processing failed:', err);
    });

    res.status(201).json({
      document: {
        id: document._id,
        title: document.title,
        department: document.department,
        subject: document.subject,
        semester: document.semester,
        unit: document.unit,
        status: document.status,
        uploadedAt: document.uploadedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});
  
  // Debug endpoint to test document processing
  router.post('/debug/process/:id', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
    try {
      const document = await Document.findById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      console.log('=== MANUAL PROCESS START ===', document.title);
      console.log('fileUrl:', document.fileUrl);
      console.log('fileType:', document.fileType);
      
      let result;
      if (document.fileUrl === 'teacher-response') {
        console.log('Using processDocumentWithText - but need original text');
        // For teacher-generated, we can't reprocess without the original text
        // unless we stored it. For now, mark as failed with explanation.
        document.status = 'failed';
        document.errorMessage = 'Cannot reprocess teacher-generated content without original response text';
        await document.save();
        return res.json({ success: false, message: 'Cannot reprocess teacher-generated content without original text' });
      } else {
        // Delete old vectors first
        await deleteDocumentChunks(document._id);
        result = await processDocument(document._id);
      }
      
      console.log('=== MANUAL PROCESS END ===', 'success');
      const updated = await Document.findById(req.params.id);
      res.json({ success: true, document: updated });
    } catch (err) {
      console.error('=== MANUAL PROCESS ERROR ===', err);
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  // Bulk reprocess all failed/processing documents
  router.post('/debug/reprocess-all', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
    try {
      const documents = await Document.find({
        status: { $in: ['processing', 'failed'] },
        fileUrl: { $ne: 'teacher-response' }
      }).select('_id title');
      
      console.log(`Found ${documents.length} documents to reprocess`);
      
      const results = [];
      for (const doc of documents) {
        try {
          console.log(`Reprocessing: ${doc.title}`);
          // Delete old vectors first
          await deleteDocumentChunks(doc._id);
          await processDocument(doc._id);
          results.push({ id: doc._id, title: doc.title, success: true });
        } catch (err) {
          console.error(`Failed to reprocess ${doc.title}:`, err.message);
          results.push({ id: doc._id, title: doc.title, success: false, error: err.message });
        }
      }
      
      res.json({ processed: results.length, results });
    } catch (err) {
      console.error('BULK REPROCESS ERROR:', err);
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  router.get('/', authenticate, authorize('teacher', 'admin'), validateQuery(querySchema), async (req, res, next) => {
  try {
    const { department, subject, semester, status, page, limit } = req.query;
    const filter = {};

    if (req.user.role === 'teacher') {
      filter.uploadedBy = req.user._id;
    }
    if (department) filter.department = department;
    if (subject) filter.subject = subject;
    if (semester) filter.semester = semester;
    if (status) filter.status = status;

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .sort({ uploadedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Document.countDocuments(filter),
    ]);

    res.json({
      documents: documents.map(d => ({
        id: d._id,
        title: d.title,
        department: d.department,
        subject: d.subject,
        semester: d.semester,
        unit: d.unit,
        status: d.status,
        chunkCount: d.chunkCount,
        errorMessage: d.errorMessage,
        uploadedAt: d.uploadedAt,
        indexedAt: d.indexedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/subjects', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const filter = req.user.role === 'teacher' ? { uploadedBy: req.user._id } : {};
    const subjects = await Document.distinct('subject', filter);
    res.json({ subjects });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role === 'teacher') {
      filter.uploadedBy = req.user._id;
    }

    const document = await Document.findOneAndDelete(filter);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;