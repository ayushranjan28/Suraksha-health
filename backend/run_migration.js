const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

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

    // The SQL query to add the new tables and policies
    const sql = `
      CREATE TABLE IF NOT EXISTS public.health_records (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        doctor_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        title       TEXT        NOT NULL,
        content     TEXT        NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.emergency_requests (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        doctor_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        status      TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
        reason      TEXT        NOT NULL,
        expires_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE OR REPLACE TRIGGER set_health_records_updated_at
        BEFORE UPDATE ON public.health_records
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();

      CREATE OR REPLACE TRIGGER set_emergency_requests_updated_at
        BEFORE UPDATE ON public.emergency_requests
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();

      CREATE INDEX IF NOT EXISTS idx_health_records_patient_id ON public.health_records (patient_id);
      CREATE INDEX IF NOT EXISTS idx_health_records_doctor_id  ON public.health_records (doctor_id);
      CREATE INDEX IF NOT EXISTS idx_emergency_requests_patient_id ON public.emergency_requests (patient_id);
      CREATE INDEX IF NOT EXISTS idx_emergency_requests_doctor_id  ON public.emergency_requests (doctor_id);
      CREATE INDEX IF NOT EXISTS idx_emergency_requests_status     ON public.emergency_requests (status);

      ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "health_records_select" ON public.health_records;
      CREATE POLICY "health_records_select"
        ON public.health_records FOR SELECT
        USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

      DROP POLICY IF EXISTS "health_records_insert" ON public.health_records;
      CREATE POLICY "health_records_insert"
        ON public.health_records FOR INSERT
        WITH CHECK (auth.uid() = doctor_id);

      DROP POLICY IF EXISTS "health_records_update" ON public.health_records;
      CREATE POLICY "health_records_update"
        ON public.health_records FOR UPDATE
        USING (auth.uid() = doctor_id)
        WITH CHECK (auth.uid() = doctor_id);

      DROP POLICY IF EXISTS "health_records_delete_blocked" ON public.health_records;
      CREATE POLICY "health_records_delete_blocked"
        ON public.health_records FOR DELETE
        USING (false);

      DROP POLICY IF EXISTS "emergency_requests_select" ON public.emergency_requests;
      CREATE POLICY "emergency_requests_select"
        ON public.emergency_requests FOR SELECT
        USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

      DROP POLICY IF EXISTS "emergency_requests_insert" ON public.emergency_requests;
      CREATE POLICY "emergency_requests_insert"
        ON public.emergency_requests FOR INSERT
        WITH CHECK (auth.uid() = doctor_id);

      DROP POLICY IF EXISTS "emergency_requests_update" ON public.emergency_requests;
      CREATE POLICY "emergency_requests_update"
        ON public.emergency_requests FOR UPDATE
        USING (auth.uid() = patient_id OR auth.uid() = doctor_id)
        WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);

      DROP POLICY IF EXISTS "emergency_requests_delete_blocked" ON public.emergency_requests;
      CREATE POLICY "emergency_requests_delete_blocked"
        ON public.emergency_requests FOR DELETE
        USING (false);
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

runMigration();
