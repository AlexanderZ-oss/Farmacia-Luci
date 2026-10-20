/**
 * Monitor de salud interno.
 *
 * Ejecuta comprobaciones automáticas contra la API para detectar condiciones
 * anómalas (accesos indebidos, esquema incompleto, datos expuestos, etc.).
 * No tiene interfaz: sus resultados se publican en la consola, en
 * `window.__qc` y en `sessionStorage` para su revisión mediante inspección.
 */
import { supabase } from './supabase';

// Expo statically inlines EXPO_PUBLIC_* values only when accessed directly.
// @ts-ignore Expo's public environment keys are supplied by the deployment environment.
const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
// @ts-ignore Expo's public environment keys are supplied by the deployment environment.
const API_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

const STORAGE_KEY = '__qc_report';

type Level = 'ok' | 'warn' | 'bad' | 'skip';

interface Finding {
  code: string;
  label: string;
  level: Level;
  detail: string;
  http: number | null;
  rows: number | null;
}

interface Report {
  startedAt: string;
  finishedAt: string;
  findings: Finding[];
  summary: { checked: number; issues: number };
}

interface Reply {
  status: number;
  body: unknown;
  text: string;
}

async function call(
  path: string,
  opts: { method?: string; body?: unknown; token?: string; absolute?: boolean; headers?: Record<string, string> } = {}
): Promise<Reply> {
  const { method = 'GET', body, token, absolute, headers } = opts;
  const auth = token !== undefined ? token : await currentToken();
  const url = absolute ? path : `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        apikey: API_KEY,
        Authorization: `Bearer ${auth}`,
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let text = '';
    try { text = await res.text(); } catch { text = ''; }
    let parsed: unknown = null;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    return { status: res.status, body: parsed, text };
  } catch (e: any) {
    return { status: -1, body: null, text: e?.message ?? 'network error' };
  }
}

async function currentToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}

function rowsOf(r: Reply): number | null {
  return Array.isArray(r.body) ? r.body.length : null;
}

function serverMsg(r: Reply): string {
  if (r.status === -1) return r.text;
  if (r.body && typeof r.body === 'object' && !Array.isArray(r.body) && 'message' in r.body) {
    return String((r.body as any).message);
  }
  return r.status >= 400 ? r.text.slice(0, 160) : 'OK';
}

function blocked(r: Reply): boolean {
  return r.status === 401 || r.status === 403;
}

/** Ejecuta todas las comprobaciones internas. */
export async function collectMetrics(): Promise<Report> {
  const startedAt = new Date().toISOString();
  const findings: Finding[] = [];
  const token = await currentToken();
  const logged = !!token;

  const add = (f: Finding) => findings.push(f);

  /* 1 — control de acceso entre cuentas */
  {
    const profiles = await call('/rest/v1/profiles?select=id&limit=100');
    const n = rowsOf(profiles) ?? 0;
    add({
      code: 'A1',
      label: 'Listado de cuentas restringido',
      level: profiles.status === 200 && n > 1 ? 'bad' : logged ? 'ok' : 'skip',
      detail: profiles.status === 200 ? `${n} cuentas visibles` : serverMsg(profiles),
      http: profiles.status, rows: rowsOf(profiles),
    });
  }
  {
    const anon = await call('/rest/v1/sales?select=id&limit=5', { token: '' });
    const n = rowsOf(anon) ?? 0;
    add({
      code: 'A2',
      label: 'Ventas no accesibles sin sesión',
      level: anon.status === 200 && n > 0 ? 'bad' : 'ok',
      detail: anon.status === 200 ? `${n} filas expuestas a anon` : serverMsg(anon),
      http: anon.status, rows: rowsOf(anon),
    });
  }
  {
    const me = (await supabase.auth.getSession()).data.session?.user.id ?? '';
    const before = me ? await call(`/rest/v1/profiles?id=eq.${me}&select=role`) : { status: -1, body: null, text: 'sin sesión' } as Reply;
    const original = Array.isArray(before.body) && before.body[0] ? String((before.body[0] as any).role) : '';
    const patched = me
      ? await call(`/rest/v1/profiles?id=eq.${me}`, { method: 'PATCH', body: { role: 'admin' } })
      : { status: -1, body: null, text: 'sin sesión' } as Reply;
    const got = Array.isArray(patched.body) && patched.body[0] ? String((patched.body[0] as any).role) : '';
    const ascended = patched.status < 300 && got === 'admin' && original !== 'admin';
    if (ascended && original) {
      await call(`/rest/v1/profiles?id=eq.${me}`, { method: 'PATCH', body: { role: original } });
    }
    add({
      code: 'A3',
      label: 'Elevación de rol bloqueada',
      level: ascended ? 'bad' : logged ? 'ok' : 'skip',
      detail: ascended ? 'Se pudo elevar el propio rol a admin' : serverMsg(patched),
      http: patched.status, rows: null,
    });
  }

  /* 2 — borrado de registros críticos */
  {
    // Un DELETE con RLS que lo permite pero sin filas coincidentes devuelve 2xx
    // con lista vacía; con `return=representation` distinguimos "borró" de "no hay nada".
    const d1 = await call('/rest/v1/sales?id=eq.00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const removed1 = Array.isArray(d1.body) ? d1.body.length : 0;
    add({
      code: 'B1',
      label: 'Borrado de ventas bloqueado',
      level: blocked(d1) || removed1 === 0 ? 'ok' : 'bad',
      detail: blocked(d1) ? 'Bloqueado por RLS' : removed1 === 0 ? 'Sin filas eliminadas' : `${removed1} ventas eliminadas`,
      http: d1.status, rows: removed1,
    });
    const d2 = await call('/rest/v1/products?id=eq.00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
      headers: { Prefer: 'return=representation' },
    });
    const removed2 = Array.isArray(d2.body) ? d2.body.length : 0;
    add({
      code: 'B2',
      label: 'Borrado de productos bloqueado',
      level: blocked(d2) || removed2 === 0 ? 'ok' : 'bad',
      detail: blocked(d2) ? 'Bloqueado por RLS' : removed2 === 0 ? 'Sin filas eliminadas' : `${removed2} productos eliminados`,
      http: d2.status, rows: removed2,
    });
  }
  {
    add({
      code: 'B3',
      label: 'Copias de seguridad del proyecto',
      level: 'skip',
      detail: 'No verificable desde la app. Revisar Supabase → Database → Backups.',
      http: null, rows: null,
    });
  }

  /* 3 — consistencia del esquema tras las migraciones */
  {
    const probes: Array<[string, string]> = [
      ['C1', '/rest/v1/sales?select=id,prescription_number&limit=1'],
      ['C2', '/rest/v1/products?select=id,requires_prescription&limit=1'],
      ['C3', '/rest/v1/support_tickets?select=id,resolved_at&limit=1'],
    ];
    for (const [code, url] of probes) {
      const r = await call(url);
      const missing = r.status === 400 && /column|does not exist|schema cache/i.test(r.text);
      add({
        code,
        label: `Esquema tras migraciones (${url.split('select=')[1]})`,
        level: missing ? 'bad' : logged ? 'ok' : 'skip',
        detail: missing ? 'Columna ausente' : serverMsg(r),
        http: r.status, rows: rowsOf(r),
      });
    }
  }

  /* 4 — integridad de precios y cantidades */
  {
    for (const [code, label, payload] of [
      ['D1', 'Venta con precio falsificado rechazada', { items: [{ product_id: '00000000-0000-0000-0000-000000000000', quantity: 1, price: 0.01 }], payment_method: 'cash' }],
      ['D2', 'Venta con cantidad inválida rechazada', { items: [{ product_id: '00000000-0000-0000-0000-000000000000', quantity: -5 }], payment_method: 'cash' }],
    ] as Array<[string, string, unknown]>) {
      const r = await call('/functions/v1/confirm-sale', { method: 'POST', body: payload });
      const sold = r.status < 300 && !!r.body && typeof r.body === 'object' && 'sale_id' in (r.body as any);
      add({
        code, label,
        level: sold ? 'bad' : blocked(r) || r.status === -1 ? 'skip' : 'ok',
        detail: sold ? 'Venta manipulada aceptada' : serverMsg(r),
        http: r.status, rows: null,
      });
    }
    const direct = await call('/rest/v1/sales', { method: 'POST', body: { total_amount: 0.01, payment_method: 'cash' } });
    add({
      code: 'D3',
      label: 'Inserción directa de ventas bloqueada',
      level: direct.status >= 200 && direct.status < 300 ? 'bad' : logged ? 'ok' : 'skip',
      detail: serverMsg(direct), http: direct.status, rows: rowsOf(direct),
    });
  }

  /* 5 — funciones expuestas y parches */
  {
    const sqli = await call('/rest/v1/rpc/search_products_vulnerable', { method: 'POST', body: { query_param: "' OR 1=1 --" } });
    const n = rowsOf(sqli) ?? 0;
    add({
      code: 'E1',
      label: 'Búsqueda parametrizada (sin inyección)',
      level: sqli.status < 300 && n > 0 ? 'bad' : sqli.status === 404 ? 'ok' : logged ? 'ok' : 'skip',
      detail: sqli.status === 404 ? 'Función ausente' : sqli.status < 300 && n > 0 ? `${n} filas vía inyección` : serverMsg(sqli),
      http: sqli.status, rows: rowsOf(sqli),
    });
    const dec = await call('/rest/v1/rpc/decrement_stock', { method: 'POST', body: { product_id: '00000000-0000-0000-0000-000000000000', qty: 1 } });
    const exposed = dec.status !== -1 && dec.status !== 404 && !blocked(dec);
    add({
      code: 'E2',
      label: 'Funciones internas no expuestas',
      level: exposed ? 'bad' : 'ok',
      detail: dec.status === 404 ? 'Función ausente' : serverMsg(dec),
      http: dec.status, rows: null,
    });
  }

  /* 6 — exposición de datos personales y comerciales */
  {
    const sales = await call('/rest/v1/sales?select=id,customer_dni,cashier_id&limit=200');
    const me = (await supabase.auth.getSession()).data.session?.user.id ?? '';
    const arr = Array.isArray(sales.body) ? (sales.body as any[]) : [];
    const foreign = arr.filter((s) => s.cashier_id && s.cashier_id !== me).length;
    add({
      code: 'F1',
      label: 'DNI de ventas ajenas no expuesto',
      level: sales.status === 200 && foreign > 0 ? 'bad' : logged ? 'ok' : 'skip',
      detail: sales.status === 200 ? `${foreign} ventas de terceros visibles` : serverMsg(sales),
      http: sales.status, rows: rowsOf(sales),
    });
    const cost = await call('/rest/v1/products?select=name,cost_price&is_active=eq.true&limit=50', { token: '' });
    const withCost = Array.isArray(cost.body) ? (cost.body as any[]).filter((p) => p.cost_price != null).length : 0;
    add({
      code: 'F2',
      label: 'Coste de producto no público',
      level: cost.status === 200 && withCost > 0 ? 'bad' : 'ok',
      detail: cost.status === 200 ? `${withCost} productos exponen coste` : serverMsg(cost),
      http: cost.status, rows: rowsOf(cost),
    });
  }

  /* 7 — conciliación ventas / inventario */
  {
    const sales = await call('/rest/v1/sales?select=id,status&limit=200');
    const moves = await call('/rest/v1/stock_movements?select=id,movement_type&limit=200');
    const sArr = Array.isArray(sales.body) ? (sales.body as any[]) : [];
    const mArr = Array.isArray(moves.body) ? (moves.body as any[]) : [];
    const completed = sArr.filter((s) => s.status === 'completed').length;
    const saleMoves = mArr.filter((m) => m.movement_type === 'sale').length;
    const gap = completed > 0 && saleMoves === 0;
    add({
      code: 'G1',
      label: 'Ventas concilian con inventario',
      level: gap ? 'bad' : logged ? 'ok' : 'skip',
      detail: `${completed} ventas completadas · ${saleMoves} movimientos de stock`,
      http: sales.status, rows: rowsOf(sales),
    });
  }

  /* 8 — claves de servicios externos (DNI) */
  {
    const anon = await call('/functions/v1/verify-age', { method: 'POST', token: '', body: { dni: '12345678', context: 'pos', action: 'lookup' } });
    add({
      code: 'H1',
      label: 'Servicio de DNI exige autenticación',
      level: anon.status === -1 ? 'skip' : anon.status < 300 ? 'bad' : 'ok',
      detail: anon.status === -1 ? 'No verificable desde el navegador (CORS/red)' : serverMsg(anon),
      http: anon.status, rows: null,
    });
    let leaked = 0;
    try {
      leaked = performance
        .getEntriesByType('resource')
        .map((r) => (r as PerformanceResourceTiming).name)
        .filter((n) => /apisperu|eyJ0eXAi/i.test(n)).length;
    } catch { /* noop */ }
    add({
      code: 'H2',
      label: 'Token de DNI fuera del cliente',
      level: leaked > 0 ? 'bad' : 'ok',
      detail: leaked > 0 ? `${leaked} recursos con posible token` : 'No se detectó token en recursos',
      http: null, rows: null,
    });
  }

  const finishedAt = new Date().toISOString();
  const issues = findings.filter((f) => f.level === 'bad').length;
  return { startedAt, finishedAt, findings, summary: { checked: findings.length, issues } };
}

/** Persiste el informe para conservarlo entre recargas. */
function persist(report: Report) {
  try {
    if (typeof window !== 'undefined') {
      (window as any).__qc = report;
      (window as any).__qc_last = report;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(report));
    }
  } catch { /* almacenamiento no disponible */ }
}

/** Recupera el último informe persistido (o null). */
export function lastReport(): Report | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Report;
    }
  } catch { /* noop */ }
  return (typeof window !== 'undefined' && (window as any).__qc) || null;
}

/** Publica el informe en la consola, en `window.__qc` y en sessionStorage. */
export async function syncMetrics(): Promise<Report | null> {
  try {
    const report = await collectMetrics();
    const bad = report.findings.filter((f) => f.level === 'bad');
    const skipped = report.findings.filter((f) => f.level === 'skip');
    console.log(
      `[qc] ${report.summary.checked} comprobaciones · ${report.summary.issues} incidencias · ${skipped.length} omitidas`
    );
    if (bad.length) {
      console.warn('[qc] incidencias detectadas:');
      bad.forEach((f) => console.warn(`[qc]  ${f.code} ${f.label} — ${f.detail} (HTTP ${f.http ?? '—'})`));
    }
    persist(report);
    return report;
  } catch (e) {
    console.warn('[qc] no se pudo completar la verificación:', (e as Error)?.message);
    return null;
  }
}
