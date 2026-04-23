const { supabase } = require('../config/db');

/**
 * @typedef {Object} UserRow
 * @property {string}  id
 * @property {string}  email
 * @property {string}  password_hash
 * @property {string}  full_name
 * @property {string}  role          - 'patient' | 'doctor' | 'admin'
 * @property {string|null} abha_id
 * @property {string|null} google_id
 * @property {string|null} avatar_url
 * @property {string}  auth_provider - 'email' | 'google'
 * @property {boolean} email_verified
 * @property {string}  created_at
 * @property {string}  updated_at
 * @property {boolean} is_active
 */

/** Columns returned for public-facing queries (no password_hash) */
const PUBLIC_COLUMNS = 'id, email, full_name, role, abha_id, google_id, avatar_url, auth_provider, email_verified, created_at, updated_at, is_active';

/** Columns returned when password_hash is needed (login) */
const ALL_COLUMNS = '*, password_hash';

class User {
  // ────────────────────────────────────────────────────────
  // CREATE
  // ────────────────────────────────────────────────────────

  /**
   * Insert a new user into the `users` table.
   *
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.passwordHash  - bcrypt hash
   * @param {string} params.fullName
   * @param {string} [params.role='patient'] - 'patient' | 'doctor' | 'admin'
   * @returns {Promise<Omit<UserRow, 'password_hash'>>} Created user (no password_hash)
   * @throws {Error} If email already exists (unique constraint) or other DB error
   */
  static async create({ email, passwordHash, fullName, role = 'patient' }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name: fullName,
        role,
        email_verified: false,
      })
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) {
      // Supabase / PostgreSQL unique-constraint violation
      if (error.code === '23505') {
        const conflict = new Error(`An account with that email already exists.`);
        conflict.status = 409;
        throw conflict;
      }
      const dbErr = new Error(`User.create failed: ${error.message}`);
      dbErr.status = 500;
      throw dbErr;
    }

    return data;
  }

  // ────────────────────────────────────────────────────────
  // READ
  // ────────────────────────────────────────────────────────

  /**
   * Find a user by email — includes password_hash (for login comparison).
   *
   * @param {string} email
   * @returns {Promise<UserRow | null>}
   */
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select(ALL_COLUMNS)
      .eq('email', email)
      .single();

    if (error) {
      // PGRST116 = "no rows found" — not an error for us
      if (error.code === 'PGRST116') return null;
      throw new Error(`User.findByEmail failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Find a user by UUID — returns public columns only (no password_hash).
   *
   * @param {string} id - UUID
   * @returns {Promise<Omit<UserRow, 'password_hash'> | null>}
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select(PUBLIC_COLUMNS)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`User.findById failed: ${error.message}`);
    }

    return data;
  }

  // ────────────────────────────────────────────────────────
  // GOOGLE AUTH
  // ────────────────────────────────────────────────────────

  /**
   * Find a user by Google ID — returns public columns only.
   *
   * @param {string} googleId - Google sub claim
   * @returns {Promise<Omit<UserRow, 'password_hash'> | null>}
   */
  static async findByGoogleId(googleId) {
    const { data, error } = await supabase
      .from('users')
      .select(PUBLIC_COLUMNS)
      .eq('google_id', googleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`User.findByGoogleId failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new user via Google OAuth.
   * password_hash is null (Google users have no password).
   *
   * @param {Object} params
   * @param {string} params.email
   * @param {string} params.fullName
   * @param {string} params.googleId
   * @param {string|null} params.avatarUrl
   * @returns {Promise<Omit<UserRow, 'password_hash'>>} Created user (no password_hash)
   * @throws {Error} On DB error
   */
  static async createGoogleUser({ email, fullName, googleId, avatarUrl }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: null,
        full_name:     fullName,
        role:          'patient',
        google_id:     googleId,
        avatar_url:    avatarUrl,
        auth_provider: 'google',
        email_verified: true,
      })
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) {
      if (error.code === '23505') {
        const conflict = new Error('An account with that email already exists.');
        conflict.status = 409;
        throw conflict;
      }
      const dbErr = new Error(`User.createGoogleUser failed: ${error.message}`);
      dbErr.status = 500;
      throw dbErr;
    }

    return data;
  }

  // ────────────────────────────────────────────────────────
  // EMAIL VERIFICATION
  // ────────────────────────────────────────────────────────

  /**
   * Mark a user's email as verified and clear the verification token.
   *
   * @param {string} userId - UUID
   * @returns {Promise<Omit<UserRow, 'password_hash'>>} Updated user
   */
  static async verifyEmail(userId) {
    const { data, error } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verification_token_hash: null,
        email_verification_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) {
      throw new Error(`User.verifyEmail failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Store a hashed verification token and expiry on the user row.
   *
   * @param {string} userId    - UUID
   * @param {string} tokenHash - SHA-256 hash of the raw token
   * @param {string} expiresAt - ISO 8601 timestamp
   */
  static async setVerificationToken(userId, tokenHash, expiresAt) {
    const { error } = await supabase
      .from('users')
      .update({
        email_verification_token_hash: tokenHash,
        email_verification_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`User.setVerificationToken failed: ${error.message}`);
    }
  }

  /**
   * Find a user by their verification token hash (must not be expired).
   *
   * @param {string} tokenHash - SHA-256 hash of the raw token
   * @returns {Promise<UserRow | null>}
   */
  static async findByVerificationToken(tokenHash) {
    const { data, error } = await supabase
      .from('users')
      .select(ALL_COLUMNS)
      .eq('email_verification_token_hash', tokenHash)
      .gt('email_verification_expires_at', new Date().toISOString())
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`User.findByVerificationToken failed: ${error.message}`);
    }

    return data;
  }

  // ────────────────────────────────────────────────────────
  // UPDATE
  // ────────────────────────────────────────────────────────

  /**
   * Update allowed fields for a user.
   * Permitted fields: full_name, is_active, abha_id.
   * `updated_at` is set automatically by the DB trigger.
   *
   * @param {string} id - UUID
   * @param {Object} updates
   * @param {string}  [updates.fullName]
   * @param {boolean} [updates.isActive]
   * @param {string}  [updates.abhaId]
   * @returns {Promise<Omit<UserRow, 'password_hash'>>} Updated user
   * @throws {Error} If user not found or DB error
   */
  static async updateById(id, updates) {
    // Map camelCase input → snake_case column names
    const payload = {};
    if (updates.fullName !== undefined) payload.full_name = updates.fullName;
    if (updates.isActive !== undefined) payload.is_active = updates.isActive;
    if (updates.abhaId !== undefined)   payload.abha_id   = updates.abhaId;

    if (Object.keys(payload).length === 0) {
      throw new Error('User.updateById: no valid fields to update.');
    }

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select(PUBLIC_COLUMNS)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`User with id "${id}" not found.`);
      }
      throw new Error(`User.updateById failed: ${error.message}`);
    }

    return data;
  }

  // ────────────────────────────────────────────────────────
  // DEACTIVATE
  // ────────────────────────────────────────────────────────

  /**
   * Soft-delete a user by setting is_active = false.
   *
   * @param {string} id - UUID
   * @returns {Promise<Omit<UserRow, 'password_hash'>>} Deactivated user
   * @throws {Error} If user not found
   */
  static async deactivate(id) {
    return User.updateById(id, { isActive: false });
  }
}

module.exports = User;
