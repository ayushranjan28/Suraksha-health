'use strict';

const { Router } = require('express');

const authController              = require('../controllers/authController');
const { authenticateToken }       = require('../middleware/authMiddleware');
const { loginLimiter, registerLimiter, forgotPasswordLimiter, resendVerificationLimiter } = require('../middleware/rateLimiter');

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

// ── GET /api/auth/verify-email ────────────────────────────────────────────────
// Verifies a user's email via the token sent in the verification email
router.get(
  '/verify-email',
  authController.verifyEmail,
);

// ── POST /api/auth/resend-verification ────────────────────────────────────────
// Resends the verification email (rate-limited: 3/hr per IP)
router.post(
  '/resend-verification',
  resendVerificationLimiter,
  authController.authValidation.resendVerification,
  authController.resendVerification,
);

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Rate-limited (3/hr per IP) to prevent abuse
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  authController.authValidation.forgotPassword,
  authController.forgotPassword,
);

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Resets password using token from email
router.post(
  '/reset-password',
  authController.authValidation.resetPassword,
  authController.resetPassword,
);
// ── POST /api/auth/google ─────────────────────────────────────────────────────
// Google OAuth — no rate limiter (Google handles abuse), no express-validator
// (the ID token is opaque and verified server-side by google-auth-library)
router.post(
  '/google',
  authController.googleAuth,
);

module.exports = router;
