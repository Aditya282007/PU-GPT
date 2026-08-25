import mongoose from 'mongoose';

const flaggedQuestionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  subject: { type: String, required: true, trim: true },
  reason: { type: String, enum: ['low_confidence', 'empty_context', 'no_relevant_chunks', 'phi4_routing'], required: true },
  status: { type: String, enum: ['open', 'answered'], default: 'open' },
  teacherResponse: { type: String },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  answeredAt: { type: Date },
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  createdAt: { type: Date, default: Date.now },
});

flaggedQuestionSchema.index({ subject: 1, status: 1 });
flaggedQuestionSchema.index({ studentId: 1, createdAt: -1 });

export const FlaggedQuestion = mongoose.model('FlaggedQuestion', flaggedQuestionSchema);