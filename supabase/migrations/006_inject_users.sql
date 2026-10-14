-- ============================================================
-- Migration 006: Inject / Upsert Role Users
-- ============================================================
-- Este script crea (si no existen) los perfiles de los tres
-- usuarios de sistema con sus roles asignados.
-- 
-- IMPORTANTE:  Los usuarios deben existir ya en auth.users
-- (créalos en Supabase Dashboard → Authentication → Users o
-- via Admin API antes de correr este script).
--
-- Emails de sistema:
--   admin@gmail.com      → role: admin
--   cajero@gmail.com     → role: cashier
--   inventario@gmail.com → role: stocker
-- ============================================================

-- Forzar que el admin tenga rol 'admin' en profiles
-- (usa ON CONFLICT para actualizar si ya existe el perfil)
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Administrador'),
  'admin',
  true
FROM auth.users u
WHERE u.email = 'admin@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role       = 'admin',
  full_name  = COALESCE(profiles.full_name, 'Administrador'),
  is_active  = true,
  updated_at = NOW();

-- Cajero
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Cajero Principal'),
  'cashier',
  true
FROM auth.users u
WHERE u.email = 'cajero@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role       = 'cashier',
  full_name  = COALESCE(profiles.full_name, 'Cajero Principal'),
  is_active  = true,
  updated_at = NOW();

-- Inventario / Stocker
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', 'Encargado de Inventario'),
  'stocker',
  true
FROM auth.users u
WHERE u.email = 'inventario@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  role       = 'stocker',
  full_name  = COALESCE(profiles.full_name, 'Encargado de Inventario'),
  is_active  = true,
  updated_at = NOW();

-- Verificación: muestra los perfiles insertados
SELECT id, email, full_name, role, is_active, created_at
FROM profiles
WHERE email IN ('admin@gmail.com', 'cajero@gmail.com', 'inventario@gmail.com')
ORDER BY role;
