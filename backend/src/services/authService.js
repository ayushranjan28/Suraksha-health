const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { supabase } = require('../config/db');

// ── Helpers ──────────────────────────────────────────────

/**
 * SHA-256 hash a string (used to hash refresh tokens before DB storage).
 * @param {string} value
 * @returns {string} hex digest
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * Parse a human-readable duration string (e.g. '7d', '15m') into milliseconds.
 * Supports: s (seconds), m (minutes), h (hours), d (days).
 * @param {string} str
 * @returns {number} milliseconds
 */
function durationToMs(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: "${str}"`);
  const n = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * multipliers[unit];
}

// ── Password hashing ────────────────────────────────────

/**
 * Hash a plaintext password with bcrypt.
 * @param {string} plainPassword
 * @returns {Promise<string>} bcrypt hash
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, config.bcryptRounds);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * @param {string} plainPassword
 * @param {string} hash - bcrypt hash from the database
 * @returns {Promise<boolean>}
 */
async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

// ── JWT generation ──────────────────────────────────────

/**
 * Generate an access + refresh token pair.
 *
 * @param {string} userId - UUID
 * @param {string} role   - 'patient' | 'doctor' | 'admin'
 * @returns {{ accessToken: string, refreshToken: string }}
 */
function generateTokens(userId, role) {
  const accessToken = jwt.sign(
    { userId, role },
    config.jwtSecret,
    { expiresIn: config.jwtAccessExpiry },
  );

  const refreshToken = jwt.sign(
    { userId },
    config.jwtSecret,
    { expiresIn: config.jwtRefreshExpiry },
  );

  return { accessToken, refreshToken };
}

// ── JWT verification ────────────────────────────────────

/**
 * Verify and decode an access token.
 * @param {string} token
 * @returns {{ userId: string, role: string, iat: number, exp: number }}
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Verify and decode a refresh token.
 * @param {string} token
 * @returns {{ userId: string, iat: number, exp: number }}
 * @throws {jwt.JsonWebTokenError | jwt.TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

// ── Refresh-token persistence ───────────────────────────

/**
 * Hash and store a refresh token in the `refresh_tokens` table.
 * The raw token is NEVER stored — only its SHA-256 hash.
 *
 * @param {string} userId       - UUID
 * @param {string} refreshToken - raw JWT
 * @returns {Promise<void>}
 * @throws {Error} On insert failure
 */
async function saveRefreshToken(userId, refreshToken) {
  const tokenHash = sha256(refreshToken);
  const expiresAt = new Date(
    Date.now() + durationToMs(config.jwtRefreshExpiry),
  ).toISOString();

  const { error } = await supabase
    .from('refresh_tokens')
    .insert({
      user_id:    userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (error) {
    throw new Error(`saveRefreshToken failed: ${error.message}`);
  }
}

/**
 * Revoke a refresh token by its hash (sets `revoked = true`).
 *
 * @param {string} tokenHash - SHA-256 hex string
 * @returns {Promise<void>}
 * @throws {Error} On update failure
 */
async function revokeRefreshToken(tokenHash) {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('token_hash', tokenHash);

  if (error) {
    throw new Error(`revokeRefreshToken failed: ${error.message}`);
  }
}

/**
 * Check whether a raw refresh token is valid:
 *  1. Hash it with SHA-256
 *  2. Look up the hash in `refresh_tokens`
 *  3. Ensure it is not revoked and not expired
 *
 * @param {string} token - raw JWT refresh token
 * @returns {Promise<boolean>}
 */
async function isRefreshTokenValid(token) {
  const tokenHash = sha256(token);

  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('id, expires_at, revoked')
    .eq('token_hash', tokenHash)
    .single();

  if (error || !data) return false;
  if (data.revoked) return false;
  if (new Date(data.expires_at) < new Date()) return false;

  return true;
}

// ── Exports ─────────────────────────────────────────────

module.exports = {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  saveRefreshToken,
  revokeRefreshToken,
  isRefreshTokenValid,
  sha256,              // exposed for revoking by raw token elsewhere
};
