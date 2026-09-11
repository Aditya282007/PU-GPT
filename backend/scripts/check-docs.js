import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/pu-gpt';
await mongoose.connect(uri, {tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true});
const Document = mongoose.model('Document', new mongoose.Schema({status: String, title: String, fileUrl: String}));
const docs = await Document.find({status: {$in: ['indexed', 'failed', 'processing']}, fileUrl: {$ne: 'teacher-response'}}).select('title status fileUrl');
console.log('Documents:', JSON.stringify(docs, null, 2));
process.exit(0);