import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  college: { type: String, required: true, trim: true },
  department: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  unit: { type: String, trim: true },
  fileUrl: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  status: { type: String, enum: ['processing', 'indexed', 'failed'], default: 'processing' },
  chunkCount: { type: Number, default: 0 },
  errorMessage: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  indexedAt: { type: Date },
});

export const Document = mongoose.model('Document', documentSchema);