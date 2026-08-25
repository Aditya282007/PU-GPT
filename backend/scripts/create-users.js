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

    const users = [
      {
        name: 'Admin User',
        email: 'admin@pu.edu',
        password: 'admin123',
        role: 'admin',
        department: 'Administration',
        subjects: [],
      },
      {
        name: 'Dr. Jane Smith',
        email: 'teacher@pu.edu',
        password: 'teacher123',
        role: 'teacher',
        department: 'Computer Science Engineering',
        subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
      },
      {
        name: 'Student User',
        email: 'student@pu.edu',
        password: 'student123',
        role: 'student',
        department: 'Computer Science Engineering',
        subjects: ['Data Structures', 'Algorithms'],
      },
    ];

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
      console.log(`Created ${u.role}: ${u.email} / ${u.password}`);
    }

    console.log('\n--- Login Credentials ---');
    console.log('Admin:    admin@pu.edu    / admin123');
    console.log('Teacher:  teacher@pu.edu  / teacher123');
    console.log('Student:  student@pu.edu  / student123');
    console.log('\nLogin at: http://localhost:5173/login');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createUsers();