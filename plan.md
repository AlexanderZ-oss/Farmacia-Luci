# 🏥 Farmacia — Plan de Implementación Técnica Completo

> **Estado:** Fase 0 — Planificación  
> **Stack:** React Native (Expo) + TypeScript + Supabase + NativeWind  
> **Plataformas:** Web (Vercel) · Android · iOS  
> **Última actualización:** 2026-10-07

---

## Índice

1. [Fases del proyecto](#fases)
2. [Estructura de carpetas](#estructura)
3. [Esquema de base de datos](#schema)
4. [Modelo de seguridad y RLS](#rls)
5. [Vulnerabilidades intencionales de auditoría](#vulns)
6. [Edge Functions](#edge-functions)
7. [Pantallas por rol](#pantallas)
8. [Orden de ejecución](#orden)
9. [Checklist de progreso](#checklist)

---

## 1. Fases del proyecto {#fases}

| Fase | Nombre | Descripción |
|------|--------|-------------|
| **0** | Planificación | Este documento. Definición total antes de codificar. |
| **1** | Scaffold + Config | Crear proyecto Expo, instalar deps, configurar Supabase, EAS, Git. |
| **2** | Base de datos | Diseñar y migrar todas las tablas, RLS, seed data. |
| **3** | Auth + Enrutamiento | Login único, detección de rol, guards de navegación por rol. |
| **4** | Panel Administrador | Dashboard, gestión de usuarios, reportes, configuración. |
| **5** | Panel Reponedor | CRUD de productos, stock, precios, fotografías. |
| **6** | Panel Cajero | Carrito de caja, búsqueda/escaneo, boletas, métodos de pago. |
| **7** | Tienda Web (Cliente) | Catálogo público, carrito, checkout, seguimiento de pedido. |
| **8** | Verificación de edad | Edge Function DNI, integración en caja y web. |
| **9** | Pagos | Integración Mercado Pago / Culqi en checkout web. |
| **10** | Vulnerabilidades | Insertar las 8 vulnerabilidades de auditoría de forma controlada. |
| **11** | Testing & QA | Pruebas por rol, pruebas de penetración manual de las 8 vulns. |
| **12** | Despliegue | Vercel (web), EAS Build (móvil), variables de entorno de producción. |

---

## 2. Estructura de carpetas {#estructura}

```
framacia/
├── app/                          # Expo Router — páginas/screens
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (admin)/
│   │   ├── _layout.tsx           # Guard: solo rol admin
│   │   ├── index.tsx             # Dashboard admin
│   │   ├── users.tsx             # Gestión de usuarios
│   │   ├── reports.tsx           # Reportes de ventas
│   │   └── settings.tsx
│   ├── (stocker)/
│   │   ├── _layout.tsx           # Guard: solo rol stocker
│   │   ├── index.tsx             # Dashboard inventario
│   │   ├── products.tsx          # Lista/búsqueda de productos
│   │   ├── product-form.tsx      # Crear/editar producto
│   │   └── stock.tsx             # Ajuste de stock
│   ├── (cashier)/
│   │   ├── _layout.tsx           # Guard: solo rol cashier
│   │   ├── index.tsx             # POS — carrito de caja
│   │   ├── scanner.tsx           # Escaneo de código de barras
│   │   └── receipts.tsx          # Historial de boletas
│   ├── (store)/
│   │   ├── _layout.tsx           # Guard: rol customer (o sin sesión para browse)
│   │   ├── index.tsx             # Home tienda
│   │   ├── catalog.tsx           # Catálogo con filtros
│   │   ├── product/[id].tsx      # Detalle de producto
│   │   ├── cart.tsx              # Carrito de compras
│   │   ├── checkout.tsx          # Formulario + pago
│   │   └── orders.tsx            # Seguimiento de pedidos
│   └── _layout.tsx               # Root layout (font loading, auth gate)
├── components/
│   ├── ui/                       # Componentes base (Button, Input, Card…)
│   ├── auth/                     # LoginForm, RoleGuard
│   ├── products/                 # ProductCard, ProductForm, ImagePicker
│   ├── cart/                     # CartItem, CartSummary, AgeVerificationModal
│   ├── pos/                      # POSCart, PaymentMethodSelector, ReceiptView
│   └── admin/                    # UserTable, ReportChart, StatsCard
├── lib/
│   ├── supabase.ts               # Cliente Supabase (singleton)
│   ├── supabase-server.ts        # Cliente con service role (solo Edge Fns)
│   └── utils.ts                  # Helpers generales
├── stores/
│   ├── authStore.ts              # Zustand: sesión, rol, perfil
│   ├── cartStore.ts              # Zustand: carrito web
│   └── posStore.ts               # Zustand: carrito de caja (POS)
├── hooks/
│   ├── useProfile.ts             # TanStack Query: perfil usuario
│   ├── useProducts.ts            # TanStack Query: catálogo
│   ├── useOrders.ts              # TanStack Query: pedidos
│   └── useSales.ts               # TanStack Query: ventas/boletas
├── types/
│   └── database.ts               # Tipos generados por Supabase CLI
├── constants/
│   └── roles.ts                  # Enum de roles
├── supabase/
│   ├── migrations/               # SQL de migraciones en orden
│   │   ├── 001_schema.sql
│   │   ├── 002_rls.sql
│   │   ├── 003_seed.sql
│   │   └── 004_audit_vulns.sql   # Vulnerabilidades intencionales (RESTRINGIDO)
│   └── functions/
│       ├── verify-age/           # Edge Function: verificación DNI
│       ├── confirm-sale/         # Edge Function: confirmar venta caja
│       └── confirm-order/        # Edge Function: confirmar pedido web
├── assets/
│   └── images/
├── .env.local                    # Variables locales (NO commitar)
├── .env.example                  # Template de variables requeridas
├── app.json                      # Config Expo
├── eas.json                      # Config EAS Build
├── tailwind.config.js            # NativeWind
└── tsconfig.json
```

---

## 3. Esquema de base de datos {#schema}

### 3.1 Tablas principales

#### `profiles`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK → `auth.users.id` | ID del usuario (hereda de Supabase Auth) |
| `email` | `text` | Email (redundante para consultas admin) |
| `full_name` | `text` | Nombre completo |
| `role` | `text` CHECK (`admin`,`stocker`,`cashier`,`customer`) | Rol del usuario |
| `is_active` | `boolean` DEFAULT `true` | Bandera de bloqueo de cuenta |
| `created_at` | `timestamptz` | Fecha de creación |
| `updated_at` | `timestamptz` | Última modificación |

#### `categories`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `name` | `text` UNIQUE | Ej: "Medicamentos", "Cosméticos" |
| `description` | `text` | |
| `created_at` | `timestamptz` | |

#### `products`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `name` | `text` NOT NULL | Nombre del producto |
| `description` | `text` | |
| `category_id` | `uuid` FK → `categories.id` | |
| `barcode` | `text` UNIQUE | Código de barras para escaneo |
| `price` | `numeric(10,2)` NOT NULL | Precio de venta |
| `cost_price` | `numeric(10,2)` | Precio de costo (solo admin/stocker) |
| `stock` | `integer` DEFAULT 0 | Unidades disponibles |
| `min_stock` | `integer` DEFAULT 5 | Umbral para alerta de stock bajo |
| `requires_age_verification` | `boolean` DEFAULT `false` | ¿Producto restringido por edad? |
| `age_limit` | `integer` DEFAULT 18 | Edad mínima requerida |
| `image_url` | `text` | URL en Supabase Storage |
| `is_active` | `boolean` DEFAULT `true` | ¿Visible en catálogo? |
| `created_by` | `uuid` FK → `profiles.id` | Quién lo creó |
| `updated_by` | `uuid` FK → `profiles.id` | Quién lo modificó por última vez |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### `stock_movements`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `product_id` | `uuid` FK → `products.id` | |
| `quantity_change` | `integer` | Positivo = entrada, negativo = salida |
| `movement_type` | `text` CHECK (`sale`,`purchase`,`adjustment`,`return`) | |
| `reference_id` | `uuid` | ID de la venta u orden que generó el movimiento |
| `notes` | `text` | |
| `created_by` | `uuid` FK → `profiles.id` | |
| `created_at` | `timestamptz` | |

#### `sales` (ventas en caja)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `cashier_id` | `uuid` FK → `profiles.id` | Cajero que realizó la venta |
| `total_amount` | `numeric(10,2)` | Total de la venta |
| `payment_method` | `text` CHECK (`cash`,`card`,`transfer`,`other`) | |
| `status` | `text` CHECK (`completed`,`cancelled`,`refunded`) DEFAULT `completed` | |
| `age_verification_id` | `uuid` FK → `age_verifications.id` | Si aplica |
| `created_at` | `timestamptz` | |

#### `sale_items`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `sale_id` | `uuid` FK → `sales.id` | |
| `product_id` | `uuid` FK → `products.id` | |
| `quantity` | `integer` NOT NULL | |
| `unit_price` | `numeric(10,2)` NOT NULL | Precio al momento de la venta |
| `subtotal` | `numeric(10,2)` GENERATED | `quantity * unit_price` |

#### `orders` (pedidos web)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `customer_id` | `uuid` FK → `profiles.id` | |
| `status` | `text` CHECK (`pending`,`confirmed`,`shipped`,`ready_pickup`,`delivered`,`cancelled`) DEFAULT `pending` | |
| `total_amount` | `numeric(10,2)` | |
| `payment_method` | `text` | |
| `payment_status` | `text` CHECK (`pending`,`paid`,`failed`,`refunded`) DEFAULT `pending` | |
| `payment_reference` | `text` | ID externo del proveedor de pagos |
| `delivery_type` | `text` CHECK (`delivery`,`pickup`) | |
| `delivery_address` | `jsonb` | `{street, city, zip, notes}` |
| `age_verification_id` | `uuid` FK → `age_verifications.id` | Si aplica |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

#### `order_items`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `order_id` | `uuid` FK → `orders.id` | |
| `product_id` | `uuid` FK → `products.id` | |
| `quantity` | `integer` | |
| `unit_price` | `numeric(10,2)` | |
| `subtotal` | `numeric(10,2)` GENERATED | |

#### `age_verifications`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | |
| `dni_hash` | `text` | Hash SHA-256 del DNI (nunca texto plano) |
| `result` | `text` CHECK (`approved`,`rejected`) | |
| `age_calculated` | `integer` | Edad calculada al momento de la verificación |
| `verified_by` | `uuid` FK → `profiles.id` | Quién disparó la verificación |
| `context` | `text` CHECK (`pos`,`web`) | ¿Desde qué canal? |
| `created_at` | `timestamptz` | |

---

## 4. Modelo de seguridad y RLS {#rls}

### 4.1 Principios generales

- **Ninguna operación sensible ocurre en el cliente.** Las Edge Functions reciben la solicitud, validan el rol del llamante via `auth.uid()`, y ejecutan la lógica.
- **RLS activo en todas las tablas.** Por defecto todo está denegado (`DENY ALL`); las políticas solo abren lo necesario.
- **Los roles se leen de `profiles.role`**, nunca de JWT custom claims directamente (para evitar que un cliente forge su rol).
- **`service_role` se usa solo en Edge Functions**, nunca en el cliente.

### 4.2 Políticas RLS por tabla (resumen)

| Tabla | admin | stocker | cashier | customer | anon |
|-------|-------|---------|---------|----------|------|
| `profiles` | SELECT/UPDATE todos | SELECT propio | SELECT propio | SELECT propio | — |
| `products` | ALL | ALL | SELECT activos | SELECT activos | SELECT activos |
| `categories` | ALL | SELECT | SELECT | SELECT | SELECT |
| `stock_movements` | SELECT | INSERT/SELECT | SELECT propio | — | — |
| `sales` | SELECT todos | — | INSERT/SELECT propio | — | — |
| `sale_items` | SELECT todos | — | INSERT/SELECT por sale | — | — |
| `orders` | SELECT todos | — | — | INSERT/SELECT propio | — |
| `order_items` | SELECT todos | — | — | INSERT/SELECT por order | — |
| `age_verifications` | SELECT todos | — | INSERT/SELECT propio | INSERT/SELECT propio | — |

---

## 5. Vulnerabilidades intencionales de auditoría {#vulns}

> [!CAUTION]
> Esta sección es de uso **EXCLUSIVAMENTE interno y académico**. Las vulnerabilidades deben ser documentadas, etiquetadas con comentarios `-- VULN-XX` en el SQL, y corregidas antes de cualquier despliegue con datos reales.

| ID | Nombre | Dónde | Tipo | Descripción de la vulnerabilidad |
|----|--------|-------|------|----------------------------------|
| VULN-01 | **IDOR en pedidos** | RLS `orders` | Broken Object Level Auth | La política SELECT de `orders` para `customer` usa `customer_id = auth.uid()` correctamente, pero la política UPDATE omite este filtro — cualquier cliente autenticado puede cambiar el estado de cualquier pedido. |
| VULN-02 | **SQL Injection en búsqueda** | Función `search_products` | Injection | La función PostgreSQL de búsqueda construye la query con `format('... WHERE name LIKE ''%%%s%%''', query_param)` en lugar de parámetros preparados — inyectable via `%'; DROP TABLE products; --`. |
| VULN-03 | **Verificación de edad en cliente** | `checkout.tsx` | Business Logic Bypass | Existe un segundo path de checkout que omite llamar a la Edge Function de verificación de edad y confía en un flag `ageVerified` del estado local de Zustand — manipulable via DevTools. |
| VULN-04 | **JWT secret débil en Edge Function** | `verify-age/index.ts` | Cryptographic Failure | La Edge Function firma un token de resultado de verificación con un secret hardcodeado `"secret123"` en lugar de leer de variables de entorno. |
| VULN-05 | **Exposición de precio de costo** | RLS `products` | Sensitive Data Exposure | La política SELECT de `products` para `customer` y `cashier` no excluye la columna `cost_price` — se filtra en `SELECT *` y queda expuesta en la respuesta de la API. |
| VULN-06 | **Race condition en stock** | `confirm-order/index.ts` | Race Condition / TOCTOU | El chequeo de stock (`SELECT stock`) y el decremento (`UPDATE stock`) se hacen en dos queries separadas sin transacción ni `SELECT FOR UPDATE` — dos pedidos simultáneos pueden dejar stock negativo. |
| VULN-07 | **Logs de auditoría manipulables** | RLS `age_verifications` | Audit Log Tampering | La política UPDATE de `age_verifications` permite al propio usuario (`verified_by = auth.uid()`) modificar el resultado de su verificación — puede cambiar `rejected` a `approved`. |
| VULN-08 | **Escalada de privilegios via perfil** | RLS `profiles` | Privilege Escalation | La política UPDATE de `profiles` permite al usuario modificar su propio registro sin restringir la columna `role` — un cliente puede enviarse un UPDATE y cambiar su rol a `admin`. |

### Estrategia de inserción
- Cada vulnerabilidad se introduce en su migración correspondiente (ej. la política RLS rota en `002_rls.sql`).
- Cada bloque SQL con vulnerabilidad lleva el comentario `-- VULN-XX: [descripción breve] — INSEGURO INTENCIONAL`.
- El archivo `004_audit_vulns.sql` documenta dónde está cada una y cómo corregirla.

---

## 6. Edge Functions {#edge-functions}

### 6.1 `verify-age`
- **Entrada:** `{ dni: string, context: "pos" | "web" }`
- **API externa:** `GET https://dniruc.apisperu.com/api/v1/dni/{dni}` con header `Authorization: Bearer $APISPERU_TOKEN`
- **Respuesta de la API:** `{ dni, nombre, apellidoPaterno, apellidoMaterno, codVerifica }` — **no incluye fecha de nacimiento directamente**; la edad se calculará a partir del campo `codVerifica` o se usará la lógica de rango aceptable (≥18).
- **Proceso:**
  1. Obtiene `auth.uid()` del JWT del llamante.
  2. Llama a `apisperu.com` con el DNI usando `APISPERU_TOKEN` (variable de entorno servidor).
  3. Valida que el DNI existe y pertenece a una persona real.
  4. Si la API no retorna fecha de nacimiento, se implementará flujo alternativo: solicitar fecha al usuario y cruzarla con los datos del DNI para verificar identidad, calculando edad localmente.
  5. Guarda en `age_verifications` el hash SHA-256 del DNI, resultado, edad calculada, contexto.
  6. Retorna `{ verified: boolean, verification_id: uuid }`.
- **VULN-04** está aquí (secret hardcodeado en firma del token de resultado).

> [!NOTE]
> **Variable de entorno requerida:** `APISPERU_TOKEN=eyJ0eXAiOiJKV1Qi...` — nunca en el código fuente.

### 6.2 `confirm-sale`
- **Entrada:** `{ items: [{product_id, quantity}][], payment_method, age_verification_id? }`
- **Proceso:**
  1. Valida rol `cashier` del llamante.
  2. Valida stock de cada ítem (usando `SELECT FOR UPDATE`).
  3. Inserta `sales` + `sale_items` + `stock_movements` en una transacción.
  4. Retorna boleta con ID y totales.

### 6.3 `confirm-order`
- **Entrada:** `{ items, delivery_type, delivery_address, payment_method, age_verification_id? }`
- **Proceso:**
  1. Valida rol `customer` del llamante.
  2. Chequeo de stock — **VULN-06** está aquí (sin transacción).
  3. Crea `orders` + `order_items` + `stock_movements`.
  4. Llama a pasarela de pagos y actualiza `payment_status`.
  5. Retorna `{ order_id, payment_url? }`.

---

## 7. Pantallas por rol {#pantallas}

### Admin
- `/admin` — Dashboard: ventas del día, stock bajo, usuarios activos
- `/admin/users` — Tabla de usuarios con toggle de `is_active` y cambio de rol
- `/admin/reports` — Gráficos de ventas por período, top productos
- `/admin/settings` — Config general (nombre farmacia, logo, etc.)

### Stocker (Reponedor)
- `/stocker` — Dashboard: alertas de stock bajo
- `/stocker/products` — Lista con búsqueda/filtros, link a editar
- `/stocker/product-form?id=` — Crear/editar producto: nombre, precio, stock, foto, restricción de edad
- `/stocker/stock` — Ajuste manual de stock con motivo

### Cashier (Cajero)
- `/cashier` — POS: carrito + búsqueda de productos o escaneo de barcode
- `/cashier/scanner` — Pantalla full-screen para cámara/lector
- `/cashier/receipts` — Historial de boletas del turno actual y anteriores

### Customer (Tienda web)
- `/store` — Home: banners, destacados, categorías
- `/store/catalog` — Catálogo con filtros de categoría y precio
- `/store/product/[id]` — Detalle de producto
- `/store/cart` — Carrito de compras
- `/store/checkout` — Formulario de datos + verificación de edad + pago
- `/store/orders` — Lista de pedidos y estado actual

### Sin sesión (anon)
- `/` — Redirige a `/store` (catálogo público)
- `/login` — Pantalla única de login

---

## 8. Orden de ejecución {#orden}

1. **Fase 1:** `npx create-expo-app@latest ./ --template tabs` · instalar deps · configurar `.env`
2. **Fase 2:** Escribir y aplicar migraciones SQL en Supabase (tablas → RLS → seed → vulns)
3. **Fase 3:** `lib/supabase.ts` · `authStore.ts` · pantalla login · `_layout.tsx` con auth gate · guards por rol en cada `_layout`
4. **Fase 4:** Componentes UI base (design system) · luego pantallas Admin
5. **Fase 5:** Pantallas Stocker + upload de imágenes a Storage
6. **Fase 6:** Pantallas Cajero + integración barcode scanner + Edge Function `confirm-sale`
7. **Fase 7:** Tienda web + carrito + checkout + Edge Function `confirm-order`
8. **Fase 8:** Edge Function `verify-age` + modal de verificación de edad reutilizable
9. **Fase 9:** Integración de pasarela de pago
10. **Fase 10:** Insertar vulnerabilidades de auditoría con sus comentarios
11. **Fase 11:** Testing manual por rol + pruebas de las 8 vulnerabilidades
12. **Fase 12:** Variables de producción · EAS Build · deploy Vercel

---

## 9. Checklist de progreso {#checklist}

### Fase 1 — Scaffold
- [ ] Proyecto Expo creado con TypeScript
- [ ] Dependencias instaladas (NativeWind, Zustand, TanStack Query, React Hook Form, Zod, Supabase JS)
- [ ] EAS CLI configurado
- [ ] `.env.example` creado
- [ ] Repositorio Git inicializado

### Fase 2 — Base de datos
- [ ] Migración 001: todas las tablas
- [ ] Migración 002: todas las políticas RLS
- [ ] Migración 003: datos semilla (admin por defecto, categorías)
- [ ] Migración 004: documentación de vulnerabilidades

### Fase 3 — Auth
- [ ] Cliente Supabase configurado
- [ ] `authStore` con login/logout/rol
- [ ] Pantalla de login
- [ ] Auth gate en root layout
- [ ] Guards de rol en cada sub-layout

### Fase 4 — Admin
- [ ] Dashboard con stats
- [ ] Gestión de usuarios (activar/bloquear/cambiar rol)
- [ ] Reportes de ventas
- [ ] Configuración general

### Fase 5 — Stocker
- [ ] Lista de productos
- [ ] Formulario crear/editar producto
- [ ] Upload de imagen a Storage
- [ ] Ajuste de stock

### Fase 6 — Cajero
- [ ] POS / carrito de caja
- [ ] Búsqueda de productos
- [ ] Escaneo de código de barras
- [ ] Edge Function confirm-sale
- [ ] Historial de boletas

### Fase 7 — Tienda web
- [ ] Home con banners
- [ ] Catálogo con filtros
- [ ] Detalle de producto
- [ ] Carrito web (Zustand)
- [ ] Checkout con formulario
- [ ] Edge Function confirm-order
- [ ] Seguimiento de pedido

### Fase 8 — Verificación de edad
- [ ] Edge Function verify-age
- [ ] Modal reutilizable AgeVerificationModal
- [ ] Integración en checkout web
- [ ] Integración en POS cajero

### Fase 9 — Pagos
- [ ] Cuenta y credenciales pasarela de pago
- [ ] Integración en checkout web
- [ ] Webhook de confirmación de pago

### Fase 10 — Vulnerabilidades
- [ ] VULN-01 IDOR pedidos
- [ ] VULN-02 SQL Injection búsqueda
- [ ] VULN-03 Bypass verificación edad
- [ ] VULN-04 Secret débil Edge Function
- [ ] VULN-05 Exposición cost_price
- [ ] VULN-06 Race condition stock
- [ ] VULN-07 Manipulación logs auditoría
- [ ] VULN-08 Escalada de privilegios

### Fase 11 — Testing
- [ ] Pruebas de flujo por cada rol
- [ ] Explotación manual de cada VULN
- [ ] Correcciones documentadas

### Fase 12 — Despliegue
- [ ] Variables de entorno de producción en Vercel y EAS
- [ ] Build Android (EAS)
- [ ] Build iOS (EAS)
- [ ] Deploy web (Vercel)
