'use strict';

const { validationResult, body } = require('express-validator');
const User      = require('../models/User');
const AuditLog  = require('../models/AuditLog');
const authService = require('../services/authService');

// ── Cookie configuration ──────────────────────────────────────────────────────

/** Shared options for the refresh-token httpOnly cookie. */
const REFRESH_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict',
  secure:   process.env.NODE_ENV === 'production',
  // maxAge mirrors JWT_REFRESH_EXPIRY (7 days in ms)
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/api/auth',          // restrict cookie to auth routes only
};

// ── Validation rule sets ──────────────────────────────────────────────────────

/**
 * Reusable express-validator chains.
 * Import and spread into route definitions:
 *   router.post('/register', authValidation.register, authController.register)
 */
const authValidation = {
  register: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Email must be a valid email address.')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),

    body('fullName')
      .trim()
      .notEmpty().withMessage('Full name is required.'),

    body('role')
      .optional()
      .isIn(['patient', 'doctor', 'admin'])
      .withMessage("Role must be 'patient', 'doctor', or 'admin'."),
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Email must be a valid email address.')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Password is required.'),
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Check express-validator results and throw a structured 422 error if invalid.
 * @param {import('express').Request} req
 */
function assertValid(req) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const err = new Error('Validation failed.');
    err.status = 422;
    err.errors = result.array();
    throw err;
  }
}

/**
 * Extract minimal audit context from the request.
 * @param {import('express').Request} req
 * @returns {{ ipAddress: string, userAgent: string }}
 */
function auditContext(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
  };
}

/**
 * Issue a token pair, persist the refresh token, and set the httpOnly cookie.
 * Returns the raw accessToken for the response body.
 *
 * @param {string}                       userId
 * @param {string}                       role
 * @param {import('express').Response}   res
 * @returns {Promise<string>} accessToken
 */
async function issueTokensAndSetCookie(userId, role, res) {
  const { accessToken, refreshToken } = authService.generateTokens(userId, role);
  await authService.saveRefreshToken(userId, refreshToken);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
  return accessToken;
}

/**
 * Shape a User DB row into the safe public object sent in responses.
 * @param {import('../models/User').UserRow} user
 */
function publicUser(user) {
  return {
    id:       user.id,
    email:    user.email,
    fullName: user.full_name,
    role:     user.role,
  };
}

// ── Controller functions ──────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email, password, fullName, role? }
 */
async function register(req, res, next) {
  try {
    assertValid(req);

    const { email, password, fullName, role } = req.body;

    // 1. Ensure the email is not already taken
    const existing = await User.findByEmail(email);
    if (existing) {
      const err = new Error('An account with that email already exists.');
      err.status = 409;
      throw err;
    }

    // 2. Hash password
    const passwordHash = await authService.hashPassword(password);

    // 3. Persist user (no password_hash in returned object)
    const user = await User.create({ email, passwordHash, fullName, role });

    // 4. Issue tokens + cookie
    const accessToken = await issueTokensAndSetCookie(user.id, user.role, res);

    // 5. Audit log (non-blocking — we don't await failure propagation)
    AuditLog.create({
      userId:   user.id,
      action:   'REGISTER',
      metadata: { email },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (REGISTER) failed:', e.message));

    return res.status(201).json({
      user:        publicUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    assertValid(req);

    const { email, password } = req.body;

    // Use a single generic message for both "no account" and "wrong password"
    // to avoid user-enumeration attacks.
    const GENERIC_MSG = 'Invalid email or password.';

    const user = await User.findByEmail(email);
    if (!user) {
      const err = new Error(GENERIC_MSG);
      err.status = 401;
      throw err;
    }

    const passwordMatch = await authService.comparePassword(password, user.password_hash);
    if (!passwordMatch) {
      // Audit the failed attempt before bailing
      AuditLog.create({
        userId:   user.id,
        action:   'LOGIN_FAILED',
        metadata: { email },
        ...auditContext(req),
      }).catch((e) => console.error('AuditLog.create (LOGIN_FAILED) failed:', e.message));

      const err = new Error(GENERIC_MSG);
      err.status = 401;
      throw err;
    }

    const accessToken = await issueTokensAndSetCookie(user.id, user.role, res);

    AuditLog.create({
      userId:   user.id,
      action:   'LOGIN',
      metadata: { email },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (LOGIN) failed:', e.message));

    return res.status(200).json({
      user:        publicUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * Requires the refreshToken cookie to be present.
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.cookies ?? {};

    if (refreshToken) {
      const tokenHash = authService.sha256(refreshToken);
      // Best-effort revocation — don't crash if already revoked / missing
      await authService.revokeRefreshToken(tokenHash).catch((e) =>
        console.error('revokeRefreshToken failed:', e.message),
      );

      // Audit using the decoded userId when possible
      let userId = null;
      try {
        const decoded = authService.verifyRefreshToken(refreshToken);
        userId = decoded.userId;
      } catch (_) {
        // Token may be expired — still complete logout
      }

      AuditLog.create({
        userId,
        action: 'LOGOUT',
        ...auditContext(req),
      }).catch((e) => console.error('AuditLog.create (LOGOUT) failed:', e.message));
    }

    // Clear the cookie regardless of whether revocation succeeded
    res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTS, maxAge: undefined });

    return res.status(200).json({ message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/refresh
 * Rotates both the access token and the refresh token (refresh-token rotation).
 */
async function refreshToken(req, res, next) {
  try {
    const rawToken = req.cookies?.refreshToken;

    if (!rawToken) {
      const err = new Error('Refresh token not found.');
      err.status = 401;
      throw err;
    }

    // 1. Verify JWT signature / expiry
    let decoded;
    try {
      decoded = authService.verifyRefreshToken(rawToken);
    } catch (_) {
      const err = new Error('Refresh token is invalid or expired.');
      err.status = 401;
      throw err;
    }

    // 2. Check the DB: not revoked, not expired
    const valid = await authService.isRefreshTokenValid(rawToken);
    if (!valid) {
      // Possible token reuse — clear the cookie as a precaution
      res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTS, maxAge: undefined });
      const err = new Error('Refresh token has been revoked or expired.');
      err.status = 401;
      throw err;
    }

    // 3. Revoke the old refresh token (rotation)
    const oldHash = authService.sha256(rawToken);
    await authService.revokeRefreshToken(oldHash);

    // 4. Load user to get current role (role may have changed since token was issued)
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTS, maxAge: undefined });
      const err = new Error('User account not found or inactive.');
      err.status = 401;
      throw err;
    }

    // 5. Issue a fresh token pair
    const accessToken = await issueTokensAndSetCookie(user.id, user.role, res);

    AuditLog.create({
      userId:   user.id,
      action:   'TOKEN_REFRESH',
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (TOKEN_REFRESH) failed:', e.message));

    return res.status(200).json({ accessToken });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Requires auth middleware to have set req.user = { userId, role }.
 */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      throw err;
    }

    return res.status(200).json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  // Handlers
  register,
  login,
  logout,
  refreshToken,
  getMe,

  // Validation chains (attach to routes)
  authValidation,
};
