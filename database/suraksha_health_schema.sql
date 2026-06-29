CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  full_name     TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'patient'
                            CHECK (role IN ('patient', 'doctor', 'admin')),
  abha_id       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active     BOOLEAN     NOT NULL DEFAULT true
);

CREATE TABLE public.refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked     BOOLEAN     NOT NULL DEFAULT false
);

CREATE TABLE public.audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB
);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_users_email                ON public.users (email);
CREATE INDEX idx_users_role                 ON public.users (role);
CREATE INDEX idx_users_abha_id              ON public.users (abha_id) WHERE abha_id IS NOT NULL;
CREATE INDEX idx_refresh_tokens_user_id     ON public.refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token_hash  ON public.refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires_at  ON public.refresh_tokens (expires_at) WHERE revoked = false;
CREATE INDEX idx_audit_log_user_id          ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_action           ON public.audit_log (action);
CREATE INDEX idx_audit_log_created_at       ON public.audit_log (created_at DESC);

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_service_only"
  ON public.users FOR INSERT
  WITH CHECK (false);

CREATE POLICY "users_delete_blocked"
  ON public.users FOR DELETE
  USING (false);

CREATE POLICY "refresh_tokens_select_own"
  ON public.refresh_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "refresh_tokens_insert_blocked"
  ON public.refresh_tokens FOR INSERT
  WITH CHECK (false);

CREATE POLICY "refresh_tokens_update_blocked"
  ON public.refresh_tokens FOR UPDATE
  USING (false);

CREATE POLICY "refresh_tokens_delete_blocked"
  ON public.refresh_tokens FOR DELETE
  USING (false);

CREATE POLICY "audit_log_select_own"
  ON public.audit_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "audit_log_insert_blocked"
  ON public.audit_log FOR INSERT
  WITH CHECK (false);

CREATE POLICY "audit_log_update_blocked"
  ON public.audit_log FOR UPDATE
  USING (false);

CREATE POLICY "audit_log_delete_blocked"
  ON public.audit_log FOR DELETE
  USING (false);

CREATE TABLE public.health_records (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  doctor_id   UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.emergency_requests (
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

CREATE TRIGGER set_health_records_updated_at
  BEFORE UPDATE ON public.health_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_emergency_requests_updated_at
  BEFORE UPDATE ON public.emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_health_records_patient_id ON public.health_records (patient_id);
CREATE INDEX idx_health_records_doctor_id  ON public.health_records (doctor_id);
CREATE INDEX idx_emergency_requests_patient_id ON public.emergency_requests (patient_id);
CREATE INDEX idx_emergency_requests_doctor_id  ON public.emergency_requests (doctor_id);
CREATE INDEX idx_emergency_requests_status     ON public.emergency_requests (status);

ALTER TABLE public.health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "health_records_select"
  ON public.health_records FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "health_records_insert"
  ON public.health_records FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "health_records_update"
  ON public.health_records FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "health_records_delete_blocked"
  ON public.health_records FOR DELETE
  USING (false);

CREATE POLICY "emergency_requests_select"
  ON public.emergency_requests FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "emergency_requests_insert"
  ON public.emergency_requests FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "emergency_requests_update"
  ON public.emergency_requests FOR UPDATE
  USING (auth.uid() = patient_id OR auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = patient_id OR auth.uid() = doctor_id);

CREATE POLICY "emergency_requests_delete_blocked"
  ON public.emergency_requests FOR DELETE
  USING (false);

-- Patient Profiles for emergency details
CREATE TABLE public.patient_profiles (
  user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  blood_group     TEXT,
  allergies       TEXT,
  past_accidents  TEXT,
  trauma          TEXT,
  other_info      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_patient_profiles_updated_at
  BEFORE UPDATE ON public.patient_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_profiles_select"
  ON public.patient_profiles FOR SELECT
  USING (true);

CREATE POLICY "patient_profiles_insert"
  ON public.patient_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "patient_profiles_update"
  ON public.patient_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Alter health_records to support file urls, previous doctor info
ALTER TABLE public.health_records
ADD COLUMN file_urls JSONB DEFAULT '[]'::jsonb,
ADD COLUMN previous_doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN previous_doctor_name TEXT;
