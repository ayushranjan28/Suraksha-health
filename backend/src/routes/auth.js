'use strict';

const { Router } = require('express');

const authController              = require('../controllers/authController');
const { authenticateToken }       = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = Router();

// ── POST /api/auth/register ───────────────────────────────────────────────────
// Rate-limited (3/hr per IP) + input validation from authController
router.post(
  '/register',
  registerLimiter,
  authController.authValidation.register,
  authController.register,
);

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Rate-limited (5/15 min per IP) + input validation from authController
router.post(
  '/login',
  loginLimiter,
  authController.authValidation.login,
  authController.login,
);

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
// Requires a valid access token so we know *who* is logging out
router.post(
  '/logout',
  authenticateToken,
  authController.logout,
);

// ── POST /api/auth/refresh-token ──────────────────────────────────────────────
// No auth middleware — the refresh token (httpOnly cookie) is the credential
router.post(
  '/refresh-token',
  authController.refreshToken,
);

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Returns the authenticated user's public profile
router.get(
  '/me',
  authenticateToken,
  authController.getMe,
);

module.exports = router;
