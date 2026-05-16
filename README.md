# 🌍 BolBhidu — AI-Powered Community Issue Reporting Platform

BolBhidu is an AI-powered social media platform designed to help citizens report genuine local civic issues and track their resolution transparently. The system combines Artificial Intelligence, real-time communication, geolocation services, and community engagement features to bridge the communication gap between citizens and authorities. 

---

## ✨ Features

* 🤖 AI-powered post verification using OpenAI APIs
* 📍 Location-based community feed
* 📝 Civic issue reporting with image/video uploads
* 👍 Engagement system (likes, comments, shares)
* 🚨 Auto-promotion of high-priority issues
* 📊 Admin dashboard for issue management
* ⏳ SLA-based issue tracking & progress monitoring
* 🔔 Real-time notifications using Socket.io
* 🔐 JWT Authentication & Google OAuth
* ☁️ Cloudinary media uploads
* 📱 Responsive modern UI with Tailwind CSS
* 🧠 Spam/fake content detection using AI
* 📈 Progress updates with before/after proof uploads

---

# 🏗️ Architecture

```text
┌─────────────────────────────────┐
│         React Frontend          │
│ Tailwind CSS + Socket.io Client │
└──────────────┬──────────────────┘
               │ HTTP / WebSocket
┌──────────────▼──────────────────┐
│        Node.js + Express        │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Authentication Layer     │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ AI Verification Module   │   │
│  │ (OpenAI Vision + Text)   │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Engagement & Promotion   │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Admin Dashboard System   │   │
│  └──────────────────────────┘   │
└──────────────┬──────────────────┘
               │
       ┌───────▼────────┐
       │    MongoDB     │
       │ Geospatial DB  │
       └────────────────┘
```

---

# 🚀 Core Workflow

```text
User Creates Post
        ↓
AI Verification
        ↓
Genuine Post Published
        ↓
Community Engagement
(Likes/Comments/Shares)
        ↓
Threshold Reached
        ↓
Issue Auto-Promoted
        ↓
Admin Review
        ↓
Progress Updates & Resolution
```

---

# 🔬 Tech Stack

| Component       | Technology          |
| --------------- | ------------------- |
| Frontend        | React.js            |
| Styling         | Tailwind CSS        |
| Backend         | Node.js, Express.js |
| Database        | MongoDB             |
| AI Verification | OpenAI API          |
| Authentication  | JWT, Google OAuth   |
| Realtime        | Socket.io           |
| File Storage    | Cloudinary          |
| Validation      | Zod / Joi           |
| API Testing     | Postman             |

---

# 📁 Project Structure

```text
BolBhidu/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── context/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── sockets/
│   └── utils/
│
├── uploads/
├── .env
├── package.json
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/your-username/bolbhidu.git

cd bolbhidu
```

---

## Backend Setup

```bash
cd server

npm install

npm run dev
```

---

## Frontend Setup

```bash
cd client

npm install

npm start
```

---

# 🔐 Environment Variables

Create a `.env` file:

```env
MONGO_URI=your_mongodb_uri

JWT_SECRET=your_secret_key

OPENAI_API_KEY=your_openai_api_key

CLOUDINARY_CLOUD_NAME=your_cloud_name

CLOUDINARY_API_KEY=your_api_key

CLOUDINARY_API_SECRET=your_api_secret
```

---

# 🤖 AI Verification System

The AI module analyzes:

* uploaded images/videos
* captions/descriptions
* spam patterns
* civic issue relevance

Only verified genuine posts are published publicly. Fake or spam content is automatically rejected with reasoning feedback. 

---

# 📊 Admin Dashboard

Admins can:

* review promoted issues
* update issue progress
* upload before/after proof images
* reject fake issues
* manage deadlines and SLAs
* monitor community engagement

---

# 📍 Location-Based Feed

Users can:

* discover nearby issues
* engage with local reports
* support community-driven priorities
* view issue progress in real time

MongoDB geospatial indexing is used for nearby feed queries. 

---

# 🛡️ Moderation System

* Fake reports generate user strikes
* 5 strikes result in temporary suspension
* AI fail-safe validation prevents spam publishing
* Admin verification ensures accountability

---

# 📈 Future Scope

* Multilingual support (Hindi, Marathi, English)
* Mobile applications (Android/iOS)
* Government grievance portal integration
* AI-based severity prediction
* User reputation & reward system
* Advanced multimodal AI verification



---

# 🏆 Highlights

✅ AI-powered civic issue verification
✅ Real-time community engagement system
✅ Geolocation-based social feed
✅ Transparent issue resolution workflow
✅ Smart governance & citizen participation
✅ Modern full-stack architecture

---


# 📄 License

This project is developed for educational and community innovation purposes.
