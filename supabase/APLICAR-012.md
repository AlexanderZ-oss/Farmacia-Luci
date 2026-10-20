# Aplicar la migración 012 (entorno de práctica)

Copia todo el bloque SQL de abajo y pégalo en:

**Supabase → tu proyecto → SQL Editor → New query → (pegar) → Run**

Después despliega las dos Edge Functions modificadas (sección al final).

---

## 1) SQL para el SQL Editor

```sql
-- ============================================================
-- MIGRACIÓN 012: REPOSICIÓN DE VECTORES DE PRUEBA (académico)
-- ============================================================

-- 01 · IDOR en pedidos: UPDATE sin aislar por dueño.
DROP POLICY IF EXISTS "Customers can update own orders safely" ON public.orders;
DROP POLICY IF EXISTS "customer_update_orders" ON public.orders;

CREATE POLICY "customer_update_orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'customer')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'customer')
);

-- 02 · SQL Injection: búsqueda por concatenación.
CREATE OR REPLACE FUNCTION public.search_products_vulnerable(query_param TEXT)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sql TEXT;
BEGIN
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

-- 05 · cost_price: lectura pública devuelve la fila completa.
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT USING (is_active = TRUE);

-- 07 · Alteración de logs: el dueño puede editar su verificación.
DROP POLICY IF EXISTS "user_update_own_age_verif" ON public.age_verifications;
CREATE POLICY "user_update_own_age_verif"
ON public.age_verifications
FOR UPDATE
TO authenticated
USING (verified_by = auth.uid())
WITH CHECK (verified_by = auth.uid());

-- 08 · Escalada de privilegios: el usuario puede reescribir su perfil.
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
GRANT UPDATE ON public.profiles TO authenticated;
CREATE POLICY "user_update_own_profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

---

## 2) Desplegar las Edge Functions modificadas

En la carpeta del proyecto (`framacia`), con la Supabase CLI:

```
npx supabase login
npx supabase link --project-ref uiedqhteoduvtnluvmbs
npx supabase functions deploy verify-age
npx supabase functions deploy confirm-order
```

> `confirm-order` no cambió en esta ronda; se incluye por si quieres
> volver a desplegarlo. El cambio de `verify-age` es el del secret.
