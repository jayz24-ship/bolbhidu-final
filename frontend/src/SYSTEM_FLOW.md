# Bol Bhidu - Complete System Flow Diagram

## 🔄 Auto-Registration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      USER CREATES POST                       │
│  (Description + Category + Location + Image/Video)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI VALIDATION (Mock)                       │
│           Checks if issue is genuine                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  Post Created & Saved │
          │  isRegisteredAsIssue: false │
          └──────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               USERS ENGAGE WITH POST                         │
│  • Like: +1 point                                            │
│  • Comment: +2 points                                        │
│  • Share: +3 points                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Calculate Engagement  │
         │ Score After Each      │
         │ Interaction          │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ Score >= 20?          │
         └───────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
       NO                YES
        │                 │
        │                 ▼
        │    ┌─────────────────────────┐
        │    │ checkAndRegisterAsIssue()│
        │    │ • Set isRegisteredAsIssue: true │
        │    │ • Dispatch 'registerIssue' event │
        │    │ • Show badge on post    │
        │    └─────────┬───────────────┘
        │              │
        │              ▼
        │    ┌─────────────────────────┐
        │    │ AdminContext Receives Event │
        │    │ • Creates new Issue     │
        │    │ • Status: Pending       │
        │    │ • Shows in Dashboard    │
        │    └─────────┬───────────────┘
        │              │
        └──────────────┴─────────────────►
                       │
                       ▼
              ┌────────────────┐
              │ POST IN FEED   │
              │ (with or without│
              │  issue badge)  │
              └────────────────┘
```

---

## 👨‍💼 Admin Issue Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ISSUE APPEARS IN ADMIN DASHBOARD                │
│  Status: Pending | Priority: By Engagement Score            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Admin Reviews Issue   │
         │ • Check description   │
         │ • View user info      │
         │ • Check engagement    │
         └───────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    INVALID          VALID
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ Mark Invalid │  │ Validate Issue   │
│ Status: Invalid│  │ • Set time required │
└──────┬───────┘  │ • Calculate deadline │
       │          │ • Status: Validated │
       │          │ • Progress: 10%    │
       ▼          └──────┬───────────┘
┌──────────────┐         │
│ Report User? │         │
└──────┬───────┘         │
       │                 │
      YES                │
       │                 │
       ▼                 │
┌──────────────────┐     │
│ reportUser()     │     │
│ • Increment count│     │
│ • If count >= 5: │     │
│   - Suspend 10 days │  │
│   - Block posting│     │
└──────┬───────────┘     │
       │                 │
       └─────────────────┴──────►
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Admin Tracks Progress  │
                    │ • Update % (0-100)     │
                    │ • Upload before/after  │
                    │ • Monitor deadline     │
                    └────────┬───────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
            Deadline Approaching   On Track
                    │                 │
                    ▼                 │
            ┌────────────────┐        │
            │ Extend Deadline?│       │
            │ (5 days, 1x)   │        │
            └────────┬───────┘        │
                     │                │
                    YES               │
                     │                │
                     ▼                │
            ┌────────────────┐        │
            │ extendDeadline()│       │
            │ +5 days        │        │
            │ deadlineExtended: true │
            └────────┬───────┘        │
                     │                │
                     └────────────────┴──────►
                                             │
                                             ▼
                              ┌──────────────────────┐
                              │ Issue Completed      │
                              │ • Upload after image │
                              │ • markResolved()    │
                              │ • Status: Resolved  │
                              │ • Progress: 100%    │
                              └─────────────────────┘
```

---

## 🚫 User Suspension Flow

```
┌─────────────────────────────────────────────────────────────┐
│              USER POSTS INVALID ISSUE                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         ADMIN REVIEWS & MARKS AS INVALID                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN CLICKS "REPORT USER"                      │
│           reportUser(issueId) called                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ Increment Report Count│
         │ reportCount++         │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ reportCount >= 5?     │
         └───────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
       NO                YES
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────────────┐
│ User Info    │  │ SUSPEND USER         │
│ Shows report │  │ suspendedUntil =     │
│ count badge  │  │ today + 10 days      │
└──────────────┘  └──────┬───────────────┘
                         │
                         ▼
                ┌─────────────────────────┐
                │ Update User Record      │
                │ • reportCount: 5+       │
                │ • suspendedUntil: Date  │
                │ Save to localStorage    │
                └──────┬──────────────────┘
                       │
                       ▼
              ┌────────────────────┐
              │ USER TRIES TO POST │
              └────────┬───────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │ CreatePostModal checks:     │
         │ if (suspendedUntil > now)   │
         └─────────┬───────────────────┘
                   │
          ┌────────┴────────┐
          │                 │
    Not Suspended      Suspended
          │                 │
          ▼                 ▼
   ┌──────────────┐  ┌──────────────────────┐
   │ Allow Post   │  │ BLOCK POST           │
   │ Creation     │  │ Show error:          │
   └──────────────┘  │ "Suspended for X days"│
                     └──────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ After 10 Days   │
                     │ Auto-unsuspend  │
                     │ (date expired)  │
                     └─────────────────┘
```

---

