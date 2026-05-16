import request from 'supertest';
import mongoose from 'mongoose';
import bootstrap from '../src/server.js';
import { User } from '../src/models/User.js';
let app;
beforeAll(async () => {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/bolbhidu-test';
    app = await bootstrap();
});
afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
});
describe('Auth', () => {
    it('should register a new user', async () => {
        const res = await request(app).post('/auth/register').send({ email: 'test@example.com', password: 'pass123', name: 'Test User' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('test@example.com');
    });
    it('should login with valid credentials', async () => {
        const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'pass123' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });
    it('should reject invalid credentials', async () => {
        const res = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'wrong' });
        expect(res.status).toBe(401);
    });
    it('should return user info for /me with valid token', async () => {
        const loginRes = await request(app).post('/auth/login').send({ email: 'test@example.com', password: 'pass123' });
        const token = loginRes.body.token;
        const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('test@example.com');
    });
});
//# sourceMappingURL=auth.test.js.map