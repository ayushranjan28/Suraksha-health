# Decentralized Emergency Health Vault

A full-stack application built to seamlessly and securely manage medical records with emergency break-glass procedures. The application uses Next.js on the frontend and Express on the backend.

## 🎯 Goal
A secure health vault with:
- Clean folder structure & modular architecture
- Working backend skeleton (Express)
- Working frontend skeleton (Next.js)
- Access Control system and Emergency Access features
- Data encrypted at rest via AES (crypto-js) and authenticated with JWT.

## 📂 Project Structure

```
medisafe/
├── backend/        # Express API Server
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── server.js   # Server Entry Point
│   ├── package.json
│   └── .env        # Backend Environments (not tracked)
├── frontend/       # Next.js App
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── tailwind.config.ts
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (if you haven't yet, though this was done in onboarding):
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   node server.js
   ```
   *Server will run at `http://localhost:5000`*

4. Health Check:
   * Run GET `http://localhost:5000/health`
   * Response: `{ status: 'ok', message: 'MediSafe API is running 🚀' }`

### Running the Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser to see the Next.js landing page.

---

## 👥 Team Structure & Collaboration (2 Developers)

Since there are two developers working on this project, here is the recommended split and workflow:

### 1. Suggested Role Split
**Option A: Frontend vs. Backend Split**
* **Dev 1 (Frontend):** Focuses on Next.js, Tailwind styling, UI/UX, and integrating backend APIs.
* **Dev 2 (Backend):** Focuses on Express routing, MongoDB integration, encryption (crypto-js) logic, and JWT auth.

**Option B: Feature Split (Full-Stack each)**
* **Dev 1 (Core & Auth):** Implements User/Auth features, database setup, and Login/Registration pages.
* **Dev 2 (Records & Emergency):** Implements encryption logic, Record management UI, and Emergency break-glass features.

### 2. Git Workflow
To avoid overwriting each other's work:
1. **Never commit directly to `main`.**
2. Always create a new branch for your feature:
   ```bash
   git checkout -b feature/auth-backend
   ```
3. When your feature is done, push the branch and open a **Pull Request (PR)** on GitHub.
4. The other developer should review and merge the PR to `main`.
5. Keep your local `main` branch updated before starting new features:
   ```bash
   git checkout main
   git pull origin main
   ```

---
*This repo is actively being built module-by-module.*
