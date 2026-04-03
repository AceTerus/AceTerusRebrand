-- omc_users contains sensitive columns (password, email, remember_token).
-- It is not accessed by the client app — Supabase Auth is used instead.
-- Drop the read policy so no client can access this table via PostgREST.

DROP POLICY IF EXISTS "Authenticated users can read omc_users" ON omc_users;

-- RLS remains enabled with no policies → all access denied by default.
