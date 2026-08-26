import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  chromaUrl: process.env.CHROMA_URL,
  ollamaUrl: process.env.OLLAMA_URL,
  uploadDir: process.env.UPLOAD_DIR,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE), // 10MB
};