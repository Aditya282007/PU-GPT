import authRoutes from './auth.js';
import documentRoutes from './documents.js';
import chatRoutes from './chat.js';
import teacherRoutes from './teacher.js';
import adminRoutes from './admin.js';

export const setupRoutes = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/teacher', teacherRoutes);
  app.use('/api/admin', adminRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
};