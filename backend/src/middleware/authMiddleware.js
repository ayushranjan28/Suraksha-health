'use strict';

const authService = require('../services/authService');

// ── authenticateToken ─────────────────────────────────────────────────────────

/**
 * Verify the Bearer access token in the Authorization header.
 * On success: attaches `req.user = { userId, role }` and calls next().
 * On failure: responds 401 immediately.
 *
 * @type {import('express').RequestHandler}
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status:  'error',
      message: 'Access token is missing or malformed.',
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const decoded = authService.verifyAccessToken(token);
    // decoded = { userId, role, iat, exp }
    req.user = { userId: decoded.userId, role: decoded.role };
    return next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      status:  'error',
      message: isExpired ? 'Access token has expired.' : 'Access token is invalid.',
    });
  }
}

// ── requireRole ───────────────────────────────────────────────────────────────

/**
 * Role-based access control middleware factory.
 * Must be used AFTER `authenticateToken` (req.user must be set).
 *
 * @param {...string} roles - Allowed roles, e.g. requireRole('admin', 'doctor')
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.get('/admin-only', authenticateToken, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      // Defensive: should not reach here without authenticateToken
      return res.status(401).json({
        status:  'error',
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status:  'error',
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
      });
    }

    return next();
  };
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = { authenticateToken, requireRole };
