const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectionString = 'postgresql://postgres.dvbkwqtbslhdzinghiio:Suraksha%40health@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();

    const sql = `
      ALTER TABLE public.user_delegates
      ADD COLUMN IF NOT EXISTS contact_number TEXT;
      
      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log('Executing add contact_number migration...');
    await client.query(sql);
    console.log('Migration successful!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
