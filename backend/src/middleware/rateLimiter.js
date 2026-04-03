'use strict';

const rateLimit = require('express-rate-limit');

// ── Dev bypass ────────────────────────────────────────────────────────────────
// Skip ALL rate limiting in development so Postman / collection runners never
// get throttled. Production limits are fully enforced.
const isDev = (process.env.NODE_ENV || 'development') === 'development';
const skipInDev = () => isDev;

// ── Shared response formatter ─────────────────────────────────────────────────

/**
 * Consistent JSON shape for all rate-limit 429 responses.
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
function rateLimitHandler(req, res) {
  res.status(429).json({
    status:  'error',
    message: 'Too many requests. Please slow down and try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
}

// ── loginLimiter ──────────────────────────────────────────────────────────────

/**
 * Strict limiter for POST /api/auth/login.
 * Production : max 5 attempts per IP every 15 minutes.
 * Development: unlimited (skipped entirely).
 * Helps mitigate brute-force password attacks.
 */
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              5,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  skipSuccessfulRequests: false,
  skip:             skipInDev,       // ← bypass in development
});

// ── registerLimiter ───────────────────────────────────────────────────────────

/**
 * Strict limiter for POST /api/auth/register.
 * Production : max 3 accounts per IP per hour.
 * Development: unlimited (skipped entirely).
 * Prevents mass account creation / spam.
 */
const registerLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,  // 1 hour
  max:              3,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  skipSuccessfulRequests: false,
  skip:             skipInDev,       // ← bypass in development
});

// ── apiLimiter ────────────────────────────────────────────────────────────────

/**
 * General limiter applied to all API routes.
 * Production : max 100 requests per IP every 15 minutes.
 * Development: unlimited (skipped entirely).
 */
const apiLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,  // 15 minutes
  max:              100,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  skipSuccessfulRequests: false,
  skip:             skipInDev,       // ← bypass in development
});

// ── Exports ───────────────────────────────────────────────────────────────────

if (isDev) {
  console.log('⚠️  Rate limiting DISABLED (NODE_ENV=development)');
}

module.exports = { loginLimiter, registerLimiter, apiLimiter };
