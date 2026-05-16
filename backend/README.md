# Bol Bhidu Backend

Production-ready TypeScript backend for the AI-powered social app "Bol Bhidu."

## Stack

- **Node 20+**, TypeScript, ESM
- **Express** + **Mongoose** (MongoDB)
- **JWT** + **Google OAuth 2.0** (ID token verification)
- **Socket.io** for realtime events
- **Cloudinary** for signed media uploads
- **express-validator**, **express-rate-limit**, **helmet**, **cors**

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` (default: `mongodb://127.0.0.1:27017/bolbhidu`)
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
   - `CLIENT_ORIGIN` (frontend URL)

3. **Start MongoDB** (if local):
   ```bash
   mongod
   ```

4. **Run dev server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   npm start
   ```

6. **Run tests**:
   ```bash
   npm test
   ```

## API Endpoints

### Auth
- `POST /auth/register` - Register with email/password
- `POST /auth/login` - Login with email/password
- `POST /auth/google` - Login with Google ID token
- `GET /auth/me` - Get current user

### Media
- `POST /media/signature` - Get Cloudinary upload signature (auth required)

### Posts
- `POST /posts` - Create post (auth, rate-limited 5/min)
- `GET /posts/feed?lat&lng&radiusKm&page&limit` - Location-based feed (auth)
- `GET /posts/:id` - Get single post (auth)
- `POST /posts/:id/like` - Like post (auth, rate-limited 60/min)
- `DELETE /posts/:id/like` - Unlike post (auth, rate-limited 60/min)
- `POST /posts/:id/comments` - Add comment (auth, rate-limited 20/min)
- `POST /posts/:id/share` - Share post (auth)

### Admin (requires admin role)
- `GET /admin/issues?status=` - List issues
- `GET /admin/issues/:id` - Get issue details
- `POST /admin/issues/:id/validate` - Validate issue with ETA
- `POST /admin/issues/:id/progress` - Update progress (0-100)
- `POST /admin/issues/:id/extend-deadline` - Extend deadline once (+5 days)
- `POST /admin/issues/:id/complete` - Mark complete with after images
- `POST /admin/issues/:id/images` - Upload before/after images
- `POST /admin/issues/:id/invalid` - Mark invalid (increments user report count; auto-ban at 5)

### Public
- `GET /issues/:id/public` - Public issue tracking (no auth)

## Features

### AI Gatekeeper
- Posts start with `aiVerdict: 'pending'`
- Mock AI validates content (heuristic: keywords, NSFW detection)
- Emits `post.ai.result` via Socket.io to author
- Only `accepted` posts appear in feed

### Engagement Escalation
- Score = `likes + 3*comments + 2*shares`
- When score ≥ `ISSUE_ESCALATION_SCORE` (default 50), post escalates to Issue
- Issue created with `status: 'pending'`, `priority: engagementScore`
- Emits `post.escalated` and `issue.created`

### Admin Workflow
- **Validate**: Set `in_progress`, assign ETA/deadline
- **Progress**: Update 0-100%
- **Extend**: +5 days once (enforced)
- **Complete**: Requires `afterImages`
- **Invalid**: Increments user `reportCount`; if ≥5 → 10-day post ban

### Auto-Ban
- After 5 invalid reports, user is banned from posting for 10 days
- `postBanUntil` field enforced in `POST /posts`

### Socket.io Events
- `feed.post.created`
- `post.ai.result`
- `post.like.updated`
- `post.comment.created`
- `post.escalated`
- `issue.created`
- `issue.updated`
- `issue.completed`
- `user.enforcement.updated`

## DTOs

All responses match frontend contracts:
- **User**: `{ id, email, name, avatar, isAdmin, reportCount, suspendedUntil }`
- **Post (feed)**: `{ id, userId, username, userAvatar, userEmail, description, category, location, mediaUrl, mediaType, timestamp, likes, comments, shares, isLiked, isRegisteredAsIssue }`
- **Issue (admin)**: `{ id, postId, postDescription, postCategory, postLocation, userInfo, engagementScore, status, reportedAt, timeRequired, deadline, progress, beforeImage, afterImage, deadlineExtended }`

## Project Structure

```
backend/
├── src/
│   ├── config/          # env, database, cors, cloudinary, logger
│   ├── middleware/      # auth, admin, error, rateLimit
│   ├── models/          # User, Post, Issue, Like, Comment
│   ├── services/        # aiValidation, escalation, media, socket
│   ├── controllers/     # auth, posts, admin, media, issues
│   ├── routes/          # route definitions
│   ├── utils/           # jwt, dto, constants, pagination, geohash
│   ├── ws/              # Socket.io initialization
│   └── server.ts        # Express app bootstrap
├── tests/               # Jest + supertest smoke tests
├── package.json
├── tsconfig.json
└── .env.example
```

## License

MIT
