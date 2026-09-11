import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/pu-gpt';
await mongoose.connect(uri, {tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true});
const Document = mongoose.model('Document', new mongoose.Schema({college: String}));
const result = await Document.updateMany(
  {college: {$exists: false}},
  {$set: {college: 'Parul University'}}
);
console.log('Updated:', result.modifiedCount, 'documents');
process.exit(0);