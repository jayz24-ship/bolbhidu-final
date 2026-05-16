# 🔧 AI Validation Troubleshooting

## Problem: "Validated using heuristic rules (AI unavailable)"

This means all AI providers failed and the system fell back to simple rule-based validation.

---

## 🔍 Step-by-Step Debugging

### Step 1: Check API Key is Set

```bash
# Windows PowerShell
cd C:\Users\Jay\Desktop\bolbhidu-final\backend
Get-Content .env | Select-String "GEMINI"
```

**Expected:** Should show your API key
```
GEMINI_API_KEY=AIzaSyCCvjgee2fRBtkLtlSpIxlS2eUChK4PsXY
```

**If empty:** Add the key to `.env` file

---

### Step 2: Test API Key Directly

```bash
# In backend folder
node test-gemini.js
```

**This will:**
- ✅ Check if key exists
- ✅ Test actual API call
- ✅ Show detailed error if it fails

**Expected output:**
```
🔍 Gemini API Key Test
================================
✅ API Key found: AIzaSyCCvj...
📏 Key length: 39 characters
🚀 Testing API call...
📊 Response status: 200 OK
✅ API call successful!
```

**If you get errors here, the API key is invalid!**

---

### Step 3: Restart Backend Server

**IMPORTANT:** After adding/changing API keys, you MUST restart!

```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

---

### Step 4: Check Backend Logs

When you create a post, look for these logs:

```
[AI Verification] 🔍 Starting verification...
[AI Verification] 🔑 API Keys Status:
  - GEMINI_API_KEY: ✅ SET (AIzaSyCCvj...)
  - GROQ_API_KEY: ❌ NOT SET
  - OPENAI_API_KEY: ❌ NOT SET
  - HUGGINGFACE_API_KEY: ❌ NOT SET
[AI Verification] 📋 Available providers: Gemini
[AI Verification] 🚀 Trying Gemini...
[Gemini] Calling API...
[AI Verification] ✅ Gemini succeeded: { isValid: true, score: 85, ... }
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "No Gemini API key configured"

**Symptoms:**
```
[AI Verification] ⏭️ Gemini not configured, skipping...
[AI Verification] ⚠️ All AI providers failed
```

**Fix:**
1. Check `.env` file has `GEMINI_API_KEY=...`
2. Make sure no spaces around the `=`
3. Restart server

---

### Issue 2: "Gemini API error: 400"

**Symptoms:**
```
[AI Verification] ❌ Gemini failed:
   Error: Gemini API error: 400 - API key not valid
```

**Fix:**
1. API key is incorrect or expired
2. Get new key from: https://aistudio.google.com/app/apikey
3. Make sure "Generative Language API" is enabled
4. Replace in `.env` and restart

---

### Issue 3: "Gemini API error: 403"

**Symptoms:**
```
[AI Verification] ❌ Gemini failed:
   Error: Gemini API error: 403 - Permission denied
```

**Fix:**
1. API key doesn't have correct permissions
2. Regenerate key at: https://aistudio.google.com/app/apikey
3. Make sure you're using the correct Google account

---

### Issue 4: "Gemini API error: 429"

**Symptoms:**
```
[AI Verification] ❌ Gemini failed:
   Error: Gemini API error: 429 - Quota exceeded
```

**Fix:**
1. You've hit the rate limit (60 requests/minute)
2. Wait 1 minute and try again
3. Or add a backup provider (Groq):
   ```env
   GROQ_API_KEY=gsk_...
   ```

---

### Issue 5: Server not loading .env file

**Symptoms:**
```
[AI Verification] 🔑 API Keys Status:
  - GEMINI_API_KEY: ❌ NOT SET
```

**But you KNOW it's in .env file!**

**Fix:**
1. Make sure `.env` is in `backend/` folder (not root)
2. Check file is named exactly `.env` (not `.env.txt`)
3. Restart server (important!)
4. Check for syntax errors in `.env`:
   ```env
   # ✅ Correct
   GEMINI_API_KEY=AIzaSy...
   
   # ❌ Wrong (has quotes)
   GEMINI_API_KEY="AIzaSy..."
   
   # ❌ Wrong (has spaces)
   GEMINI_API_KEY = AIzaSy...
   ```

---

## 🧪 Quick Test Commands

### Test 1: Check environment is loaded
```bash
cd backend
node -e "require('dotenv').config(); console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY?.substring(0,10) + '...')"
```

### Test 2: Check from TypeScript
```bash
cd backend
npx tsx -e "import {env} from './src/config/env.js'; console.log('GEMINI_API_KEY:', env.GEMINI_API_KEY?.substring(0,10) + '...')"
```

### Test 3: Full API test
```bash
cd backend
node test-gemini.js
```

---

## ✅ Verification Checklist

- [ ] API key is in `.env` file
- [ ] `.env` file is in `backend/` folder
- [ ] No quotes around API key value
- [ ] No spaces around `=` sign
- [ ] Server was restarted after adding key
- [ ] `test-gemini.js` passes successfully
- [ ] Backend logs show "✅ SET" for GEMINI_API_KEY
- [ ] Backend logs show "Trying Gemini..." when creating post

---

## 📞 Still Not Working?

### 1. Check your API key is valid:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY_HERE" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```

Should return JSON, not an error.

### 2. Share these logs for help:
- Output of `node test-gemini.js`
- Backend console logs when creating a post
- Content of `.env` file (hide the full API key!)

---

## 💡 Pro Tips

1. **Use test script first** - Run `node test-gemini.js` before starting app
2. **Check logs always** - Backend logs tell you exactly what's happening
3. **Restart server** - 90% of issues are fixed by restarting after changes
4. **Add backup provider** - Configure Groq too for automatic failover
5. **Monitor rate limits** - Gemini allows 60 req/min

---

## 🎯 Quick Fix Recipe

```bash
# 1. Go to backend folder
cd C:\Users\Jay\Desktop\bolbhidu-final\backend

# 2. Test API key
node test-gemini.js

# 3. If test passes, restart server
npm run dev

# 4. Create a post and check logs
# Should see: "[AI Verification] ✅ Gemini succeeded"
```

If `test-gemini.js` fails, your API key is the problem.
If `test-gemini.js` passes but app still uses heuristic, server wasn't restarted properly.
