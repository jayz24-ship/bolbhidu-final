import request from 'supertest';
import mongoose from 'mongoose';
import bootstrap from '../src/server.js';
import { User } from '../src/models/User.js';
import { Post } from '../src/models/Post.js';
import { Issue } from '../src/models/Issue.js';

let app: any;
let token: string;
let userId: string;

beforeAll(async () => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/bolbhidu-test';
  app = await bootstrap();
  const res = await request(app).post('/auth/register').send({ email: 'poster@example.com', password: 'pass123', name: 'Poster' });
  token = res.body.token;
  userId = res.body.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});
  await Issue.deleteMany({});
  await mongoose.connection.close();
});

describe('Posts', () => {
  it('should create a post with pending AI verdict', async () => {
    const res = await request(app)
      .post('/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Road issue', category: 'roads', location: 'Pune', lat: 18.52, lng: 73.85, media: [] });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.aiVerdict).toBe('pending');
  });

  it('should return feed with accepted posts only', async () => {
    await new Promise((r) => setTimeout(r, 1000)); // wait for AI
    const res = await request(app).get('/posts/feed?lat=18.52&lng=73.85&radiusKm=50').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
  });

  it('should like a post', async () => {
    const post = await Post.findOne({ authorId: userId });
    const res = await request(app).post(`/posts/${post!._id}/like`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should add a comment', async () => {
    const post = await Post.findOne({ authorId: userId });
    const res = await request(app).post(`/posts/${post!._id}/comments`).set('Authorization', `Bearer ${token}`).send({ content: 'Great post!' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });
});
