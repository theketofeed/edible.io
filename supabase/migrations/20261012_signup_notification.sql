-- ─────────────────────────────────────────────────────────────────────────────
-- New-signup notification
--
-- Fires an async HTTP POST to the Render backend (/api/notify-signup) whenever a
-- row is inserted into auth.users, i.e. on every signup (email/password OR
-- Google OAuth). The backend then sends a plain email via Resend.
--
-- Why a trigger on auth.users and not a Dashboard Database Webhook?
--   Supabase's Database Webhook UI only exposes tables in the `public` schema.
--   auth.users lives in the `auth` schema, so it can't be selected there. A
--   trigger ON auth.users calling pg_net is the supported way to hook it.
--
-- BEFORE RUNNING:
--   1. Confirm the Render backend host below (currently https://edible-io.onrender.com)
--      matches prod VITE_BACKEND_URL — NOT the localhost value in .env.local.
--   2. Create the shared secret in Vault (run once, separately — this value must
--      NEVER be committed to the repo). Use the SAME value as WEBHOOK_SECRET in
--      the Render backend environment:
--
--        SELECT vault.create_secret(
--          'PASTE_A_LONG_RANDOM_STRING',
--          'webhook_shared_secret',
--          'Shared secret for server-to-server webhook routes'
--        );
--
-- Run in the Supabase SQL editor or via `supabase db push`.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) pg_net: async HTTP client (fire-and-forget, never blocks the signup txn)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) Vault read permissions.
--    Reading vault.decrypted_secrets requires, for the role the SECURITY DEFINER
--    function runs as (its owner, normally `postgres`):
--        * USAGE  ON SCHEMA vault
--        * SELECT ON vault.decrypted_secrets
--    The view is a regular (NON-security_invoker) view owned by `supabase_admin`,
--    so privileges on vault.secrets and vault._crypto_aead_det_decrypt are
--    checked as the VIEW OWNER — you do NOT need EXECUTE on the crypto
--    functions. (A SECURITY INVOKER trigger, by contrast, runs as
--    supabase_auth_admin and can never read this view: supabase/supabase-js#1514.)
--
--    Wrapped in a DO block so that if the granting role lacks ownership over the
--    vault objects the migration still completes; the trigger below is written to
--    fail safe, so signups are never blocked either way.
DO $$
BEGIN
  GRANT USAGE  ON SCHEMA vault           TO postgres;
  GRANT SELECT ON vault.decrypted_secrets TO postgres;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'notify_new_signup: could not grant vault read to postgres (%). '
    'Run as a vault-admin role if notifications stay silent: %', SQLSTATE, SQLERRM;
END $$;

-- 3) Trigger function — POSTs the new user's details to the backend, including
--    the shared-secret header read from Vault. SECURITY DEFINER so it runs as
--    the function owner (postgres) and can use net.http_post and vault
--    regardless of the inserting role (supabase_auth_admin).
--
--    The entire body is wrapped in an exception handler: ANY failure here
--    (missing secret, permission error, bad URL, pg_net missing, ...) is logged
--    as a WARNING and swallowed, so it can never roll back the signup.
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  provider text;
  v_secret text;
  v_url    text := 'https://edible-io.onrender.com/api/notify-signup';
BEGIN
  provider := COALESCE(
    new.raw_app_meta_data ->> 'provider',   -- e.g. 'email' | 'google'
    'email'
  );

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_shared_secret';

  IF v_secret IS NULL THEN
    RAISE WARNING 'notify_new_signup: vault secret "webhook_shared_secret" not found; skipping notify for %', new.id;
    RETURN new;
  END IF;

  -- pg_net enqueues the request and returns immediately; the actual HTTP call
  -- happens after commit in a background worker. timeout_milliseconds is the
  -- worker's request timeout (tolerates a Render cold start), NOT a signup wait.
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', v_secret
    ),
    body    := jsonb_build_object(
      'email',      new.email,
      'created_at', new.created_at,
      'provider',   provider,
      'user_id',    new.id
    ),
    timeout_milliseconds := 60000
  );

  RETURN new;

EXCEPTION WHEN OTHERS THEN
  -- Never let a notification side effect break the actual signup.
  RAISE WARNING 'notify_new_signup failed for user % (%): %', new.id, new.email, SQLERRM;
  RETURN new;
END;
$$;

-- 4) Attach the trigger to auth.users INSERT.
DROP TRIGGER IF EXISTS on_auth_user_created_notify ON auth.users;
CREATE TRIGGER on_auth_user_created_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_signup();

-- 5) Verify (optional): inspect recent pg_net requests + responses.
--    SELECT id, status_code, content, error_msg, created
--    FROM net._http_response
--    ORDER BY created DESC
--    LIMIT 10;
--
--    To see swallowed failures, check Postgres logs for "notify_new_signup".
--    To confirm the vault grant took, run:
--      SELECT has_schema_privilege('postgres', 'vault', 'USAGE'),
--             has_table_privilege('postgres', 'vault.decrypted_secrets', 'SELECT');
