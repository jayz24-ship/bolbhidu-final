# 🚀 AI Providers Quick Start

## TL;DR - Get Started in 2 Minutes

### 🎯 Best Choice: Google Gemini (Free)

1. **Get API Key:**
   - Visit: https://aistudio.google.com/app/apikey
   - Click "Create API Key"
   - Copy the key (starts with `AIzaSy...`)

2. **Add to `.env`:**
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

4. **Done!** ✅ 
   - 60 free requests per minute
   - No credit card required
   - Better than paid OpenAI for this use case

---

## 🆓 All Free Options

| Provider | Setup Time | Free Limit | Best For |
|----------|-----------|------------|----------|
| **[Gemini](https://aistudio.google.com/app/apikey)** ⭐ | 30 seconds | 60 req/min | Production |
| **[Groq](https://console.groq.com)** ⚡ | 1 minute | 30 req/min | Speed |
| **[HuggingFace](https://huggingface.co)** | 2 minutes | 1000/day | Privacy |

---

## 📋 Environment Variables

Add to `backend/.env`:

```env
# Pick ONE (or multiple for failover):

# Option 1: Gemini (RECOMMENDED)
GEMINI_API_KEY=AIzaSy...

# Option 2: Groq (Alternative)
# GROQ_API_KEY=gsk_...

# Option 3: HuggingFace (Alternative)
# HUGGINGFACE_API_KEY=hf_...
```

---

## 🧪 Test It Works

1. Start backend: `npm run dev`
2. Create a post through the app
3. Check logs - should see:
   ```
   [AI Verification] 🚀 Trying Gemini...
   [AI Verification] ✅ Gemini succeeded
   ```

---

## 💡 Pro Tips

- **Use Gemini** - Best free tier, most reliable
- **Add Groq as backup** - For automatic failover
- **No API key?** - App falls back to heuristic rules (less accurate but works)

---

## 📚 Full Documentation

See `AI_SETUP_GUIDE.md` for:
- Detailed setup instructions
- Troubleshooting guide
- Comparison of all providers
- Advanced configuration

---

## ⚠️ Common Issues

### "No API key configured"
→ Add `GEMINI_API_KEY=...` to `.env` and restart

### "API error: 401"
→ Check your API key is correct (copy-paste carefully)

### "AI validation taking too long"
→ Use Groq instead (fastest), or check internet connection

---

## 🎉 You're Done!

With Gemini configured, you get:
- ✅ AI-powered content validation
- ✅ Spam/NSFW detection
- ✅ 60 free requests per minute
- ✅ No credit card required
- ✅ Better than paid alternatives

**Total setup time: < 2 minutes** 🚀
