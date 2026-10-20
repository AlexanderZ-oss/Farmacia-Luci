-- ============================================================
-- MIGRACIÓN 012: REPOSICIÓN DE VECTORES DE PRUEBA (entorno académico)
-- ============================================================
-- DOCUMENTO RESTRINGIDO — USO ACADÉMICO / AUDITORÍA
--
-- Este archivo restaura los vectores de ataque documentados en
-- 004_audit_vulns.sql que quedaron mitigados por 002_rls.sql y
-- 007_role_security.sql. Se aplica EXCLUSIVAMENTE sobre el entorno
-- de práctica para que las comprobaciones R1–R8 vuelvan a ser
-- reproducibles.
--
-- NUNCA aplicar en producción con datos reales.
--
-- Trazabilidad:
--   01 IDOR pedidos          → policy v2 "customer_update_orders"
--   02 SQL Injection         → función search_products_vulnerable
--   05 Exposición cost_price → intacta (columna sin CGS)
--   07 Alteración de logs    → policy v2 "user_update_own_age_verif"
--   08 Escalada de rol       → policy v2 "user_update_own_profile"
-- ============================================================

-- ------------------------------------------------------------
-- 01 · IDOR en pedidos: UPDATE sin aislar por dueño.
--      El USING sólo comprueba el rol, no que customer_id = auth.uid().
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can update own orders safely" ON public.orders;
DROP POLICY IF EXISTS "customer_update_orders" ON public.orders;

CREATE POLICY "customer_update_orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'customer'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'customer'
  )
);

-- ------------------------------------------------------------
-- 02 · SQL Injection: reconstruye la búsqueda por concatenación.
--      El buscador de la app apunta aquí (ver catalog.tsx).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_products_vulnerable(query_param TEXT)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
BEGIN
  -- Concatenación directa del parámetro de usuario (sin bind).
  v_sql := format(
    'SELECT to_jsonb(p) || jsonb_build_object('
    '  ''categories'', (SELECT to_jsonb(c) FROM public.categories c WHERE c.id = p.category_id),'
    '  ''product_images'', (SELECT COALESCE(jsonb_agg(to_jsonb(pi) ORDER BY pi.sort_order), ''[]''::jsonb)'
    '                        FROM public.product_images pi WHERE pi.product_id = p.id)'
    ') FROM public.products p WHERE p.is_active = TRUE AND p.name LIKE ''%%%s%%'' ORDER BY p.name',
    query_param
  );
  RETURN QUERY EXECUTE v_sql;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_products_vulnerable(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_products_vulnerable(TEXT) TO anon;

COMMENT ON FUNCTION public.search_products_vulnerable IS
  'Búsqueda por concatenación (format). Revisar sanitización antes de usar en producción.';

-- ------------------------------------------------------------
-- 05 · cost_price: se garantiza que la lectura pública devuelva
--      la fila completa (incluida la columna de costo) sin
--      proyección de columnas por rol.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = TRUE);

-- ------------------------------------------------------------
-- 07 · Alteración de logs: permite al propietario modificar el
--      resultado de su propia verificación.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "user_update_own_age_verif" ON public.age_verifications;

CREATE POLICY "user_update_own_age_verif"
ON public.age_verifications
FOR UPDATE
TO authenticated
USING (verified_by = auth.uid())
WITH CHECK (verified_by = auth.uid());

-- ------------------------------------------------------------
-- 08 · Escalada de privilegios: el usuario puede reescribir su
--      propio perfil, incluida la columna role.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;

-- Se restaura el permiso de UPDATE que 007 había acotado a (role, is_active).
GRANT UPDATE ON public.profiles TO authenticated;

CREATE POLICY "user_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================
-- FIN DE MIGRACIÓN 012
-- ============================================================
