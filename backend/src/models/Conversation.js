import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  citations: [{
    chunkId: { type: String },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    excerpt: { type: String },
    page: { type: Number },
    score: { type: Number },
  }],
  timestamp: { type: Date, default: Date.now },
});

const conversationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  title: { type: String, trim: true },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

conversationSchema.index({ studentId: 1, createdAt: -1 });
conversationSchema.index({ studentId: 1, subject: 1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);