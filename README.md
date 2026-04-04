# Suraksha Health — Decentralized Emergency Health Vault

A full-stack application for securely managing medical records with emergency break-glass procedures. Built with Next.js 14 (App Router) on the frontend and Express.js on the backend.

## 🎯 Features

- **🔐 Secure Authentication** — JWT access/refresh token system with httpOnly cookies
- **👤 Role-Based Access** — Patient, Doctor, and Admin roles with granular permissions
- **🔑 Password Reset** — Email-based password recovery via Resend
- **📱 Responsive UI** — Mobile-first design with Tailwind CSS
- **🛡️ Security First** — Rate limiting, password hashing (bcrypt), audit logging
- **🏥 Health Records** — *(Coming Soon)* Encrypted health record storage
- **🚨 Emergency Access** — *(Coming Soon)* Break-glass procedures for emergencies

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Express.js, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | JWT (access + refresh tokens), bcrypt |
| **Email** | Resend |
| **Validation** | Zod (frontend), express-validator (backend) |

## 📂 Project Structure

```
suraksha-health/
├── backend/                 # Express API Server
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── controllers/     # Route handlers (auth, etc.)
│   │   ├── middleware/      # Auth, rate limiting, error handling
│   │   ├── models/          # Database models (User, AuditLog)
│   │   ├── routes/          # API route definitions
│   │   └── services/        # Business logic (auth, email)
│   ├── server.js            # Server entry point
│   └── .env                 # Environment variables (not tracked)
│
├── frontend/                # Next.js 14 App
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (auth)/      # Auth pages (login, register, etc.)
│   │   │   └── dashboard/   # Protected dashboard pages
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React contexts (AuthContext)
│   │   └── lib/             # Utilities (API client, helpers)
│   └── .env.local           # Frontend environment variables
│
├── database/                # SQL migration scripts
├── API_CONTRACT.md          # 📄 Full API documentation for Dev 2
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Supabase account (free tier works)
- Resend account for password reset emails (optional)

### Environment Setup

**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=5000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Email (optional - for password reset)
RESEND_API_KEY=re_xxxxxxxxxxxx
FRONTEND_URL=http://localhost:3000
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Running the Backend

```bash
cd backend
npm install
node server.js
```

Server runs at `http://localhost:5000`

**Health Check:** `GET http://localhost:5000/health`

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:3000`

### Database Setup

Run the SQL scripts in `database/` folder in your Supabase SQL editor:
1. Create `users` table
2. Create `refresh_tokens` table
3. Create `audit_log` table
4. Create `password_reset_tokens` table

---

## 📄 API Documentation

See **[API_CONTRACT.md](./API_CONTRACT.md)** for complete API documentation including:

- All auth endpoints with request/response schemas
- Authentication middleware usage
- Role-based access control examples
- Error response formats
- Rate limiting details

---

## 🔐 Authentication Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend   │         │  Supabase   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  POST /auth/login     │                       │
       │──────────────────────>│                       │
       │                       │  Verify credentials   │
       │                       │──────────────────────>│
       │                       │<──────────────────────│
       │  { accessToken }      │                       │
       │  + refreshToken cookie│                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  GET /api/records     │                       │
       │  Authorization: Bearer│                       │
       │──────────────────────>│                       │
       │                       │  Validate JWT         │
       │  { records }          │                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  (token expires)      │                       │
       │                       │                       │
       │  POST /auth/refresh   │                       │
       │  (cookie sent auto)   │                       │
       │──────────────────────>│                       │
       │  { newAccessToken }   │                       │
       │<──────────────────────│                       │
```

---

## 👥 Team Collaboration

### Current Role Split

| Developer | Responsibility | Status |
|-----------|---------------|--------|
| **Dev 1** | Auth system, database setup, login/register UI | ✅ Complete |
| **Dev 2** | Records management, emergency access features | 🚧 Starting |

### For Dev 2: Getting Started

1. Read **[API_CONTRACT.md](./API_CONTRACT.md)** — complete API documentation
2. Use `authenticateToken` middleware to protect your routes
3. Use `requireRole()` for role-based access control
4. Access user info via `req.user.userId` and `req.user.role`

**Example protected route:**
```javascript
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');

router.get('/records', authenticateToken, getRecords);
router.post('/records', authenticateToken, requireRole('patient', 'admin'), createRecord);
```

### Git Workflow

1. **Never commit directly to `main`**
2. Create feature branches: `git checkout -b feature/records-api`
3. Open Pull Requests for review
4. Keep `main` updated: `git pull origin main`

---

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:5000/health
# { "status": "ok", "message": "Suraksha Health API is running 🚀" }
```

### Auth Flow Test
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","fullName":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}'
```

---

## 📝 License

Private project — all rights reserved.

---


