import { z } from 'zod';
import express from 'express';
import { User, Document } from '../models/index.js';
import { authenticate, authorize, validate, validateQuery, AppError } from '../middleware/index.js';
import { config } from '../config/index.js';
import { chroma } from '../services/ingestion.js';

const router = express.Router();

// Debug endpoint
router.get('/debug/health', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    console.log('=== DEBUG HEALTH CHECK ===');
    
    // Test chroma import
    console.log('Testing chroma import...');
    const {ChromaClient} = await import('chromadb');
    const testChroma = new ChromaClient({path: config.chromaUrl});
    const collections = await testChroma.listCollections();
    console.log('Direct Chroma test:', collections.length);
    
    // Test ingestion service chroma
    console.log('Testing ingestion chroma...');
    const ingestionChroma = (await import('../services/ingestion.js')).chroma;
    const collections2 = await ingestionChroma.listCollections();
    console.log('Ingestion Chroma test:', collections2.length);
    
    // Test ollama
    console.log('Testing Ollama...');
    const ollamaRes = await fetch(config.ollamaUrl + '/api/tags');
    const ollamaData = await ollamaRes.json();
    console.log('Ollama models:', ollamaData.models?.map(m => m.name) || []);
    
    res.json({status: 'ok'});
  } catch (err) {
    console.error('Debug health error:', err);
    res.status(500).json({error: err.message, stack: err.stack});
  }
});

const createTeacherSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  department: z.string().min(1),
  subjects: z.array(z.string()).optional(),
});

const departmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
});

const subjectSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  department: z.string().min(1),
  semesters: z.array(z.string()).optional(),
});

router.get('/departments', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const departments = await User.distinct('department', { role: { $in: ['teacher', 'student'] } });
    res.json({ departments: departments.filter(d => d).sort() });
  } catch (error) {
    next(error);
  }
});

router.post('/departments', authenticate, authorize('admin'), validate(departmentSchema), async (req, res, next) => {
  try {
    res.json({ message: 'Department structure noted', department: req.body });
  } catch (error) {
    next(error);
  }
});

router.get('/subjects', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const subjects = await User.distinct('subjects', { role: { $in: ['teacher', 'student'] } });
    res.json({ subjects: subjects.filter(s => s).sort() });
  } catch (error) {
    next(error);
  }
});

router.post('/subjects', authenticate, authorize('admin'), validate(subjectSchema), async (req, res, next) => {
  try {
    res.json({ message: 'Subject structure noted', subject: req.body });
  } catch (error) {
    next(error);
  }
});

router.delete('/departments/:name', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const result = await User.updateMany(
      { department: name },
      { $unset: { department: "" } }
    );
    res.json({ message: 'Department removed from users', modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
});

router.post('/teachers', authenticate, authorize('admin'), validate(createTeacherSchema), async (req, res, next) => {
  try {
    const { name, email, password, department, subjects } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const teacher = await User.create({
      name,
      email,
      passwordHash: password,
      role: 'teacher',
      department,
      subjects: subjects || [],
    });

    res.status(201).json({
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        subjects: teacher.subjects,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/users', authenticate, authorize('admin'), validateQuery(z.object({
  role: z.enum(['student', 'teacher', 'admin']).optional().or(z.literal('')),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
}).transform(d => ({ ...d, role: d.role === '' ? undefined : d.role }))), async (req, res, next) => {
  try {
    const { role, page, limit } = req.query;
    const filter = {};
    if (role) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/role', authenticate, authorize('admin'), validate(z.object({
  role: z.enum(['student', 'teacher', 'admin']),
})), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-passwordHash');
    if (!user) throw new AppError('User not found', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

router.get('/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    console.log('=== STATUS CHECK START ===');
    
    // Debug chroma import
    console.log('typeof chroma:', typeof chroma);
    console.log('chroma.constructor.name:', chroma?.constructor?.name);
    console.log('chroma.listCollections:', typeof chroma?.listCollections);
    
    const userCount = await User.countDocuments();
    console.log('userCount:', userCount);
    
    const docCount = await Document.countDocuments();
    console.log('docCount:', docCount);
    
    console.log('Calling checkChromaHealth...');
    const chromaStatus = await checkChromaHealth();
    console.log('chromaStatus result:', chromaStatus);
    
    console.log('Calling checkOllamaHealth...');
    const ollamaStatus = await checkOllamaHealth();
    console.log('ollamaStatus result:', ollamaStatus);
    
    const docStatus = await Document.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    console.log('docStatus:', docStatus);

    console.log('=== STATUS CHECK END ===');

    res.json({
      system: {
        users: userCount,
        documents: docCount,
        documentStatus: docStatus,
        chroma: chromaStatus,
        ollama: ollamaStatus,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    next(error);
  }
});

async function checkChromaHealth() {
  try {
    console.log('Checking Chroma health...');
    const collections = await chroma.listCollections();
    console.log('Chroma collections:', collections.length);
    const result = { status: 'healthy', collections: collections.length };
    console.log('checkChromaHealth returning:', result);
    return result;
  } catch (err) {
    console.error('Chroma health check failed:', err);
    return { status: 'unhealthy', error: err.message };
  }
}

async function checkOllamaHealth() {
  try {
    console.log('Checking Ollama health...');
    const response = await fetch(`${config.ollamaUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      console.log('Ollama models:', data.models?.map(m => m.name) || []);
      const result = { status: 'healthy', models: data.models?.map(m => m.name) || [] };
      console.log('checkOllamaHealth returning:', result);
      return result;
    }
    return { status: 'unhealthy' };
  } catch (err) {
    console.error('Ollama health check failed:', err);
    return { status: 'unhealthy', error: err.message };
  }
}

export default router;