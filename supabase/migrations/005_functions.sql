-- ============================================================
-- MIGRACIÓN 005: FUNCIONES RPC AUXILIARES
-- Ejecutar DESPUÉS de 003_seed.sql
-- Estas funciones son usadas por las Edge Functions para
-- ejecutar operaciones atómicas en la base de datos.
-- ============================================================

-- ============================================================
-- FUNCIÓN: create_sale_transaction
-- Crea una venta completa en una sola transacción atómica:
-- INSERT en sales + sale_items + stock_movements + UPDATE stock
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_sale_transaction(
  p_cashier_id          UUID,
  p_total_amount        NUMERIC(10,2),
  p_payment_method      TEXT,
  p_age_verification_id UUID,
  p_items               JSONB  -- [{ product_id, quantity, unit_price }]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_sale_id UUID;
  v_item    JSONB;
BEGIN
  -- Insertar la venta
  INSERT INTO public.sales (cashier_id, total_amount, payment_method, age_verification_id)
  VALUES (p_cashier_id, p_total_amount, p_payment_method, p_age_verification_id)
  RETURNING id INTO v_sale_id;

  -- Procesar cada ítem
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insertar ítem de venta
    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (
      v_sale_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price')::NUMERIC(10,2)
    );

    -- Decrementar stock con SELECT FOR UPDATE (atómico)
    UPDATE public.products
    SET stock = stock - (v_item->>'quantity')::INTEGER,
        updated_at = NOW()
    WHERE id = (v_item->>'product_id')::UUID
      AND stock >= (v_item->>'quantity')::INTEGER;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %', v_item->>'product_id';
    END IF;

    -- Registrar movimiento de inventario
    INSERT INTO public.stock_movements
      (product_id, quantity_change, movement_type, reference_id, created_by)
    VALUES (
      (v_item->>'product_id')::UUID,
      -((v_item->>'quantity')::INTEGER),
      'sale',
      v_sale_id,
      p_cashier_id
    );
  END LOOP;

  RETURN jsonb_build_object('sale_id', v_sale_id);
END;
$$;

COMMENT ON FUNCTION public.create_sale_transaction IS
  'Crea una venta en caja de forma atómica con decremento de stock y registro de movimiento.';

-- ============================================================
-- FUNCIÓN: decrement_stock
-- Decrementa el stock de un producto y registra el movimiento.
-- Usada por confirm-order Edge Function.
-- NOTA: Esta función NO garantiza atomicidad con el SELECT previo
-- en la Edge Function — eso es VULN-06. La corrección sería
-- usar una función similar a create_sale_transaction para orders.
-- ============================================================
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id UUID,
  p_quantity   INTEGER,
  p_order_id   UUID,
  p_user_id    UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id
    AND stock >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para producto %', p_product_id;
  END IF;

  INSERT INTO public.stock_movements
    (product_id, quantity_change, movement_type, reference_id, created_by)
  VALUES (
    p_product_id,
    -p_quantity,
    'sale',
    p_order_id,
    p_user_id
  );
END;
$$;

COMMENT ON FUNCTION public.decrement_stock IS
  'Decrementa stock y registra movimiento para pedidos web. Ver VULN-06.';

-- ============================================================
-- FUNCIÓN: get_dashboard_stats (para el panel de Admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Solo admin puede ejecutar
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  SELECT jsonb_build_object(
    'total_sales_today',
    COALESCE((
      SELECT SUM(total_amount)
      FROM public.sales
      WHERE created_at >= CURRENT_DATE
        AND status = 'completed'
    ), 0),

    'total_orders_today',
    COALESCE((
      SELECT COUNT(*)
      FROM public.orders
      WHERE created_at >= CURRENT_DATE
    ), 0),

    'low_stock_products',
    COALESCE((
      SELECT COUNT(*)
      FROM public.products
      WHERE stock <= min_stock
        AND is_active = TRUE
    ), 0),

    'active_users',
    COALESCE((
      SELECT COUNT(*)
      FROM public.profiles
      WHERE is_active = TRUE
        AND role != 'customer'
    ), 0),

    'pending_orders',
    COALESCE((
      SELECT COUNT(*)
      FROM public.orders
      WHERE status = 'pending'
    ), 0),

    'total_products',
    COALESCE((
      SELECT COUNT(*)
      FROM public.products
      WHERE is_active = TRUE
    ), 0)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats IS
  'Retorna estadísticas del dashboard para el administrador.';

-- ============================================================
-- FUNCIÓN: get_sales_report (para reportes de Admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_sales_report(
  p_from DATE,
  p_to   DATE
)
RETURNS TABLE (
  sale_date    DATE,
  total_sales  NUMERIC,
  num_sales    BIGINT,
  top_product  TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF public.get_my_role() != 'admin' THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  RETURN QUERY
  SELECT
    s.created_at::DATE AS sale_date,
    SUM(s.total_amount) AS total_sales,
    COUNT(s.id) AS num_sales,
    (
      SELECT p.name
      FROM public.sale_items si2
      JOIN public.products p ON p.id = si2.product_id
      JOIN public.sales s2 ON s2.id = si2.sale_id
      WHERE s2.created_at::DATE = s.created_at::DATE
      GROUP BY p.name
      ORDER BY SUM(si2.quantity) DESC
      LIMIT 1
    ) AS top_product
  FROM public.sales s
  WHERE s.created_at::DATE BETWEEN p_from AND p_to
    AND s.status = 'completed'
  GROUP BY s.created_at::DATE
  ORDER BY sale_date DESC;
END;
$$;

-- ============================================================
-- FIN DE MIGRACIÓN 005
-- ============================================================
