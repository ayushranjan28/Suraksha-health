const { createClient } = require('@supabase/supabase-js');
const config = require('./index');


const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

/**
 * Verify that the Supabase connection is alive.
 * Runs a trivial query against the users table metadata.
 * @returns {Promise<boolean>}
 */
async function testConnection() {
  try {
    // A lightweight query — fetch zero rows just to verify connectivity
    const { error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase connected successfully');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
    return false;
  }
}

// ── Allow standalone execution for quick testing ─────────
// Usage:  node src/config/db.js
if (require.main === module) {
  testConnection().then((ok) => process.exit(ok ? 0 : 1));
}

module.exports = { supabase, testConnection };
