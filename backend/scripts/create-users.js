import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pu-gpt';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  passwordHash: String,
  role: { type: String, enum: ['student', 'teacher', 'admin'] },
  department: String,
  subjects: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function createUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Read users from environment variables
    // Format: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_DEPARTMENT
    //         TEACHER_EMAIL, TEACHER_PASSWORD, TEACHER_NAME, TEACHER_DEPARTMENT, TEACHER_SUBJECTS (comma-separated)
    //         STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_NAME, STUDENT_DEPARTMENT, STUDENT_SUBJECTS (comma-separated)

    const users = [];

    // Admin
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      users.push({
        name: process.env.ADMIN_NAME || 'Admin User',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: 'admin',
        department: process.env.ADMIN_DEPARTMENT || 'Administration',
        subjects: [],
      });
    }

    // Teacher
    if (process.env.TEACHER_EMAIL && process.env.TEACHER_PASSWORD) {
      users.push({
        name: process.env.TEACHER_NAME || 'Teacher User',
        email: process.env.TEACHER_EMAIL,
        password: process.env.TEACHER_PASSWORD,
        role: 'teacher',
        department: process.env.TEACHER_DEPARTMENT || 'Computer Science Engineering',
        subjects: (process.env.TEACHER_SUBJECTS || 'Data Structures,Algorithms,Database Systems')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      });
    }

    // Student
    if (process.env.STUDENT_EMAIL && process.env.STUDENT_PASSWORD) {
      users.push({
        name: process.env.STUDENT_NAME || 'Student User',
        email: process.env.STUDENT_EMAIL,
        password: process.env.STUDENT_PASSWORD,
        role: 'student',
        department: process.env.STUDENT_DEPARTMENT || 'Computer Science Engineering',
        subjects: (process.env.STUDENT_SUBJECTS || 'Data Structures,Algorithms')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      });
    }

    if (users.length === 0) {
      console.log('No users configured. Set environment variables:');
      console.log('  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_DEPARTMENT');
      console.log('  TEACHER_EMAIL, TEACHER_PASSWORD, TEACHER_NAME, TEACHER_DEPARTMENT, TEACHER_SUBJECTS');
      console.log('  STUDENT_EMAIL, STUDENT_PASSWORD, STUDENT_NAME, STUDENT_DEPARTMENT, STUDENT_SUBJECTS');
      process.exit(0);
    }

    for (const u of users) {
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        console.log(`User ${u.email} already exists, skipping...`);
        continue;
      }

      const passwordHash = await hashPassword(u.password);
      await User.create({
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role,
        department: u.department,
        subjects: u.subjects,
      });
      console.log(`Created ${u.role}: ${u.email}`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createUsers();