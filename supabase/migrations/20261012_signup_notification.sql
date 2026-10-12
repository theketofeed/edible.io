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
--   1. Replace <YOUR-RENDER-SERVICE> with your Render backend host, e.g.
--      https://edible-backend.onrender.com  (the same value as VITE_BACKEND_URL
--      in your Render/Vercel environment — NOT the localhost value in .env.local).
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

-- 2) Trigger function — POSTs the new user's details to the backend, including
--    the shared-secret header read from Vault. SECURITY DEFINER so it runs as
--    the function owner (postgres) and can use net.http_post and vault
--    regardless of the inserting role (supabase_auth_admin).
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net, vault
AS $$
DECLARE
  provider text;
  v_secret text;
BEGIN
  provider := COALESCE(
    new.raw_app_meta_data ->> 'provider',   -- e.g. 'email' | 'google'
    new.app_metadata     ->> 'provider',
    'email'
  );

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_shared_secret';

  PERFORM net.http_post(
    url     := 'https://<YOUR-RENDER-SERVICE>/api/notify-signup',
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
    timeout_milliseconds := 60000  -- tolerate a Render cold start
  );

  RETURN new;
END;
$$;

-- 3) Attach the trigger to auth.users INSERT.
DROP TRIGGER IF EXISTS on_auth_user_created_notify ON auth.users;
CREATE TRIGGER on_auth_user_created_notify
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_signup();

-- 4) Verify (optional): inspect recent pg_net requests + responses.
--    SELECT id, status_code, content, error_msg, created
--    FROM net._http_response
--    ORDER BY created DESC
--    LIMIT 10;
