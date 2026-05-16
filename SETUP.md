# Bol Bhidu - Full Stack Setup Guide

## Prerequisites

- **Node.js 20+**
- **MongoDB** (local or Atlas)
- **Cloudinary Account** (for media uploads)
- **Google OAuth Credentials** (optional, for Google login)

---

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=8080
CLIENT_ORIGIN=http://localhost:5173

# MongoDB
MONGO_URI=mongodb://127.0.0.1:27017/bolbhidu

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# App Settings
ISSUE_ESCALATION_SCORE=50
FEED_RADIUS_KM=25
MAX_UPLOAD_MB=50
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**Or use MongoDB Atlas** and update `MONGO_URI` in `.env`

### 4. Build & Run Backend

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

Backend will run on **http://localhost:8080**

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_SOCKET_URL=http://localhost:8080
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_API_KEY=your_cloudinary_api_key
```

**Note:** Use the same Cloudinary credentials as backend.

### 3. Run Frontend

```bash
npm run dev
```

Frontend will run on **http://localhost:5173**

---

## Cloudinary Setup

1. **Sign up** at [cloudinary.com](https://cloudinary.com)
2. Go to **Dashboard** → Copy:
   - Cloud Name
   - API Key
   - API Secret
3. **Add to both** `backend/.env` and `frontend/.env`

---

## Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google+ API**
4. Create **OAuth 2.0 credentials**:
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:8080/auth/google/callback`
5. Copy **Client ID** and **Client Secret** to `backend/.env`

---

## Testing the Integration

### 1. Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
MongoDB connected: localhost
Server listening on :8080
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
```

### 3. Test Features

#### Authentication
- Navigate to `http://localhost:5173`
- Register a new account or login
- JWT token is stored in localStorage

#### Create Post
- Click "Create Post"
- Upload image/video (Cloudinary)
- Add description, category, location
- AI validates content (~1 second)
- Post appears in feed if accepted

#### Real-time Features
- Open browser console to see Socket.io events
- Like/comment on posts → real-time updates
- Posts with 50+ engagement → auto-escalate to Issues

#### Admin Dashboard
- Create an admin user in MongoDB:
  ```js
  db.users.updateOne(
    { email: "admin@example.com" },
    { $set: { role: "admin" } }
  )
  ```
- Login as admin
- Navigate to `/admin`
- Validate issues, update progress, mark complete

---

## API Endpoints

### Auth
- `POST /auth/register` - Register
- `POST /auth/login` - Login
- `POST /auth/google` - Google OAuth
- `GET /auth/me` - Get current user

### Posts
- `POST /posts` - Create post
- `GET /posts/feed?lat&lng&radiusKm&page&limit` - Get feed
- `POST /posts/:id/like` - Like post
- `DELETE /posts/:id/like` - Unlike post
- `POST /posts/:id/comments` - Add comment
- `POST /posts/:id/share` - Share post

### Admin
- `GET /admin/issues?status=` - List issues
- `POST /admin/issues/:id/validate` - Validate issue
- `POST /admin/issues/:id/progress` - Update progress
- `POST /admin/issues/:id/extend-deadline` - Extend deadline (+5 days, once)
- `POST /admin/issues/:id/complete` - Mark complete
- `POST /admin/issues/:id/invalid` - Mark invalid (auto-ban at 5)

### Media
- `POST /media/signature` - Get Cloudinary upload signature

---

## Socket.io Events

### Client → Server
- `join` - Join room (user:id, post:id)

### Server → Client
- `feed.post.created` - New post in feed
- `post.ai.result` - AI validation result
- `post.like.updated` - Post likes changed
- `post.comment.created` - New comment
- `post.escalated` - Post escalated to issue
- `issue.created` - New issue created
- `issue.updated` - Issue progress updated
- `issue.completed` - Issue marked complete
- `user.enforcement.updated` - User banned/suspended

---

## Troubleshooting

### Backend won't start
- Check MongoDB is running
- Verify `.env` configuration
- Check port 8080 is not in use

### Frontend can't connect to backend
- Verify backend is running on port 8080
- Check `VITE_API_BASE_URL` in frontend `.env`
- Check CORS settings in backend

### Image upload fails
- Verify Cloudinary credentials
- Check `CLOUDINARY_*` vars in both `.env` files
- Ensure API key matches cloud name

### Socket.io not connecting
- Check `VITE_SOCKET_URL` in frontend `.env`
- Verify backend Socket.io is initialized
- Check browser console for connection errors

---

## Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Use MongoDB Atlas or managed MongoDB
4. Deploy to Heroku/Railway/DigitalOcean
5. Update `CLIENT_ORIGIN` to production frontend URL

### Frontend
1. Update `.env` with production backend URL
2. Build: `npm run build`
3. Deploy `dist/` to Vercel/Netlify/Cloudflare Pages

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │◄───────►│   Backend    │◄───────►│   MongoDB   │
│  (React +   │  HTTP   │  (Express +  │         │             │
│   Vite)     │  WS     │  Socket.io)  │         └─────────────┘
└─────────────┘         └──────────────┘
       │                       │
       │                       │
       ▼                       ▼
┌─────────────┐         ┌──────────────┐
│ Cloudinary  │         │  Google OAuth│
│ (Media CDN) │         │              │
└─────────────┘         └──────────────┘
```

---

## Features Implemented

✅ JWT Authentication + Google OAuth
✅ Location-based feed (MongoDB geospatial)
✅ AI content validation (mock heuristic)
✅ Cloudinary signed uploads
✅ Real-time Socket.io events
✅ Engagement-based escalation to Issues
✅ Admin workflow (validate, progress, complete, extend)
✅ Auto-ban after 5 invalid reports
✅ Rate limiting (posts, comments, likes)
✅ Error handling & validation
✅ TypeScript throughout

---

## Support

For issues or questions:
- Check logs in browser console and terminal
- Verify all environment variables are set
- Ensure MongoDB and backend are running before starting frontend

**Your app is now fully connected and ready to use!** 🚀
