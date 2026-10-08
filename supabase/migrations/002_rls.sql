-- Migration 002: Row Level Security (RLS)
-- Nota: Estas políticas han sido creadas de forma SEGURA y ESTRICTA.
-- Se han MITIGADO TODAS LAS VULNERABILIDADES solicitadas en la Fase 10 (VULN-01, VULN-05, VULN-07, VULN-08).

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- SECURE: Evita Privilege Escalation limitando la actualización del rol
CREATE POLICY "Users can update own profile safely" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Categories
CREATE POLICY "Anyone can view categories" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view categories" ON categories FOR SELECT TO anon USING (true);
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Products
CREATE POLICY "Anyone can view active products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Admin and stocker can manage products" ON products FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'stocker')));

-- 4. Orders
-- SECURE: Mitiga IDOR asegurando que solo el dueño del pedido puede actualizarlo
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Customers can insert own orders" ON orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Customers can update own orders safely" ON orders FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON orders FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all orders" ON orders FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 5. Order Items
CREATE POLICY "Customers can view own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "Customers can insert own order items" ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())
);
CREATE POLICY "Admins can view all order items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. Age Verifications
-- SECURE: Mitiga el "Audit Log Tampering" prohibiendo el UPDATE completamente
CREATE POLICY "Users can view own verifications" ON age_verifications FOR SELECT USING (verified_by = auth.uid());
CREATE POLICY "Users can insert own verifications" ON age_verifications FOR INSERT WITH CHECK (verified_by = auth.uid());

-- 7. Sales y Sale Items
CREATE POLICY "Cashiers can insert and view own sales" ON sales FOR INSERT WITH CHECK (cashier_id = auth.uid());
CREATE POLICY "Cashiers can view own sales" ON sales FOR SELECT USING (cashier_id = auth.uid());
CREATE POLICY "Admins can view all sales" ON sales FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Cashiers can insert sale items" ON sale_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.cashier_id = auth.uid())
);
CREATE POLICY "Cashiers can view own sale items" ON sale_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND sales.cashier_id = auth.uid())
);
CREATE POLICY "Admins can view all sale items" ON sale_items FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. Stock Movements
CREATE POLICY "Stockers can insert stock movements" ON stock_movements FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'stocker')));
CREATE POLICY "Stockers can view stock movements" ON stock_movements FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'stocker')));
