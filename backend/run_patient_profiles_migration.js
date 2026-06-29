const { Client } = require('pg');

const connectionString = 'postgresql://postgres.dvbkwqtbslhdzinghiio:Suraksha%40health@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function runPatientProfilesMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    const sql = `
      -- Patient Profiles for emergency details
      CREATE TABLE IF NOT EXISTS public.patient_profiles (
        user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
        blood_group     TEXT,
        allergies       TEXT,
        past_accidents  TEXT,
        trauma          TEXT,
        other_info      TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE TRIGGER set_patient_profiles_updated_at
        BEFORE UPDATE ON public.patient_profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();

      ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "patient_profiles_select" ON public.patient_profiles;
      CREATE POLICY "patient_profiles_select"
        ON public.patient_profiles FOR SELECT
        USING (true);

      DROP POLICY IF EXISTS "patient_profiles_insert" ON public.patient_profiles;
      CREATE POLICY "patient_profiles_insert"
        ON public.patient_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);

      DROP POLICY IF EXISTS "patient_profiles_update" ON public.patient_profiles;
      CREATE POLICY "patient_profiles_update"
        ON public.patient_profiles FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

      -- Alter health_records to support file urls, previous doctor info
      ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS file_urls JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS previous_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
      ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS previous_doctor_name TEXT;

      -- Reload schema cache
      NOTIFY pgrst, 'reload schema';
    `;

    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration successful!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runPatientProfilesMigration();
