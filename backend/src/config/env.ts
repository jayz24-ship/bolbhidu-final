import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8080', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  MONGO_URI: process.env.MONGO_URI!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL!,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
  
  // AI Validation Providers (at least one required, tries in order)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '', // FREE - 60 req/min
  GROQ_API_KEY: process.env.GROQ_API_KEY || '', // FREE - 30 req/min, ultra-fast
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '', // Paid (kept for compatibility)
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '', // FREE - 1000 req/day
  
  ISSUE_ESCALATION_SCORE: parseInt(process.env.ISSUE_ESCALATION_SCORE || '20', 10),
  FEED_RADIUS_KM: parseInt(process.env.FEED_RADIUS_KM || '25', 10),
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || '50', 10)
};
