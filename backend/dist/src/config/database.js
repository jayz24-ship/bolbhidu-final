import mongoose from 'mongoose';
import { env } from './env.js';
export async function connectDatabase() {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGO_URI);
    const conn = mongoose.connection;
    conn.on('connected', () => {
        console.log(`MongoDB connected: ${conn.host}`);
    });
    conn.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });
}
//# sourceMappingURL=database.js.map