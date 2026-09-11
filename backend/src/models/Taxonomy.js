import mongoose from 'mongoose';

const fieldCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  fields: [{ type: String, trim: true }],
});

const programSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, enum: ['diploma', 'btech', 'mtech'], required: true },
  fields: [{ type: String, trim: true }],
});

const collegeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
  programs: [programSchema],
  fieldCategories: [fieldCategorySchema],
  semesters: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

collegeSchema.index({ name: 1 });
collegeSchema.index({ code: 1 });

export const College = mongoose.model('College', collegeSchema);
export const Taxonomy = mongoose.model('Taxonomy', collegeSchema);