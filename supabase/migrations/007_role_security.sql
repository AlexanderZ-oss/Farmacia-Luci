-- Ensure public sign-ups always receive the customer role and only admins
-- can change profile roles.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT p.role
  FROM public.profiles AS p
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      ''
    ),
    'customer',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill accounts created before the auth trigger. Never overwrite existing roles.
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    ''
  ),
  'customer',
  true
FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Clients cannot update their own profile or grant roles. The admin RLS
-- policy below is the only path for authenticated role/activation changes.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (role, is_active) ON public.profiles TO authenticated;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING ((SELECT public.current_user_role()) = 'admin');

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING ((SELECT public.current_user_role()) = 'admin')
WITH CHECK ((SELECT public.current_user_role()) = 'admin');
