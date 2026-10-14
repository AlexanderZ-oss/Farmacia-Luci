CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id UUID NOT NULL REFERENCES public.profiles(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opening_cash NUMERIC(10,2) NOT NULL CHECK (opening_cash >= 0),
  closed_at TIMESTAMPTZ,
  expected_cash NUMERIC(10,2),
  counted_cash NUMERIC(10,2),
  difference NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (closed_at IS NULL AND expected_cash IS NULL AND counted_cash IS NULL AND difference IS NULL)
    OR
    (closed_at IS NOT NULL AND expected_cash IS NOT NULL AND counted_cash IS NOT NULL AND difference IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open_per_cashier
  ON public.cash_sessions (cashier_id)
  WHERE closed_at IS NULL;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS cash_session_id UUID REFERENCES public.cash_sessions(id),
  ADD COLUMN IF NOT EXISTS customer_dni TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.pharmacy_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.pharmacy_settings (setting_key, setting_value)
VALUES
  ('pharmacy_name', to_jsonb('Farmacia Luci'::TEXT)),
  ('address', to_jsonb(''::TEXT)),
  ('phone', to_jsonb(''::TEXT)),
  ('contact_email', to_jsonb(''::TEXT)),
  ('low_stock_threshold', to_jsonb(5))
ON CONFLICT (setting_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),
  subject TEXT NOT NULL CHECK (char_length(trim(subject)) BETWEEN 4 AND 120),
  description TEXT NOT NULL CHECK (char_length(trim(description)) BETWEEN 10 AND 4000),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('order', 'payment', 'inventory', 'account', 'technical', 'other')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS support_tickets_created_by_created_at
  ON public.support_tickets (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_status_priority_created_at
  ON public.support_tickets (status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS sales_cash_session_id
  ON public.sales (cash_session_id);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.cash_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pharmacy_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;

DROP POLICY IF EXISTS "Cashiers read own sessions" ON public.cash_sessions;
CREATE POLICY "Cashiers read own sessions"
  ON public.cash_sessions FOR SELECT TO authenticated
  USING (cashier_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins read all sessions" ON public.cash_sessions;
CREATE POLICY "Admins read all sessions"
  ON public.cash_sessions FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "Admins read pharmacy settings" ON public.pharmacy_settings;
CREATE POLICY "Admins read pharmacy settings"
  ON public.pharmacy_settings FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "Admins manage pharmacy settings" ON public.pharmacy_settings;
CREATE POLICY "Admins manage pharmacy settings"
  ON public.pharmacy_settings FOR ALL TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin')
  WITH CHECK ((SELECT public.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "Users create own tickets" ON public.support_tickets;
CREATE POLICY "Users create own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users read own tickets" ON public.support_tickets;
CREATE POLICY "Users read own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins manage all tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING ((SELECT public.current_user_role()) = 'admin')
  WITH CHECK ((SELECT public.current_user_role()) = 'admin');

CREATE OR REPLACE FUNCTION public.open_cash_session(p_opening_cash NUMERIC)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_session_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'cashier' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Solo un cajero puede abrir una caja';
  END IF;

  IF p_opening_cash IS NULL OR p_opening_cash < 0 THEN
    RAISE EXCEPTION 'El fondo inicial debe ser un monto igual o mayor que cero';
  END IF;

  INSERT INTO public.cash_sessions (cashier_id, opening_cash)
  VALUES ((SELECT auth.uid()), p_opening_cash)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_cash_session(
  p_session_id UUID,
  p_counted_cash NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_session public.cash_sessions%ROWTYPE;
  v_cash_sales NUMERIC(10,2);
  v_expected NUMERIC(10,2);
  v_difference NUMERIC(10,2);
BEGIN
  IF (SELECT public.current_user_role()) <> 'cashier' THEN
    RAISE EXCEPTION 'Solo un cajero puede cerrar su caja';
  END IF;
  IF p_counted_cash IS NULL OR p_counted_cash < 0 THEN
    RAISE EXCEPTION 'El efectivo contado debe ser un monto igual o mayor que cero';
  END IF;

  SELECT * INTO v_session
  FROM public.cash_sessions
  WHERE id = p_session_id
    AND cashier_id = (SELECT auth.uid())
    AND closed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró una caja abierta para este cajero';
  END IF;

  SELECT COALESCE(SUM(total_amount), 0)
  INTO v_cash_sales
  FROM public.sales
  WHERE cash_session_id = v_session.id
    AND status = 'completed'
    AND payment_method = 'cash';

  v_expected := v_session.opening_cash + v_cash_sales;
  v_difference := p_counted_cash - v_expected;

  UPDATE public.cash_sessions
  SET closed_at = NOW(),
      expected_cash = v_expected,
      counted_cash = p_counted_cash,
      difference = v_difference
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'expected_cash', v_expected,
    'counted_cash', p_counted_cash,
    'difference', v_difference
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_sale(
  p_sale_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_sale public.sales%ROWTYPE;
  v_item RECORD;
BEGIN
  IF COALESCE((SELECT public.current_user_role()), '') NOT IN ('cashier', 'admin') THEN
    RAISE EXCEPTION 'No tienes permiso para anular boletas';
  END IF;
  IF char_length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Indica un motivo de anulación de al menos 5 caracteres';
  END IF;

  SELECT * INTO v_sale
  FROM public.sales
  WHERE id = p_sale_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró la boleta';
  END IF;
  IF (SELECT public.current_user_role()) <> 'admin'
    AND v_sale.cashier_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Solo puedes anular tus propias boletas';
  END IF;
  IF v_sale.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION 'La boleta ya fue anulada o no está completada';
  END IF;
  IF v_sale.cash_session_id IS NOT NULL THEN
    PERFORM 1
    FROM public.cash_sessions
    WHERE id = v_sale.cash_session_id
    FOR UPDATE;
  END IF;

  FOR v_item IN
    SELECT product_id, quantity
    FROM public.sale_items
    WHERE sale_id = v_sale.id
  LOOP
    UPDATE public.products
    SET stock = stock + v_item.quantity,
        updated_at = NOW()
    WHERE id = v_item.product_id;

    INSERT INTO public.stock_movements
      (product_id, quantity_change, movement_type, reference_id, notes, created_by)
    VALUES
      (v_item.product_id, v_item.quantity, 'return', v_sale.id, trim(p_reason), (SELECT auth.uid()));
  END LOOP;

  UPDATE public.sales
  SET status = 'cancelled',
      cancellation_reason = trim(p_reason),
      cancelled_by = (SELECT auth.uid()),
      cancelled_at = NOW()
  WHERE id = v_sale.id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_sale_transaction(
  p_cashier_id UUID,
  p_total_amount NUMERIC(10,2),
  p_payment_method TEXT,
  p_age_verification_id UUID,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_sale_id UUID;
  v_session_id UUID;
  v_item JSONB;
  v_items JSONB;
  v_product public.products%ROWTYPE;
  v_quantity INTEGER;
  v_total NUMERIC(10,2) := 0;
  v_customer_dni TEXT;
  v_customer_name TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_cashier_id AND role = 'cashier' AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El usuario no es un cajero activo';
  END IF;
  IF p_total_amount IS NULL OR p_total_amount < 0 THEN
    RAISE EXCEPTION 'El total de la venta no es válido';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('cash', 'card', 'transfer', 'other') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;
  IF jsonb_typeof(p_items) = 'array' THEN
    v_items := p_items;
  ELSIF jsonb_typeof(p_items) = 'object' THEN
    v_items := p_items->'items';
    v_customer_dni := NULLIF(trim(p_items->>'customer_dni'), '');
    v_customer_name := NULLIF(trim(p_items->>'customer_name'), '');
  END IF;
  IF v_items IS NULL OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe incluir productos';
  END IF;
  IF (v_customer_dni IS NULL) <> (v_customer_name IS NULL)
    OR (v_customer_dni IS NOT NULL AND (
      v_customer_dni !~ '^[0-9]{8}$'
      OR char_length(v_customer_name) < 3
    )) THEN
    RAISE EXCEPTION 'El DNI y el nombre del cliente deben ser válidos';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_items) AS item(value)
    GROUP BY item.value->>'product_id'
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Combina las cantidades de productos repetidos antes de cobrar';
  END IF;

  SELECT id INTO v_session_id
  FROM public.cash_sessions
  WHERE cashier_id = p_cashier_id AND closed_at IS NULL
  FOR UPDATE;
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Abre la caja antes de registrar una venta';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'La cantidad de cada producto debe ser mayor que cero';
    END IF;

    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
      AND is_active = true
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Producto no encontrado o inactivo';
    END IF;
    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stock insuficiente para %', v_product.name;
    END IF;

    v_total := v_total + (v_product.price * v_quantity);
  END LOOP;

  IF round(v_total, 2) <> round(p_total_amount, 2) THEN
    RAISE EXCEPTION 'El total de la venta no coincide con los precios actuales';
  END IF;

  INSERT INTO public.sales
    (cashier_id, cash_session_id, total_amount, payment_method, age_verification_id, customer_dni, customer_name)
  VALUES
    (p_cashier_id, v_session_id, v_total, p_payment_method, p_age_verification_id, v_customer_dni, v_customer_name)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    v_quantity := (v_item->>'quantity')::INTEGER;
    SELECT * INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale_id, v_product.id, v_quantity, v_product.price);

    UPDATE public.products
    SET stock = stock - v_quantity,
        updated_at = NOW()
    WHERE id = v_product.id;

    INSERT INTO public.stock_movements
      (product_id, quantity_change, movement_type, reference_id, created_by)
    VALUES
      (v_product.id, -v_quantity, 'sale', v_sale_id, p_cashier_id);
  END LOOP;

  RETURN jsonb_build_object('sale_id', v_sale_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.open_cash_session(NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.close_cash_session(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_sale(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_sale_transaction(UUID, NUMERIC, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_cash_session(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_cash_session(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_sale(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(UUID, NUMERIC, TEXT, UUID, JSONB) TO service_role;
