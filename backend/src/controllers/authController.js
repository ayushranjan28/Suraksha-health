'use strict';

const { validationResult, body } = require('express-validator');
const crypto = require('crypto');
const User      = require('../models/User');
const AuditLog  = require('../models/AuditLog');
const authService       = require('../services/authService');
const emailService      = require('../services/emailService');
const googleAuthService = require('../services/googleAuthService');
const { supabase } = require('../config/db');
const config = require('../config');

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

  forgotPassword: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Email must be a valid email address.')
      .normalizeEmail(),
  ],

  resetPassword: [
    body('token')
      .trim()
      .notEmpty().withMessage('Reset token is required.'),

    body('newPassword')
      .notEmpty().withMessage('New password is required.')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
  ],

  resendVerification: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Email must be a valid email address.')
      .normalizeEmail(),
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
    id:           user.id,
    uniqueId:     user.unique_id,
    email:        user.email,
    fullName:     user.full_name,
    role:         user.role,
    avatarUrl:    user.avatar_url    || null,
    authProvider: user.auth_provider || 'email',
  };
}

// ── Controller functions ──────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { email, password, fullName, role? }
 *
 * Creates the user but does NOT issue tokens.
 * Sends a verification email instead — user must verify before logging in.
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

    // 3. Persist user (email_verified defaults to false)
    const user = await User.create({ email, passwordHash, fullName, role });

    // 4. Generate email verification token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    await User.setVerificationToken(user.id, tokenHash, expiresAt);

    // 5. Send verification email (non-blocking)
    const verificationLink = `${config.frontendUrl}/verify-email?token=${rawToken}`;
    emailService.sendVerificationEmail(email, verificationLink, fullName)
      .catch((err) => console.error('Failed to send verification email:', err));

    // 6. Audit log
    AuditLog.create({
      userId:   user.id,
      action:   'REGISTER_PENDING_VERIFICATION',
      metadata: { email },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (REGISTER_PENDING_VERIFICATION) failed:', e.message));

    return res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      email: user.email,
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

    // Block login for unverified email users
    if (!user.email_verified && user.auth_provider === 'email') {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in.',
        email: user.email,
      });
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

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns 200 to prevent email enumeration.
 */
async function forgotPassword(req, res, next) {
  try {
    assertValid(req);

    const { email } = req.body;
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    // Always return success to prevent email enumeration
    const successResponse = {
      message: 'If that email exists, you will receive a reset link shortly.',
    };

    const user = await User.findByEmail(email);

    if (!user) {
      // Don't reveal that the email doesn't exist
      return res.status(200).json(successResponse);
    }

    // Block password reset for Google OAuth users
    if (user.auth_provider === 'google') {
      return res.status(400).json({
        message: 'This account uses Google Sign-In. Please use Google to access your account.',
      });
    }

    // Generate a random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store hashed token in database
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });

    if (insertError) {
      console.error('Failed to store password reset token:', insertError);
      // Still return success to prevent enumeration
      return res.status(200).json(successResponse);
    }

    // Build reset link
    const resetLink = `${FRONTEND_URL}/reset-password?token=${rawToken}`;

    // Send email (non-blocking)
    emailService.sendPasswordResetEmail(email, resetLink, user.full_name)
      .catch((err) => console.error('Failed to send password reset email:', err));

    // Audit log
    AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      metadata: { email },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (PASSWORD_RESET_REQUESTED) failed:', e.message));

    return res.status(200).json(successResponse);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
async function resetPassword(req, res, next) {
  try {
    assertValid(req);

    const { token, newPassword } = req.body;

    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Look up the token
    const { data: tokenRecord, error: lookupError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used')
      .eq('token_hash', tokenHash)
      .single();

    if (lookupError || !tokenRecord) {
      const err = new Error('Invalid or expired reset link.');
      err.status = 400;
      throw err;
    }

    // Check if token is used
    if (tokenRecord.used) {
      const err = new Error('This reset link has already been used.');
      err.status = 400;
      throw err;
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      const err = new Error('This reset link has expired. Please request a new one.');
      err.status = 400;
      throw err;
    }

    // Get the user
    const user = await User.findById(tokenRecord.user_id);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 400;
      throw err;
    }

    // Hash the new password
    const passwordHash = await authService.hashPassword(newPassword);

    // Update user's password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', tokenRecord.id);

    // Revoke all refresh tokens for security
    await supabase
      .from('refresh_tokens')
      .update({ revoked: true })
      .eq('user_id', user.id);

    // Audit log
    AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      metadata: { email: user.email },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (PASSWORD_RESET_COMPLETED) failed:', e.message));

    return res.status(200).json({ message: 'Password reset successfully.' });
  } catch (err) {
    return next(err);
  }
}

// ── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/google
 * Body: { idToken } — the credential string from Google Sign-In
 */
async function googleAuth(req, res, next) {
  try {
    const { idToken, role } = req.body;

    if (!idToken) {
      const err = new Error('Google ID token is required.');
      err.status = 400;
      throw err;
    }

    if (role && !['patient', 'doctor', 'admin'].includes(role)) {
      const err = new Error("Role must be 'patient', 'doctor', or 'admin'.");
      err.status = 400;
      throw err;
    }

    // 1. Verify the Google token
    let googleUser;
    try {
      googleUser = await googleAuthService.verifyGoogleToken(idToken);
    } catch (verifyErr) {
      const err = new Error('Invalid Google token.');
      err.status = 401;
      throw err;
    }

    const { googleId, email, fullName, avatarUrl } = googleUser;

    // 2. Check if a user with this Google ID already exists
    let user = await User.findByGoogleId(googleId);

    if (!user) {
      // 3. Check if an email-based account already exists
      const existingByEmail = await User.findByEmail(email);

      if (existingByEmail) {
        if (existingByEmail.auth_provider === 'email') {
          const err = new Error(
            'An account with this email already exists. Please sign in with your password.',
          );
          err.status = 409;
          throw err;
        }
        // If auth_provider is 'google' but google_id didn't match — shouldn't happen,
        // but use the existing record.
        user = existingByEmail;
      } else {
        // 4. Create new Google user
        user = await User.createGoogleUser({ email, fullName, googleId, avatarUrl, role: role || 'patient' });
      }
    }

    // 5. Issue tokens + cookie (same as email login)
    const accessToken = await issueTokensAndSetCookie(user.id, user.role, res);

    // 6. Audit log
    AuditLog.create({
      userId:   user.id,
      action:   'GOOGLE_LOGIN',
      metadata: { email, googleId },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (GOOGLE_LOGIN) failed:', e.message));

    return res.status(200).json({
      user:        publicUser(user),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
}

// ── Email Verification ────────────────────────────────────────────────────────

/**
 * GET /api/auth/verify-email?token=...
 * Verifies a user's email and logs them in immediately.
 */
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;

    if (!token) {
      const err = new Error('Verification token is required.');
      err.status = 400;
      throw err;
    }

    // Hash the incoming token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Look up user by verification token (checks expiry too)
    const user = await User.findByVerificationToken(tokenHash);

    if (!user) {
      const err = new Error('Verification link is invalid or has expired.');
      err.status = 400;
      err.code = 'INVALID_TOKEN';
      throw err;
    }

    // Mark email as verified
    const verifiedUser = await User.verifyEmail(user.id);

    // Issue tokens and log them in immediately
    const accessToken = await issueTokensAndSetCookie(verifiedUser.id, verifiedUser.role, res);

    // Audit log
    AuditLog.create({
      userId: verifiedUser.id,
      action: 'EMAIL_VERIFIED',
      metadata: { email: verifiedUser.email },
      ...auditContext(req),
    }).catch((e) => console.error('AuditLog.create (EMAIL_VERIFIED) failed:', e.message));

    return res.status(200).json({
      message: 'Email verified successfully!',
      user: publicUser(verifiedUser),
      accessToken,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/resend-verification
 * Body: { email }
 * Always returns 200 to prevent email enumeration.
 */
async function resendVerification(req, res, next) {
  try {
    assertValid(req);

    const { email } = req.body;

    // Always return success to prevent enumeration
    const successResponse = {
      message: 'If that email exists and is unverified, we sent a new verification link.',
    };

    const user = await User.findByEmail(email);

    // Only resend if: user exists, not verified, and email auth provider
    if (user && !user.email_verified && user.auth_provider === 'email') {
      // Generate new token
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

      await User.setVerificationToken(user.id, tokenHash, expiresAt);

      // Send verification email (non-blocking)
      const verificationLink = `${config.frontendUrl}/verify-email?token=${rawToken}`;
      emailService.sendVerificationEmail(email, verificationLink, user.full_name)
        .catch((err) => console.error('Failed to send verification email:', err));

      // Audit log
      AuditLog.create({
        userId: user.id,
        action: 'VERIFICATION_EMAIL_RESENT',
        metadata: { email },
        ...auditContext(req),
      }).catch((e) => console.error('AuditLog.create (VERIFICATION_EMAIL_RESENT) failed:', e.message));
    }

    return res.status(200).json(successResponse);
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
  forgotPassword,
  resetPassword,
  googleAuth,
  verifyEmail,
  resendVerification,

  // Validation chains (attach to routes)
  authValidation,
};