## 🔢 Engagement Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                          │
└─────┬───────────────┬───────────────┬───────────────────────┘
      │               │               │
    LIKE          COMMENT          SHARE
      │               │               │
      ▼               ▼               ▼
   ┌──────┐      ┌─────────┐     ┌─────────┐
   │ +1   │      │ +2      │     │ +3      │
   │ point│      │ points  │     │ points  │
   └──┬───┘      └────┬────┘     └────┬────┘
      │               │               │
      └───────────────┴───────────────┘
                      │
                      ▼
         ┌────────────────────────────┐
         │ CALCULATE TOTAL ENGAGEMENT │
         │ Score = likes +            │
         │        (comments × 2) +    │
         │        (shares × 3)        │
         └────────────┬───────────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Score >= 20?  │
              └───────┬───────┘
                      │
             ┌────────┴────────┐
             │                 │
            NO                YES
             │                 │
             ▼                 ▼
      ┌─────────────┐  ┌──────────────────┐
      │ Keep Post   │  │ REGISTER AS ISSUE│
      │ as Regular  │  │ Show badge       │
      └─────────────┘  │ Notify admin     │
                       └──────────────────┘

Example:
Post with 5 likes, 3 comments, 2 shares:
Score = 5 + (3×2) + (2×3) = 5 + 6 + 6 = 17 points
Result: Not yet an issue (needs 20)

Post with 8 likes, 4 comments, 2 shares:
Score = 8 + (4×2) + (2×3) = 8 + 8 + 6 = 22 points
Result: ✅ Registered as issue!
```

---

## 🏗️ Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         APP.TSX                              │
│  • Router                                                    │
│  • Protected Routes                                          │
│  • Context Providers                                         │
└─────┬───────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│                   CONTEXT PROVIDERS                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AuthContext  │  │ PostContext  │  │ AdminContext │      │
│  │ • user       │  │ • posts      │  │ • issues     │      │
│  │ • login      │  │ • createPost │  │ • validate   │      │
│  │ • logout     │  │ • likePost   │  │ • reportUser │      │
│  │ • reportCnt  │  │ • addComment │  │ • progress   │      │
│  │ • suspended  │  │ • checkIssue │  │ • resolve    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────┬───────────────────────────────────────────────────────┘
      │
      ├─── PUBLIC ROUTES
      │    ├── Landing Page
      │    ├── Login Page
      │    └── Register Page
      │
      ├─── PROTECTED ROUTES (Layout)
      │    │
      │    ├── Feed Page
      │    │   ├── Welcome Header
      │    │   ├── Engagement Info Card 🆕
      │    │   ├── PostCard (multiple)
      │    │   │   ├── Avatar + Username
      │    │   │   ├── Category Badge
      │    │   │   ├── Issue Badge 🆕
      │    │   │   ├── Content
      │    │   │   ├── Media (Image/Video)
      │    │   │   └── Actions (Like/Comment/Share)
      │    │   └── CreatePostModal
      │    │       ├── Suspension Check 🆕
      │    │       ├── Description Input
      │    │       ├── Category Select
      │    │       ├── Location Input/Detect
      │    │       └── Media Upload
      │    │
      │    ├── Post Details Page
      │    │   ├── Full Post View
      │    │   └── Comments Section
      │    │
      │    ├── Profile Page
      │    │   ├── User Info
      │    │   ├── Edit Profile
      │    │   └── Settings
      │    │
      │    └── Admin Page (Admin Only)
      │        ├── Stats Cards
      │        ├── Tabs
      │        │   ├── All Issues 🆕 (Priority Sort)
      │        │   ├── Pending
      │        │   ├── In Progress
      │        │   ├── Resolved
      │        │   └── Invalid
      │        └── Issue Cards
      │            ├── User Info + Report Badge 🆕
      │            ├── Suspension Badge 🆕
      │            ├── Description
      │            ├── Engagement Score
      │            ├── Status Badge
      │            ├── Progress Bar (if validated)
      │            ├── Before/After Images
      │            └── Actions
      │                ├── Validate (Pending)
      │                ├── Mark Invalid (Pending)
      │                ├── Report User 🆕 (Pending)
      │                ├── Update Progress (Validated)
      │                ├── Extend Deadline (Validated, 1x)
      │                └── Mark Resolved (Validated)
      │
      └─── LAYOUT
           ├── Sidebar (Desktop)
           │   ├── Logo
           │   ├── Navigation
           │   └── User Menu
           └── Bottom Nav (Mobile)
               ├── Feed
               ├── Profile
               └── Admin (if admin)
```

---

## 🗄️ Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────┐                                            │
│  │ Components   │                                            │
│  └──────┬───────┘                                            │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────┐       ┌──────────────┐                    │
│  │  Contexts    │◄─────►│ localStorage │                    │
│  │ (State Mgmt) │       └──────────────┘                    │
│  └──────┬───────┘                                            │
│         │                                                     │
│         ▼                                                     │
│  ┌──────────────┐                                            │
│  │ API Service  │ (Mock - Ready for Backend)                │
│  │ /utils/api.ts│                                            │
│  └──────┬───────┘                                            │
│         │                                                     │
└─────────┼─────────────────────────────────────────────────────┘
          │
          │ ← READY FOR INTEGRATION →
          │
