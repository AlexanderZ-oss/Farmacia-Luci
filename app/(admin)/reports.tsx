import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

interface SaleRow {
  id: string;
  total_amount: number | string;
  payment_method: string;
  status: string;
  created_at: string;
  cashier_id: string | null;
  customer_name: string | null;
  customer_dni: string | null;
}

interface CashSessionRow {
  id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number | string;
  expected_cash: number | string | null;
  counted_cash: number | string | null;
  difference: number | string | null;
}

interface SaleItemRow {
  sale_id: string;
  product_id: string;
  quantity: number;
}

interface ProductRow { id: string; name: string; }
interface ProfileRow { id: string; full_name: string | null; email: string | null; }

const formatMoney = (amount: number) => `S/ ${amount.toFixed(2)}`;
const csvValue = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const htmlEscape = (value: string | number) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export default function ReportsScreen() {
  const [period, setPeriod] = useState(7);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [sessions, setSessions] = useState<CashSessionRow[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; quantity: number }[]>([]);
  const [cashierNames, setCashierNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => { void loadReport(period); }, [period]);

  async function loadReport(days: number) {
    setLoading(true);
    setErrorMessage('');
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();

    const allSales: SaleRow[] = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase
        .from('sales')
        .select('id, total_amount, payment_method, status, created_at, cashier_id, customer_name, customer_dni')
        .gte('created_at', startIso)
        .order('created_at', { ascending: false })
        .range(from, from + 499);
      if (error) {
        setErrorMessage(error.message);
        setSales([]);
        setSessions([]);
        setTopProducts([]);
        setLoading(false);
        return;
      }
      const page = (data ?? []) as SaleRow[];
      allSales.push(...page);
      if (page.length < 500) break;
    }

    const completedSales = allSales.filter((sale) => sale.status === 'completed');
    const saleIds = completedSales.map((sale) => sale.id);
    let productTotals = new Map<string, number>();
    if (saleIds.length) {
      for (let offset = 0; offset < saleIds.length; offset += 300) {
        const batch = saleIds.slice(offset, offset + 300);
        const { data, error } = await supabase
          .from('sale_items')
          .select('sale_id, product_id, quantity')
          .in('sale_id', batch);
        if (error) {
          setErrorMessage(error.message);
          setSales([]);
          setSessions([]);
          setTopProducts([]);
          setLoading(false);
          return;
        }
        for (const item of (data ?? []) as SaleItemRow[]) {
          productTotals.set(item.product_id, (productTotals.get(item.product_id) ?? 0) + item.quantity);
        }
      }
    }

    const productIds = Array.from(productTotals.keys());
    const productNames = new Map<string, string>();
    for (let offset = 0; offset < productIds.length; offset += 300) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds.slice(offset, offset + 300));
      if (error) {
        setErrorMessage(error.message);
        setSales([]);
        setSessions([]);
        setTopProducts([]);
        setLoading(false);
        return;
      }
      for (const product of (data ?? []) as ProductRow[]) productNames.set(product.id, product.name);
    }

    const { data: cashData, error: cashError } = await supabase
      .from('cash_sessions')
      .select('id, cashier_id, opened_at, closed_at, opening_cash, expected_cash, counted_cash, difference')
      .gte('opened_at', startIso)
      .order('opened_at', { ascending: false })
      .limit(200);
    if (cashError) {
      setErrorMessage(cashError.message);
      setSales([]);
      setSessions([]);
      setTopProducts([]);
      setLoading(false);
      return;
    }

    const cashierIds = Array.from(new Set([
      ...completedSales.flatMap((sale) => sale.cashier_id ? [sale.cashier_id] : []),
      ...((cashData ?? []) as CashSessionRow[]).map((cashSession) => cashSession.cashier_id),
    ]));
    const cashierLookup: Record<string, string> = {};
    for (let offset = 0; offset < cashierIds.length; offset += 300) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', cashierIds.slice(offset, offset + 300));
      if (error) {
        setErrorMessage(error.message);
        setSales([]);
        setSessions([]);
        setTopProducts([]);
        setLoading(false);
        return;
      }
      for (const cashier of (data ?? []) as ProfileRow[]) {
        cashierLookup[cashier.id] = cashier.full_name || cashier.email || cashier.id.slice(0, 8);
      }
    }

    setSales(allSales);
    setSessions((cashData ?? []) as CashSessionRow[]);
    setCashierNames(cashierLookup);
    setTopProducts(
      Array.from(productTotals, ([id, quantity]) => ({ name: productNames.get(id) ?? 'Producto retirado', quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
    );
    setLoading(false);
  }

  const completedSales = useMemo(() => sales.filter((sale) => sale.status === 'completed'), [sales]);
  const revenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const averageSale = completedSales.length ? revenue / completedSales.length : 0;
  const cancelledCount = sales.length - completedSales.length;

  function exportCsv() {
    if (Platform.OS !== 'web') {
      Alert.alert('Exportación CSV', 'La descarga CSV está disponible en la versión web del panel.');
      return;
    }
    const header = ['Boleta', 'Fecha', 'Cajero ID', 'Estado', 'Método de pago', 'Cliente', 'DNI', 'Total'];
    const lines = sales.map((sale) => [
      sale.id,
      new Date(sale.created_at).toLocaleString('es-PE'),
      sale.cashier_id ? cashierNames[sale.cashier_id] ?? sale.cashier_id : '',
      sale.status,
      sale.payment_method,
      sale.customer_name ?? '',
      sale.customer_dni ?? '',
      Number(sale.total_amount).toFixed(2),
    ].map(csvValue).join(','));
    const blob = new Blob(['\uFEFF', [header.map(csvValue).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `farmacia-luci-ventas-${period}-dias.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportPdf() {
    if (Platform.OS !== 'web') {
      Alert.alert('Exportación PDF', 'Abre el panel administrativo web y elige “Imprimir / Guardar PDF”.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Alert.alert('Ventana bloqueada', 'Permite las ventanas emergentes para generar el informe PDF.');
      return;
    }
    const rows = sales.map((sale) => `
      <tr>
        <td>${htmlEscape(sale.id)}</td>
        <td>${htmlEscape(new Date(sale.created_at).toLocaleString('es-PE'))}</td>
        <td>${htmlEscape(sale.cashier_id ? cashierNames[sale.cashier_id] || sale.cashier_id : '')}</td>
        <td>${htmlEscape(sale.status)}</td>
        <td>${htmlEscape(sale.payment_method)}</td>
        <td>${htmlEscape(sale.customer_name || 'Cliente general')}</td>
        <td>${htmlEscape(formatMoney(Number(sale.total_amount)))}</td>
      </tr>`).join('');
    const sessionRows = sessions.map((cashSession) => `
      <tr>
        <td>${htmlEscape(cashierNames[cashSession.cashier_id] || cashSession.cashier_id)}</td>
        <td>${htmlEscape(new Date(cashSession.opened_at).toLocaleString('es-PE'))}</td>
        <td>${htmlEscape(cashSession.closed_at ? new Date(cashSession.closed_at).toLocaleString('es-PE') : 'Caja abierta')}</td>
        <td>${htmlEscape(cashSession.expected_cash == null ? '—' : formatMoney(Number(cashSession.expected_cash)))}</td>
        <td>${htmlEscape(cashSession.counted_cash == null ? '—' : formatMoney(Number(cashSession.counted_cash)))}</td>
        <td>${htmlEscape(cashSession.difference == null ? '—' : formatMoney(Number(cashSession.difference)))}</td>
      </tr>`).join('');
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Farmacia Luci</title>
      <style>
        body{font:12px Arial,sans-serif;color:#111827;margin:32px}h1{font-size:22px;margin:0 0 5px}
        h2{font-size:15px;margin:26px 0 8px}.muted{color:#6b7280}.metrics{display:flex;gap:20px;margin:18px 0}
        .metric{border:1px solid #d1d5db;border-radius:8px;padding:12px;min-width:130px}.value{font-size:17px;font-weight:bold;margin-top:5px}
        table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e5e7eb;padding:7px;font-size:10px}th{background:#f3f4f6}
        @media print{body{margin:12mm}}
      </style></head><body>
      <h1>Farmacia Luci · Informe de gestión</h1>
      <div class="muted">Periodo: últimos ${period} día(s) · Generado: ${htmlEscape(new Date().toLocaleString('es-PE'))}</div>
      <div class="metrics"><div class="metric">Ventas completadas<div class="value">${completedSales.length}</div></div>
      <div class="metric">Ingreso registrado<div class="value">${htmlEscape(formatMoney(revenue))}</div></div>
      <div class="metric">Promedio por venta<div class="value">${htmlEscape(formatMoney(averageSale))}</div></div>
      <div class="metric">Anulaciones<div class="value">${cancelledCount}</div></div></div>
      <h2>Ventas</h2><table><thead><tr><th>Boleta</th><th>Fecha</th><th>Cajero</th><th>Estado</th><th>Pago</th><th>Cliente</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="7">Sin ventas</td></tr>'}</tbody></table>
      <h2>Turnos de caja</h2><table><thead><tr><th>Cajero</th><th>Apertura</th><th>Cierre</th><th>Esperado</th><th>Contado</th><th>Diferencia</th></tr></thead><tbody>${sessionRows || '<tr><td colspan="6">Sin turnos</td></tr>'}</tbody></table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.heading}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>REPORTES</Text>
          <Text style={s.title}>Informes y actividad</Text>
          <Text style={s.subtitle}>Cifras calculadas a partir de ventas y turnos registrados.</Text>
        </View>
        <View style={s.exportActions}>
          <TouchableOpacity style={s.exportButton} onPress={exportCsv} accessibilityRole="button">
            <Ionicons name="download-outline" size={15} color={C.textMid} />
            <Text style={s.exportText}>CSV / Excel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.pdfButton} onPress={exportPdf} accessibilityRole="button">
            <Ionicons name="print-outline" size={15} color={C.white} />
            <Text style={s.pdfText}>Imprimir / PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.periods}>
        {[1, 7, 30].map((days) => (
          <TouchableOpacity key={days} style={[s.periodButton, period === days && s.periodSelected]} onPress={() => setPeriod(days)}>
            <Text style={[s.periodText, period === days && s.periodTextSelected]}>{days === 1 ? 'Hoy' : `${days} días`}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.refreshButton} onPress={() => loadReport(period)} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={14} color={C.textMid} />
          <Text style={s.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color={C.green} style={{ marginTop: 30 }} /> : errorMessage ? (
        <View style={s.errorCard}>
          <Text style={s.errorTitle}>No se pudo cargar el informe</Text>
          <Text style={s.errorText}>{errorMessage}</Text>
        </View>
      ) : (
        <>
          <View style={s.metrics}>
            <View style={s.metricCard}><Text style={s.metricLabel}>Ventas completadas</Text><Text style={s.metricValue}>{completedSales.length}</Text></View>
            <View style={s.metricCard}><Text style={s.metricLabel}>Ingreso registrado</Text><Text style={s.metricValue}>{formatMoney(revenue)}</Text></View>
            <View style={s.metricCard}><Text style={s.metricLabel}>Promedio por venta</Text><Text style={s.metricValue}>{formatMoney(averageSale)}</Text></View>
            <View style={s.metricCard}><Text style={s.metricLabel}>Anulaciones</Text><Text style={s.metricValue}>{cancelledCount}</Text></View>
          </View>

          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Ventas recientes</Text>
            {sales.length === 0 ? <Text style={s.empty}>No hay ventas para el periodo elegido.</Text> : (
              sales.slice(0, 100).map((sale) => (
                <View key={sale.id} style={s.saleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.saleId}>Boleta {sale.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={s.saleMeta}>
                      {new Date(sale.created_at).toLocaleString('es-PE')} · {sale.payment_method}
                      {sale.cashier_id ? ` · ${cashierNames[sale.cashier_id] || sale.cashier_id.slice(0, 8)}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.saleAmount}>{formatMoney(Number(sale.total_amount))}</Text>
                    <Text style={[s.saleStatus, sale.status === 'completed' ? s.completed : s.cancelled]}>{sale.status === 'completed' ? 'Vigente' : 'Anulada'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Productos más vendidos</Text>
            {topProducts.length ? topProducts.map((product, index) => (
              <View key={`${product.name}-${index}`} style={s.productRow}>
                <Text style={s.productRank}>{index + 1}</Text>
                <Text style={s.productName}>{product.name}</Text>
                <Text style={s.productQuantity}>{product.quantity} unidades</Text>
              </View>
            )) : <Text style={s.empty}>No hay productos vendidos en el periodo.</Text>}
          </View>

          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Turnos de caja</Text>
            {sessions.length ? sessions.map((cashSession) => (
              <View key={cashSession.id} style={s.saleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.saleId}>Cajero {cashierNames[cashSession.cashier_id] || cashSession.cashier_id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={s.saleMeta}>
                    Apertura {new Date(cashSession.opened_at).toLocaleString('es-PE')}
                    {cashSession.closed_at ? ` · Cierre ${new Date(cashSession.closed_at).toLocaleString('es-PE')}` : ' · Caja abierta'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.saleAmount}>Esperado {cashSession.expected_cash == null ? '—' : formatMoney(Number(cashSession.expected_cash))}</Text>
                  <Text style={s.saleMeta}>Contado {cashSession.counted_cash == null ? '—' : formatMoney(Number(cashSession.counted_cash))} · Dif. {cashSession.difference == null ? '—' : formatMoney(Number(cashSession.difference))}</Text>
                </View>
              </View>
            )) : <Text style={s.empty}>No hay turnos en el periodo.</Text>}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage },
  content: { padding: 22, paddingBottom: 44, gap: 16, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { color: C.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: C.textMid, fontSize: 13, marginTop: 6 },
  exportActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  exportButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 13, paddingVertical: 10, borderRadius: 8,
  },
  exportText: { color: C.textMid, fontSize: 12, fontWeight: '700' },
  pdfButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },
  pdfText: { color: C.white, fontSize: 12, fontWeight: '700' },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  periodButton: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 9 },
  periodSelected: { backgroundColor: C.greenLight, borderColor: C.green },
  periodText: { color: C.textMid, fontSize: 12, fontWeight: '600' },
  periodTextSelected: { color: C.greenDark, fontWeight: '700' },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 15, paddingVertical: 9, borderRadius: 8,
    backgroundColor: C.bgSubtle, borderWidth: 1, borderColor: C.border,
  },
  refreshText: { color: C.textMid, fontSize: 12, fontWeight: '600' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flexGrow: 1, flexBasis: 180, backgroundColor: C.white, padding: 17, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  metricLabel: { color: C.textMid, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  metricValue: { color: C.text, fontSize: 21, fontWeight: '700', marginTop: 8, letterSpacing: -0.4 },
  sectionCard: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 18 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  saleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border },
  saleId: { color: C.text, fontSize: 12, fontWeight: '700' },
  saleMeta: { color: C.textMid, fontSize: 11, marginTop: 4 },
  saleAmount: { color: C.text, fontSize: 13, fontWeight: '700' },
  saleStatus: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  completed: { color: C.greenDark },
  cancelled: { color: C.red },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.border },
  productRank: { color: C.green, fontWeight: '700', width: 18, fontSize: 12 },
  productName: { flex: 1, color: C.textMid, fontSize: 12, fontWeight: '600' },
  productQuantity: { color: C.textLight, fontSize: 11 },
  empty: { color: C.textMid, textAlign: 'center', paddingVertical: 16, fontSize: 12 },
  errorCard: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 18 },
  errorTitle: { color: '#B91C1C', fontWeight: '700' },
  errorText: { color: '#B91C1C', fontSize: 12, marginTop: 6 },
});
