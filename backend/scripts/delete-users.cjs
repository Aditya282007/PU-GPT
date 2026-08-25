const mongoose = require('mongoose');
require('dotenv').config();
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/pu-gpt';

async function deleteUsers() {
  try {
    await mongoose.connect(uri, {tls: true, tlsAllowInvalidCertificates: true, tlsAllowInvalidHostnames: true});
    const User = mongoose.model('User', new mongoose.Schema({email: String}));
    const result = await User.deleteMany({email: {$in: ['admin@pu.edu', 'teacher@pu.edu', 'student@pu.edu']}});
    console.log('Deleted:', result.deletedCount, 'users');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
deleteUsers();