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
