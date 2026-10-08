-- Migration 001: Initial Schema
-- Nota: La estructura se ha generado siguiendo las mejores prácticas de seguridad.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpieza previa para evitar errores de "already exists" si ejecutas el script más de una vez
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS age_verifications CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Profiles Table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'stocker', 'cashier', 'customer')) NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    barcode TEXT UNIQUE,
    price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2),
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    requires_age_verification BOOLEAN DEFAULT false,
    age_limit INTEGER DEFAULT 18,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id),
    updated_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Age Verifications
CREATE TABLE age_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni_hash TEXT NOT NULL,
    result TEXT CHECK (result IN ('approved', 'rejected')) NOT NULL,
    age_calculated INTEGER,
    verified_by UUID REFERENCES profiles(id),
    context TEXT CHECK (context IN ('pos', 'web')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Stock Movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    movement_type TEXT CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'return')) NOT NULL,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Sales (Caja)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cashier_id UUID REFERENCES profiles(id),
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer', 'other')) NOT NULL,
    status TEXT CHECK (status IN ('completed', 'cancelled', 'refunded')) DEFAULT 'completed',
    age_verification_id UUID REFERENCES age_verifications(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Sale Items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- 8. Orders (Web)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES profiles(id),
    status TEXT CHECK (status IN ('pending', 'confirmed', 'shipped', 'ready_pickup', 'delivered', 'cancelled')) DEFAULT 'pending',
    total_amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    payment_reference TEXT,
    delivery_type TEXT CHECK (delivery_type IN ('delivery', 'pickup')) NOT NULL,
    delivery_address JSONB,
    age_verification_id UUID REFERENCES age_verifications(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Order Items
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    subtotal NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
