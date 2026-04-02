require('dotenv').config();

// ── Required environment variables ───────────────────────
const REQUIRED_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'JWT_SECRET',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error('\n   Copy .env.example → .env and fill in the values.\n');
  process.exit(1);
}

// ── Export validated config ──────────────────────────────
module.exports = {
  port:              process.env.PORT              || 5000,
  supabaseUrl:       process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  jwtSecret:         process.env.JWT_SECRET,
  nodeEnv:           process.env.NODE_ENV          || 'development',
};
