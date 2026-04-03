'use strict';

const config = require('../config');

// ── Global error handler ──────────────────────────────────────────────────────

/**
 * Express 4-argument error handler.
 * MUST be registered as the LAST `app.use()` call in app.js.
 *
 * Error shape conventions (set on the thrown Error object):
 *   err.status  {number}  - HTTP status code (default 500)
 *   err.errors  {Array}   - express-validator error array (causes 422)
 *   err.code    {string}  - machine-readable error code (optional)
 *
 * @type {import('express').ErrorRequestHandler}
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // ── Determine HTTP status ─────────────────────────────────
  // express-validator sets err.status = 422 AND err.errors = [...]
  // Other thrown errors set err.status explicitly (409, 401, 404, etc.)
  let httpStatus = err.status || err.statusCode || 500;

  // Safety net: if err.errors is present, always use 422
  if (err.errors && Array.isArray(err.errors) && httpStatus === 500) {
    httpStatus = 422;
  }

  // ── Log — suppress noisy stack for expected 4xx ───────────
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.error(`  Status : ${httpStatus}`);
  console.error(`  Message: ${err.message}`);
  if (config.nodeEnv !== 'production' && err.stack && httpStatus >= 500) {
    console.error(err.stack);
  }

  // ── Build safe response body ──────────────────────────────
  const body = {
    status:  'error',
    message: safeMessage(err, httpStatus),
  };

  // Attach validation error details (always safe to expose)
  if (err.errors && Array.isArray(err.errors)) {
    body.errors = err.errors.map((e) => ({
      field:   e.path ?? e.param ?? 'unknown',
      message: e.msg,
    }));
  }

  // In development: attach stack trace only for unexpected 5xx errors
  if (config.nodeEnv !== 'production' && err.stack && httpStatus >= 500) {
    body.stack = err.stack;
  }

  return res.status(httpStatus).json(body);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return a client-safe message.
 * For unexpected 5xx errors in production, hide internal details.
 *
 * @param {Error}  err
 * @param {number} status
 * @returns {string}
 */
function safeMessage(err, status) {
  if (status >= 500 && config.nodeEnv === 'production') {
    return 'An unexpected error occurred. Please try again later.';
  }
  return err.message || 'Something went wrong.';
}

// ── 404 catch-all (optional, mount just before errorHandler) ─────────────────

/**
 * Catches any request that didn't match a route and passes a 404 error
 * to the global errorHandler.
 *
 * @type {import('express').RequestHandler}
 */
function notFoundHandler(req, res, next) {
  // Browsers silently request /favicon.ico — ignore it without logging noise
  if (req.originalUrl === '/favicon.ico') {
    return res.status(204).end();
  }

  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = { errorHandler, notFoundHandler };
