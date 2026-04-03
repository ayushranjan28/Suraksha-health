const { supabase } = require('../config/db');

/**
 * @typedef {Object} AuditLogRow
 * @property {string}      id
 * @property {string|null} user_id
 * @property {string}      action      - e.g. 'LOGIN_SUCCESS', 'RECORD_VIEWED'
 * @property {string|null} ip_address
 * @property {string|null} user_agent
 * @property {string}      created_at
 * @property {Object|null} metadata    - JSONB payload with extra context
 */

class AuditLog {
  /**
   * Write an entry to the audit_log table.
   *
   * @param {Object} params
   * @param {string|null} params.userId    - UUID of the acting user (null for anonymous)
   * @param {string}      params.action    - Action identifier, e.g. 'LOGIN_SUCCESS'
   * @param {string|null} [params.ipAddress]
   * @param {string|null} [params.userAgent]
   * @param {Object|null} [params.metadata] - Any extra JSON context
   * @returns {Promise<AuditLogRow>} The created log entry
   * @throws {Error} On insert failure
   */
  static async create({ userId, action, ipAddress = null, userAgent = null, metadata = null }) {
    const { data, error } = await supabase
      .from('audit_log')
      .insert({
        user_id:    userId,
        action,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`AuditLog.create failed: ${error.message}`);
    }

    return data;
  }
}

module.exports = AuditLog;
