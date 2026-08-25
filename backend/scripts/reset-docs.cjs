const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/pu-gpt';

const Document = mongoose.model('Document', new mongoose.Schema({
  status: String,
  chunkCount: Number,
  errorMessage: String,
  indexedAt: Date,
  fileUrl: String
}));

async function reset() {
  try {
    await mongoose.connect(uri, {tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true});
    const result = await Document.updateMany(
      {status: 'indexed', fileUrl: {$ne: 'teacher-response'}},
      {status: 'processing', chunkCount: 0, errorMessage: null, indexedAt: null}
    );
    console.log('Reset:', result.modifiedCount, 'documents');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
reset();