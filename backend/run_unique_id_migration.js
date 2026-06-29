const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = 'postgresql://postgres.dvbkwqtbslhdzinghiio:Suraksha%40health@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    // Add ssl if needed by Supabase
    // ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    const sql = `
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS unique_id TEXT UNIQUE;

      UPDATE public.users 
      SET unique_id = CASE 
          WHEN role = 'patient' THEN 'PAT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
          WHEN role = 'doctor' THEN 'DOC-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
          WHEN role = 'admin' THEN 'ADM-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
          ELSE 'USR-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8))
      END
      WHERE unique_id IS NULL;
      
      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log('Executing unique_id migration...');
    await client.query(sql);
    console.log('Migration successful!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
