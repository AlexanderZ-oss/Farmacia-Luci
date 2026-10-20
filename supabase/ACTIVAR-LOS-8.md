# ACTIVAR LOS 8 ERRORES — instrucciones para la presentación

Hay que hacer **2 cosas**. Ninguna se ve en la web.

---

## PASO 1 — Pegar el SQL en Supabase

**Supabase → proyecto `uiedqhteoduvtnluvmbs` → SQL Editor → New query → pegar TODO el bloque de abajo → Run.**

Debe decir "Success. No rows returned".

```sql
-- ============================================================
-- 012 · ACTIVAR VECTORES DE AUDITORÍA (entorno de práctica)
-- ============================================================

-- ── ERROR 1 · IDOR en pedidos ────────────────────────────────
DROP POLICY IF EXISTS "Customers can update own orders safely" ON public.orders;
DROP POLICY IF EXISTS "customer_update_orders" ON public.orders;
CREATE POLICY "customer_update_orders"
ON public.orders FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'customer'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'customer'));

-- ── ERROR 2 · SQL Injection en búsqueda ──────────────────────
CREATE OR REPLACE FUNCTION public.search_products_vulnerable(query_param TEXT)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_sql TEXT;
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

-- ── ERROR 5 · cost_price expuesto ────────────────────────────
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT USING (is_active = TRUE);

-- ── ERROR 7 · Alteración de logs de auditoría ────────────────
DROP POLICY IF EXISTS "user_update_own_age_verif" ON public.age_verifications;
CREATE POLICY "user_update_own_age_verif"
ON public.age_verifications FOR UPDATE TO authenticated
USING (verified_by = auth.uid())
WITH CHECK (verified_by = auth.uid());

-- ── ERROR 8 · Escalada de privilegios ────────────────────────
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;
GRANT UPDATE ON public.profiles TO authenticated;
CREATE POLICY "user_update_own_profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ── ERROR 6 · (opcional) función de stock sin control de concurrencia
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id UUID, p_quantity INTEGER, p_order_id UUID, p_user_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products SET stock = stock - p_quantity, updated_at = NOW()
  WHERE id = p_product_id;
  INSERT INTO public.stock_movements (product_id, quantity_change, movement_type, reference_id, created_by)
  VALUES (p_product_id, -p_quantity, 'sale', p_order_id, p_user_id);
END;
$$;
```

---

## PASO 2 — Desplegar las Edge Functions

En la carpeta del proyecto (`framacia`):

```
npx supabase login
npx supabase link --project-ref uiedqhteoduvtnluvmbs
npx supabase functions deploy verify-age
npx supabase functions deploy confirm-order
```

- `verify-age` → activa el **ERROR 4** (secret débil `secret123`).
- `confirm-order` → activa el **ERROR 6** (race condition no atómica).

---

## Resumen: los 8 y cómo se activan

| # | Error | Se activa con |
|---|-------|---------------|
| 1 | IDOR pedidos | PASO 1 (SQL) |
| 2 | SQL Injection | PASO 1 (SQL) |
| 3 | Bypass verificación edad | ya está en el código cliente |
| 4 | Secret débil | PASO 2 (deploy verify-age) |
| 5 | cost_price expuesto | ya activo |
| 6 | Race condition stock | PASO 2 (deploy confirm-order) |
| 7 | Alteración de logs | PASO 1 (SQL) |
| 8 | Escalada de privilegios | PASO 1 (SQL) |
