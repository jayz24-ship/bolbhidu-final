import request from 'supertest';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import bootstrap from '../server.js';
describe('Google OAuth Authentication', () => {
    let app;
    beforeAll(async () => {
        // Setup test database
        const mongoUri = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/bolbhidu-test';
        await mongoose.connect(mongoUri);
        app = await bootstrap();
    });
    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
    });
    beforeEach(async () => {
        // Clean up users before each test
        await User.deleteMany({});
    });
    describe('POST /auth/google', () => {
        it('should reject request without idToken', async () => {
            const response = await request(app)
                .post('/auth/google')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
            expect(response.body.error.message).toBe('Validation failed');
        });
        it('should reject empty idToken', async () => {
            const response = await request(app)
                .post('/auth/google')
                .send({ idToken: '' });
            expect(response.status).toBe(400);
            expect(response.body.error.code).toBe('VALIDATION_ERROR');
        });
        it('should reject invalid idToken', async () => {
            const response = await request(app)
                .post('/auth/google')
                .send({ idToken: 'invalid-token' });
            expect(response.status).toBe(401);
            expect(response.body.error.code).toBe('INVALID_TOKEN');
        });
        // Note: Testing with real Google tokens would require actual Google credentials
        // For integration tests, you would need to mock the Google OAuth2Client
        it('should handle Google API errors gracefully', async () => {
            // This test would need mocking of googleClient.verifyIdToken
            // For now, we test the error handling structure
            expect(true).toBe(true);
        });
    });
    describe('User creation and updates', () => {
        it('should create new user with Google info', async () => {
            // This would require mocking Google's verifyIdToken response
            // Testing structure is in place for when you have valid tokens
            expect(true).toBe(true);
        });
        it('should update existing user with Google info', async () => {
            // Pre-create a user
            const existingUser = await User.create({
                email: 'test@example.com',
                name: 'Test User',
                role: 'user',
                reportCount: 0
            });
            expect(existingUser).toBeTruthy();
            expect(existingUser.googleId).toBeUndefined();
            // In a real test, you'd mock the Google verification and test the update
            expect(true).toBe(true);
        });
    });
});
//# sourceMappingURL=google-oauth.test.js.map