# Quick Start Guide - Bol Bhidu

## ✅ Prerequisites Completed
- ✅ Backend dependencies installed
- ✅ Frontend dependencies installed
- ✅ API integration complete
- ✅ Socket.io real-time events configured

---

## 🚀 Start Your App (3 Steps)

### Step 1: Configure Environment Variables

#### Backend (.env already created)
Edit `backend/.env` and set:
```env
JWT_SECRET=your_secret_key_here_change_this
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### Frontend (.env already created)
Edit `frontend/.env` and set:
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
```

### Step 2: Start MongoDB
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas and update MONGO_URI in backend/.env
```

### Step 3: Start Backend & Frontend

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Wait for: `MongoDB connected` and `Server listening on :8080`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🎉 Access Your App

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8080
- **Health Check:** http://localhost:8080/health

---

## 🧪 Test Features

1. **Register/Login** → JWT token stored automatically
2. **Create Post** → Upload image, AI validates (~1s)
3. **Like/Comment** → Real-time updates via Socket.io
4. **Location Feed** → Posts near you (25km radius)
5. **Engagement → Issue** → 50+ engagement auto-escalates
6. **Admin Dashboard** → Validate, progress, complete issues

---

## 📝 Quick Reference

### Default Ports
- Frontend: `5173` (Vite)
- Backend: `8080` (Express)
- MongoDB: `27017` (local)

### Admin User
To create an admin, run in MongoDB:
```js
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

### Socket.io Events (Check Browser Console)
- `post.ai.result` - AI validation complete
- `post.like.updated` - Likes changed
- `post.escalated` - Issue created
- `user.enforcement.updated` - User banned

---

## 🐛 Troubleshooting

**Backend won't start?**
- Check MongoDB is running
- Verify `.env` has all required vars
- Port 8080 available?

**Frontend can't connect?**
- Backend running on port 8080?
- Check `VITE_API_BASE_URL=http://localhost:8080` in frontend/.env

**Upload fails?**
- Verify Cloudinary credentials in BOTH .env files
- Cloud name and API key must match

---

## 🎯 Your App is Ready!

Everything is connected and configured. Just:
1. Set environment variables
2. Start MongoDB
3. Run backend & frontend

**Happy coding! 🚀**
