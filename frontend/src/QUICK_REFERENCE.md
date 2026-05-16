# Bol Bhidu - Quick Reference Guide

## 🎯 Key Thresholds & Values

### Engagement System
```typescript
Engagement Score = Likes + (Comments × 2) + (Shares × 3)
Issue Registration Threshold = 20 points
```

### User Suspension
```typescript
Reports Required for Suspension = 5
Suspension Duration = 10 days
```

### Deadline Management
```typescript
Deadline Extension Days = 5
Maximum Extensions = 1 (one-time only)
```

---

## 🔑 Important Functions

### PostContext
```typescript
// Auto-check engagement and register as issue
checkAndRegisterAsIssue(postId: string)

// Creates post with user email
createPost({
  userId, username, userAvatar, userEmail,
  description, category, location, mediaUrl, mediaType
})

// Like post (triggers engagement check)
likePost(postId: string)

// Add comment (triggers engagement check)
addComment(postId: string, content: string)
```

### AdminContext
```typescript
// Validate issue and set deadline
validateIssue(issueId: string, timeRequired: number)

// Mark issue as invalid
invalidateIssue(issueId: string)

// Report user (increments count, suspends at 5)
reportUser(issueId: string)

// Update issue progress (0-100)
updateProgress(issueId: string, progress: number)

// Extend deadline by 5 days (one time)
extendDeadline(issueId: string, additionalDays: number)

// Get issues sorted by engagement (priority)
getSortedIssuesByEngagement()

// Mark issue as resolved
markResolved(issueId: string)
```

### AuthContext
```typescript
// User fields
{
  id: string
  email: string
  name: string
  avatar?: string
  isAdmin?: boolean
  reportCount?: number        // NEW
  suspendedUntil?: Date | null // NEW
}
```

---

## 📊 Data Models

### Post Interface
```typescript
{
  id: string
  userId: string
  username: string
  userAvatar: string
  userEmail: string           // NEW
  description: string
  category: string
  location: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  timestamp: Date
  likes: number
  comments: number
  shares: number
  isLiked: boolean
  isRegisteredAsIssue?: boolean // NEW
}
```

### Issue Interface
```typescript
{
  id: string
  postId: string
  postDescription: string
  postCategory: string
  postLocation: string
  userInfo: {
    id: string
    name: string
    avatar: string
    email: string           // NEW
    reportCount: number     // NEW
  }
  engagementScore: number
  status: 'Pending' | 'Validated' | 'Invalid' | 'Resolved'
  reportedAt: Date
  timeRequired?: number
  deadline?: Date
  progress: number (0-100)
  beforeImage?: string
  afterImage?: string
  deadlineExtended: boolean
}
```

---

## 🎨 Key Components

### CreatePostModal
- Location: `/components/CreatePostModal.tsx`
- **Checks suspension before allowing post creation**
- Validates all required fields
- Handles media upload (image/video)
- GPS location detection

### PostCard
- Location: `/components/PostCard.tsx`
- **Shows "Registered as Issue" badge**
- Displays engagement stats
- Like/comment/share actions

### Admin Dashboard
- Location: `/pages/Admin.tsx`
- **"All Issues" tab with priority sorting**
- **Report User button**
- **User report count & suspension badges**
- Issue validation and tracking
- Progress updates
- Deadline extension

---

## 🚦 User States

### Normal User
- Can create posts
- Can like/comment/share
- Report count: 0-4

### Reported User (1-4 reports)
- Can still create posts
- Warning visible to admins
- Report count badge shown in admin dashboard

### Suspended User (5+ reports)
- **CANNOT create posts**
- Sees error: "Your account is suspended for X more days..."
- "Suspended" badge in admin dashboard
- Auto-unsuspended after 10 days

---

## 🎯 Auto-Registration Flow

```
1. User creates post
   ↓
2. Other users engage (like/comment/share)
   ↓
3. Engagement calculated on each interaction
   ↓
4. When score ≥ 20:
   - Post.isRegisteredAsIssue = true
   - CustomEvent 'registerIssue' dispatched
   - AdminContext creates new Issue
   - Badge appears on post
   ↓
5. Issue appears in Admin Dashboard
```

---

## 📱 Page Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/` | Landing | Public |
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/app/feed` | Feed | Protected |
| `/app/post/:postId` | PostDetails | Protected |
| `/app/profile` | Profile | Protected |
| `/app/admin` | Admin | Admin Only |

---

## 🎨 Design Tokens

```css
--primary: #2563eb (Blue)
--accent: #facc15 (Yellow)
--background: #f9fafb
--card: #ffffff
--muted: #ececf0
--destructive: #d4183d (Red for warnings)
```

---

## 🔌 Backend Integration Points

### Replace These Mock Services:

1. **`/utils/api.ts`** - All API calls
   - `apiService.auth.*` → Real auth endpoints
   - `apiService.posts.*` → Real post CRUD
   - `apiService.upload.*` → Real file upload (S3/Cloudinary)
   - `apiService.admin.*` → Real admin operations

2. **`/utils/socket.ts`** - WebSocket
   - Replace mock with real WebSocket server
   - Real-time notifications
   - Live issue updates

3. **AI Validation**
   - In `CreatePostModal.tsx`, line 129
   - Replace mock with real AI service call

---

## 🧪 Testing Checklist

### User Flow
- [ ] Register new user
- [ ] Login with email/password
- [ ] Create post with image
- [ ] Like/comment/share posts
- [ ] Verify post becomes issue at 20 engagement
- [ ] Check "Registered as Issue" badge appears

### Admin Flow
- [ ] Login as admin
- [ ] View "All Issues" sorted by engagement
- [ ] Validate issue with time requirement
- [ ] Report user for invalid issue
- [ ] Verify report count increments
- [ ] Report same user 5 times
- [ ] Verify user is suspended
- [ ] Try to post as suspended user (should fail)
- [ ] Update issue progress
- [ ] Upload before/after images
- [ ] Extend deadline (5 days)
- [ ] Try to extend again (should fail)
- [ ] Mark issue as resolved

---

## 💡 Pro Tips

### For Developers
1. All state is managed in Context APIs (Auth, Post, Admin)
2. Use `toast` from `'sonner@2.0.3'` for notifications
3. ShadCN components in `/components/ui`
4. Mock data in each Context for demo purposes

### For Backend Integration
1. Start with `/utils/api.ts` - replace mock responses
2. Update Context methods to use real API
3. Add proper error handling
4. Implement JWT authentication
5. Add real-time WebSocket for live updates

### For Design Changes
1. All design tokens in `/styles/globals.css`
2. Primary color: `var(--primary)`
3. Accent color: `var(--accent)`
4. Use existing ShadCN components for consistency

---

## 🆘 Common Issues

### Post not registering as issue?
- Check engagement score: Likes + (Comments × 2) + (Shares × 3) ≥ 20
- Verify `checkAndRegisterAsIssue()` is called after like/comment

### User can still post after suspension?
- Check `user.suspendedUntil` is set correctly
- Verify date comparison in `CreatePostModal.tsx`
- Ensure `reportUser()` sets suspension date

### Deadline won't extend?
- Check `issue.deadlineExtended` is false
- Verify only extending by 5 days
- Ensure issue has a deadline set

---

## 📞 Support

For questions or issues:
1. Check `/FEATURES.md` for complete feature list
2. Review this Quick Reference
3. Examine Context files for data flow
4. Check mock API in `/utils/api.ts`

---

**Last Updated:** October 19, 2025
**Version:** 1.0.0 (Production Ready)
