# Suraksha Health — Decentralized Emergency Health Vault

A full-stack application for securely managing medical records with emergency break-glass procedures. Built with Next.js 14 (App Router) on the frontend and Express.js on the backend.

## 🎯 Features

### ✅ Implemented
- **🔐 Secure Authentication** — JWT access/refresh token system with httpOnly cookies
- **🔑 Google OAuth** — One-click sign-in with Google (via `@react-oauth/google`)
- **📧 Email Verification** — New users must verify their email before accessing the app
- **🔁 Password Reset** — Email-based password recovery via Nodemailer (SMTP)
- **👤 Role-Based Access** — Patient, Doctor, and Admin roles with granular permissions
- **🆔 Unique User IDs** — Automated human-readable unique IDs for all users
- **🏥 Health Records** — Encrypted health record CRUD
- **🚨 Emergency Access** — Break-glass procedures for emergencies
- **🌍 Geo-Fenced Override** — GPS-based location verification for emergency overrides
- **👔 Admin Escalation** — Secondary hospital admin approval for emergency requests
- **⏱️ Time-Bound Consent** — Granular time-based access control for medical emergencies
- **👨‍👩‍👧 Family Delegation** — Guardian linking for proxy emergency approvals
- **👁️ Transparent Auditing** — Real-time access logs UI for patients
- **📱 Responsive UI** — Mobile-first design with Tailwind CSS
- **🛡️ Security First** — Rate limiting, password hashing (bcrypt), audit logging
- **⛓️ Web3 Vault** — Smart contract layer for on-chain health record storage
- **🔗 IPFS Storage** — Decentralized file storage for medical scans (via Pinata)

### 🚧 Coming Soon
- **📊 Dashboard** — Patient/Doctor dashboards with analytics

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| **Backend** | Express.js, Node.js |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | JWT (access + refresh tokens), bcrypt, Google OAuth |
| **Email** | Nodemailer (SMTP) |
| **Web3** | Solidity smart contracts |
| **Validation** | Zod (frontend), express-validator (backend) |

## 📂 Project Structure

```
suraksha-health/
├── backend/                 # Express API Server
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── controllers/     # Route handlers (auth, etc.)
│   │   ├── middleware/       # Auth, rate limiting, error handling
│   │   ├── models/          # Database models (User, AuditLog)
│   │   ├── routes/          # API route definitions
│   │   └── services/        # Business logic
│   │       ├── authService.js          # JWT & password auth
│   │       ├── emailService.js         # Nodemailer email delivery
│   │       └── googleAuthService.js    # Google OAuth token verification
│   ├── server.js            # Server entry point
│   └── .env                 # Environment variables (not tracked)
│
├── frontend/                # Next.js 14 App
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (auth)/      # Auth pages
│   │   │   │   ├── login/           # Login page
│   │   │   │   ├── register/        # Registration page
│   │   │   │   ├── forgot-password/ # Password reset request
│   │   │   │   ├── reset-password/  # New password form
│   │   │   │   ├── check-email/     # "Check your email" prompt
│   │   │   │   └── verify-email/    # Email verification handler
│   │   │   └── dashboard/   # Protected dashboard pages
│   │   ├── components/
│   │   │   ├── auth/        # Auth components (GoogleLoginButton, etc.)
│   │   │   └── ui/          # Shared UI components
│   │   ├── context/         # React contexts (AuthContext)
│   │   ├── lib/             # Utilities (API client, helpers)
│   │   └── types/           # TypeScript type definitions
│   └── .env.local           # Frontend environment variables
│
├── web3-vault/              # Smart Contract Layer
│   ├── contracts/           # Solidity contracts
│   ├── crypto/              # Encryption utilities
│   └── backend/             # Web3 backend integration
│
├── database/                # SQL migration scripts
├── API_CONTRACT.md          # 📄 Full API documentation
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- Supabase account (free tier works)
- Google Cloud Console project (for OAuth client ID)
- SMTP email credentials (Gmail App Password, or any SMTP provider)

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

# IPFS Storage (Pinata)
PINATA_API_KEY=your-pinata-api-key
PINATA_API_SECRET=your-pinata-api-secret
PINATA_JWT=your-pinata-jwt

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Email (Gmail SMTP)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM_NAME=Suraksha Health
FRONTEND_URL=http://localhost:3000
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### Running the Backend

```bash
cd backend
npm install
npm run dev
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

Run the SQL script in `database/` folder in your Supabase SQL editor:
- `suraksha_health_schema.sql` — Creates all required tables (`users`, `refresh_tokens`, `audit_log`, `password_reset_tokens`)

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

### Email + Password
```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │         │   Backend   │         │  Supabase   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  POST /auth/register  │                       │
       │──────────────────────>│  Create user           │
       │                       │──────────────────────>│
       │  "Check your email"   │  Send verification    │
       │<──────────────────────│  email (Nodemailer)   │
       │                       │                       │
       │  GET /auth/verify?    │                       │
       │  token=xxx            │  Mark email verified  │
       │──────────────────────>│──────────────────────>│
       │                       │                       │
       │  POST /auth/login     │                       │
       │──────────────────────>│  Verify credentials   │
       │                       │──────────────────────>│
       │  { accessToken }      │                       │
       │  + refreshToken cookie│                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  POST /auth/refresh   │                       │
       │  (cookie sent auto)   │                       │
       │──────────────────────>│                       │
       │  { newAccessToken }   │                       │
       │<──────────────────────│                       │
```

### Google OAuth
```
┌─────────────┐     ┌──────────┐     ┌─────────────┐     ┌───────────┐
│   Frontend  │     │  Google  │     │   Backend   │     │ Supabase  │
└──────┬──────┘     └────┬─────┘     └──────┬──────┘     └─────┬─────┘
       │                  │                  │                   │
       │  Google Sign-In  │                  │                   │
       │─────────────────>│                  │                   │
       │  { idToken }     │                  │                   │
       │<─────────────────│                  │                   │
       │                  │                  │                   │
       │  POST /auth/google { idToken }      │                   │
       │────────────────────────────────────>│  Verify token     │
       │                  │                  │  Find/create user │
       │                  │                  │──────────────────>│
       │  { accessToken } + refreshToken     │                   │
       │<────────────────────────────────────│                   │
```

---

## 👥 Team Collaboration

### Current Role Split

| Developer | Responsibility | Status |
|-----------|---------------|--------|
| **Dev 1** | Auth system (JWT + Google OAuth), email verification, password reset, database setup, login/register UI | ✅ Complete |
| **Dev 2** | Records management, file uploads (Pinata), cross-verification logic, emergency access features, and patient profiles | ✅ Complete |
| **Dev 2** | Dashboards with emergency profiles and UI layouts | ✅ Complete |

### Emergency Access Workflow

1. **Identify Patient:** The doctor enters the patient's UUID into the **Patient Search** page.
2. **Declare Emergency:** If the patient is unconscious and cannot provide consent (their exact registered name for cross-verification), the doctor clicks the **"🚨 Declare Emergency"** button.
3. **Temporary Access Granted:** The doctor gets immediate, audited access to the patient's **Emergency Profile** (blood group, allergies) and **Health Records** for 2 hours.
4. **Delegate Notification:** The system instantly notifies the patient's registered "Emergency Contacts" (Delegates) via email/phone that a doctor accessed their records.
5. **Audit Logging:** The access is permanently logged in the patient's Audit Log for transparency.

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
