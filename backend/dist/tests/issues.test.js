import request from 'supertest';
import mongoose from 'mongoose';
import bootstrap from '../src/server.js';
import { User } from '../src/models/User.js';
import { Post } from '../src/models/Post.js';
import { Issue } from '../src/models/Issue.js';
import { Like } from '../src/models/Like.js';
let app;
let adminToken;
let issueId;
beforeAll(async () => {
    process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/bolbhidu-test';
    app = await bootstrap();
    const admin = await User.create({ email: 'admin@example.com', name: 'Admin', role: 'admin', passwordHash: 'x', reportCount: 0 });
    const { signAccessToken } = await import('../src/utils/jwt.js');
    adminToken = signAccessToken({ sub: String(admin._id), role: 'admin' });
    const post = await Post.create({
        authorId: admin._id,
        description: 'Test issue',
        category: 'roads',
        locationName: 'Test',
        location: { type: 'Point', coordinates: [73.85, 18.52] },
        media: [],
        aiVerdict: 'accepted',
        engagementScore: 60,
        isEscalated: true,
    });
    const issue = await Issue.create({
        sourcePostId: post._id,
        status: 'pending',
        priority: 60,
        progressPercent: 0,
        extendedOnce: false,
        beforeImages: [],
        afterImages: [],
        userSnapshot: { id: String(admin._id), name: 'Admin', avatar: '', email: 'admin@example.com', reportCount: 0 },
    });
    issueId = String(issue._id);
});
afterAll(async () => {
    await User.deleteMany({});
    await Post.deleteMany({});
    await Issue.deleteMany({});
    await Like.deleteMany({});
    await mongoose.connection.close();
});
describe('Admin Issues', () => {
    it('should list issues', async () => {
        const res = await request(app).get('/admin/issues').set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.issues).toBeDefined();
    });
    it('should validate an issue', async () => {
        const res = await request(app).post(`/admin/issues/${issueId}/validate`).set('Authorization', `Bearer ${adminToken}`).send({ etaDays: 3 });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
    it('should update progress', async () => {
        const res = await request(app).post(`/admin/issues/${issueId}/progress`).set('Authorization', `Bearer ${adminToken}`).send({ progressPercent: 50 });
        expect(res.status).toBe(200);
    });
    it('should extend deadline once', async () => {
        const res = await request(app).post(`/admin/issues/${issueId}/extend-deadline`).set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.deadlineExtended).toBe(true);
    });
    it('should reject second deadline extension', async () => {
        const res = await request(app).post(`/admin/issues/${issueId}/extend-deadline`).set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(409);
    });
});
//# sourceMappingURL=issues.test.js.map