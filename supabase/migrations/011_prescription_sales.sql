-- Venta con receta vs. venta simple en el POS.
--
-- Reglas:
--   * Si el carrito incluye al menos un producto con requires_prescription = true,
--     la venta exige DNI (8 dígitos, verificado por la API) y número de receta.
--   * Si no, la venta es simple: solo se puede guardar el nombre del cliente
--     (opcional) y no se exige DNI ni receta.

-- 1) Marca de receta por producto (la define el inventario).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN NOT NULL DEFAULT false;

-- 2) Datos de receta en la venta.
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS has_prescription BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prescription_number TEXT;

CREATE INDEX IF NOT EXISTS products_requires_prescription
  ON public.products (requires_prescription)
  WHERE requires_prescription = true;

-- 3) La venta: si hay algún producto con receta, exigir DNI + número de receta.
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
  v_prescription_number TEXT;
  v_requires_prescription BOOLEAN := false;
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
    v_prescription_number := NULLIF(trim(p_items->>'prescription_number'), '');
  END IF;
  IF v_items IS NULL OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'La venta debe incluir productos';
  END IF;

  -- ¿El carrito contiene algún producto que requiere receta?
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_items) AS item(value)
    JOIN public.products AS product ON product.id = (item.value->>'product_id')::UUID
    WHERE product.requires_prescription = true
  ) INTO v_requires_prescription;

  -- Validación del cliente.
  --   Con receta: DNI verificado + nombre + número de receta obligatorios.
  --   Sin receta: nombre opcional y sin DNI.
  IF v_requires_prescription THEN
    IF v_customer_dni IS NULL OR v_customer_name IS NULL THEN
      RAISE EXCEPTION 'Este producto requiere receta: registra el DNI y el nombre del cliente';
    END IF;
    IF v_customer_dni !~ '^[0-9]{8}$' OR char_length(v_customer_name) < 3 THEN
      RAISE EXCEPTION 'El DNI y el nombre del cliente deben ser válidos';
    END IF;
    IF v_prescription_number IS NULL OR char_length(v_prescription_number) < 4 THEN
      RAISE EXCEPTION 'Ingresa el número de receta médica para esta venta';
    END IF;
  ELSE
    -- Venta simple: el nombre es opcional, y no se admite receta ni DNI suelto.
    IF v_customer_dni IS NOT NULL THEN
      RAISE EXCEPTION 'La venta sin receta no requiere DNI, solo el nombre del cliente';
    END IF;
    IF v_customer_name IS NOT NULL AND char_length(v_customer_name) < 3 THEN
      RAISE EXCEPTION 'El nombre del cliente es demasiado corto';
    END IF;
    IF v_prescription_number IS NOT NULL THEN
      RAISE EXCEPTION 'La venta no contiene productos que requieran receta';
    END IF;
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
    (cashier_id, cash_session_id, total_amount, payment_method, age_verification_id,
     customer_dni, customer_name, has_prescription, prescription_number)
  VALUES
    (p_cashier_id, v_session_id, v_total, p_payment_method, p_age_verification_id,
     v_customer_dni, v_customer_name, v_requires_prescription, v_prescription_number)
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

REVOKE ALL ON FUNCTION public.create_sale_transaction(UUID, NUMERIC, TEXT, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale_transaction(UUID, NUMERIC, TEXT, UUID, JSONB) TO service_role;
