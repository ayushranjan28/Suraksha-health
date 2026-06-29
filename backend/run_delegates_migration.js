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
      CREATE TABLE IF NOT EXISTS public.user_delegates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        delegate_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(patient_id, delegate_id)
      );

      ALTER TABLE public.user_delegates ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "user_delegates_select" ON public.user_delegates;
      CREATE POLICY "user_delegates_select"
        ON public.user_delegates FOR SELECT
        USING (auth.uid() = patient_id OR auth.uid() = delegate_id);

      DROP POLICY IF EXISTS "user_delegates_insert" ON public.user_delegates;
      CREATE POLICY "user_delegates_insert"
        ON public.user_delegates FOR INSERT
        WITH CHECK (auth.uid() = patient_id);

      DROP POLICY IF EXISTS "user_delegates_delete" ON public.user_delegates;
      CREATE POLICY "user_delegates_delete"
        ON public.user_delegates FOR DELETE
        USING (auth.uid() = patient_id);

      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log('Executing delegates migration...');
    await client.query(sql);
    console.log('Migration successful!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
