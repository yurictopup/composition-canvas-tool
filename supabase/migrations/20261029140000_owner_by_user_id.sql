-- =============================================
-- Yuric Topup: the owner is one account (its user id), not an email in the
-- sign-in token. The id is looked up once here from the owner email and kept
-- in private.store_owner (no API access). Changing the account's email later
-- does not change who the owner is.
-- Still needs the 6-digit authenticator code (session level aal2).
-- Every owner policy and trigger already asks public.is_owner(), so only
-- that function changes.
-- New owner account: UPDATE private.store_owner SET user_id = '<uuid>';
-- =============================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.store_owner (
  one     boolean PRIMARY KEY DEFAULT true CHECK (one),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
);
REVOKE ALL ON private.store_owner FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  found integer;
BEGIN
  IF EXISTS (SELECT 1 FROM private.store_owner) THEN
    RETURN;
  END IF;
  SELECT count(*) INTO found FROM auth.users
  WHERE lower(email) = 'yurictopup@gmail.com' AND email_confirmed_at IS NOT NULL;
  IF found <> 1 THEN
    RAISE EXCEPTION 'Expected one confirmed owner account yurictopup@gmail.com, found %.', found;
  END IF;
  INSERT INTO private.store_owner (user_id)
  SELECT id FROM auth.users
  WHERE lower(email) = 'yurictopup@gmail.com' AND email_confirmed_at IS NOT NULL;
END;
$$;

-- The verified owner: the owner account with the 6-digit code passed.
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     AND EXISTS (SELECT 1 FROM private.store_owner o WHERE o.user_id = auth.uid());
$$;

-- The owner account before the code (lets /admin ask for the code). Grants nothing.
CREATE OR REPLACE FUNCTION public.is_owner_account()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM private.store_owner o WHERE o.user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_owner_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_owner() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_account() TO authenticated;