┌─────────┼─────────────────────────────────────────────────────┐
│         │                  BACKEND                            │
│         ▼                                                     │
│  ┌──────────────┐                                            │
│  │ REST API     │                                            │
│  │ Endpoints    │                                            │
│  └──────┬───────┘                                            │
│         │                                                     │
│         ├──► Database (PostgreSQL/MongoDB)                   │
│         │    ├── users                                       │
│         │    ├── posts                                       │
│         │    ├── issues                                      │
│         │    └── comments                                    │
│         │                                                     │
│         ├──► File Storage (S3/Cloudinary)                    │
│         │    ├── post images                                 │
│         │    ├── post videos                                 │
│         │    ├── before images                               │
│         │    └── after images                                │
│         │                                                     │
│         ├──► AI Service (OpenAI/Google Vision)               │
│         │    └── validate post content                       │
│         │                                                     │
│         └──► WebSocket Server                                │
│              ├── real-time notifications                     │
│              ├── live issue updates                          │
│              └── instant comments                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 State Management Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTIONS                              │
└─────┬───────────────────────────────────────────────────────┘
      │
      ├─── Auth Actions
      │    ├── login() → Update user state
      │    ├── logout() → Clear user state
      │    └── register() → Create & set user
      │
      ├─── Post Actions
      │    ├── createPost() → Add to posts array
      │    ├── likePost() → Update likes, check engagement
      │    ├── addComment() → Update comments, check engagement
      │    └── checkAndRegisterAsIssue() → Event to Admin
      │
      └─── Admin Actions
           ├── validateIssue() → Update status, set deadline
           ├── invalidateIssue() → Mark invalid
           ├── reportUser() → Increment count, suspend if >= 5
           ├── updateProgress() → Update progress %
           ├── extendDeadline() → Add 5 days (1x)
           └── markResolved() → Set status, progress 100%
```

---

## 🔔 Event System

```
┌─────────────────────────────────────────────────────────────┐
│              POST REACHES 20 ENGAGEMENT                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
         ┌───────────────────────┐
         │ PostContext           │
         │ checkAndRegisterAsIssue() │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ window.dispatchEvent( │
         │   'registerIssue',    │
         │   { postData }        │
         │ )                     │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ AdminContext          │
         │ useEffect listener    │
         │ receives event        │
         └───────┬───────────────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ Create Issue Object   │
         │ Add to issues array   │
         │ Status: Pending       │
         └───────────────────────┘
```

---

## 📊 Priority Queue (Engagement Sorting)

```
All Issues Tab - Sorted by Engagement Score (Highest First)

┌─────────────────────────────────────────────────────────────┐
│ Issue #1 | Engagement: 95 | Pothole on Main St | Pending   │
│ ⭐⭐⭐⭐⭐ HIGH PRIORITY                                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue #2 | Engagement: 78 | Broken light | Validated        │
│ ⭐⭐⭐⭐ MEDIUM-HIGH PRIORITY                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue #3 | Engagement: 52 | Graffiti removal | In Progress  │
│ ⭐⭐⭐ MEDIUM PRIORITY                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue #4 | Engagement: 23 | Park cleanup | Pending          │
│ ⭐⭐ LOW-MEDIUM PRIORITY                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Issue #5 | Engagement: 20 | Sidewalk crack | Pending        │
│ ⭐ LOW PRIORITY (Just met threshold)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Status Indicators

```
POST STATUSES:
┌────────────────────────────────────────┐
│ 📝 Regular Post (< 20 engagement)      │
│    [No badge]                          │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🎯 Registered as Issue                 │
│    [Yellow "Registered as Issue" badge]│
└────────────────────────────────────────┘

USER STATUSES:
┌────────────────────────────────────────┐
│ ✅ Normal User (0-4 reports)           │
│    [No badge or count badge]           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⚠️  Reported User (1-4 reports)        │
│    [Red "X Reports" badge]             │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🚫 Suspended User (5+ reports)         │
│    [Red "Suspended" badge]             │
│    Cannot post for 10 days             │
└────────────────────────────────────────┘

ISSUE STATUSES:
┌────────────────────────────────────────┐
│ ⏳ Pending (Yellow badge)              │
│    Awaiting admin validation           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🔧 Validated/In Progress (Blue badge)  │
│    Progress: [████░░░░░░] 40%         │
│    Deadline: Oct 25, 2025              │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✅ Resolved (Green badge)              │
│    Progress: [██████████] 100%        │
│    Before/After images shown           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ❌ Invalid (Red badge)                 │
│    User reported for fake issue        │
└────────────────────────────────────────┘
```

---

## 📝 Summary

This system provides a complete, automated workflow for:

1. ✅ Users creating and engaging with community posts
2. ✅ Automatic elevation of high-engagement posts to official issues
3. ✅ Admin management with priority-based sorting
4. ✅ User accountability with reporting and suspension
5. ✅ Complete issue lifecycle tracking
6. ✅ Progress monitoring and deadline management
7. ✅ Resolution with before/after evidence

**All flows are fully implemented and ready for production use!**
