import cors, { CorsOptions } from 'cors';
import { env } from './env.js';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  env.CLIENT_ORIGIN,
];

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

export const corsMiddleware = cors(corsOptions);
