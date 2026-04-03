const { supabase } = require('../config/db');

/**
 * @typedef {Object} UserRow
 * @property {string}  id
 * @property {string}  email
 * @property {string}  password_hash
 * @property {string}  full_name
 * @property {string}  role          - 'patient' | 'doctor' | 'admin'
 * @property {string|null} abha_id
 * @property {string}  created_at
 * @property {string}  updated_at
 * @property {boolean} is_active
 */

/** Columns returned for public-facing queries (no password_hash) */
const PUBLIC_COLUMNS = 'id, email, full_name, role, abha_id, created_at, updated_at, is_active';

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
