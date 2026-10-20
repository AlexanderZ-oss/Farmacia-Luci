import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

interface Sale {
  id: string;
  total_amount: number | string;
  payment_method: string;
  status: string;
  created_at: string;
  cashier_id: string | null;
  customer_dni: string | null;
  customer_name: string | null;
  prescription_number: string | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
}

interface ReceiptItem {
  product_id: string;
  quantity: number;
  unit_price: number | string;
  products: { name: string }[] | { name: string } | null;
}

const money = (value: number | string) => `S/ ${Number(value).toFixed(2)}`;
const htmlEscape = (value: string | number) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export default function ReceiptsScreen() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { saleId } = useLocalSearchParams<{ saleId?: string }>();
  const router = useRouter();
  const openedSaleId = useRef<string | null>(null);

  useEffect(() => {
    void fetchSales();
  }, []);

  useEffect(() => {
    if (!saleId || sales.length === 0 || openedSaleId.current === saleId) return;
    const sale = sales.find((entry) => entry.id === saleId);
    if (sale) {
      openedSaleId.current = saleId;
      void openReceipt(sale);
    }
  }, [saleId, sales]);

  async function fetchSales() {
    setLoading(true);
    const BASE = 'id, total_amount, payment_method, status, created_at, cashier_id, customer_dni, customer_name, cancellation_reason, cancelled_at';
    let res: any = await supabase
      .from('sales')
      .select(`${BASE}, prescription_number`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (res.error && /prescription_number/i.test(res.error.message)) {
      res = await supabase
        .from('sales')
        .select(BASE)
        .order('created_at', { ascending: false })
        .limit(100);
    }
    const { data, error } = res;
    if (error) {
      Alert.alert('No se pudieron cargar las boletas', error.message);
      setSales([]);
    } else {
      setSales((data ?? []) as Sale[]);
    }
    setLoading(false);
  }

  async function openReceipt(sale: Sale) {
    setSelectedSale(sale);
    setItems([]);
    setDetailLoading(true);
    const { data, error } = await supabase
      .from('sale_items')
      .select('product_id, quantity, unit_price, products(name)')
      .eq('sale_id', sale.id);
    if (error) {
      Alert.alert('No se pudo cargar el detalle', error.message);
    } else {
      setItems((data ?? []) as ReceiptItem[]);
    }
    setDetailLoading(false);
  }

  async function cancelAndPrepareCorrection() {
    if (!selectedSale) return;
    if (cancelReason.trim().length < 5) {
      Alert.alert('Motivo obligatorio', 'Escribe al menos 5 caracteres para dejar constancia de la anulación.');
      return;
    }
    setCancelling(true);
    const { error } = await supabase.rpc('cancel_sale', {
      p_sale_id: selectedSale.id,
      p_reason: cancelReason.trim(),
    });
    setCancelling(false);
    if (error) {
      Alert.alert('No se pudo anular la boleta', error.message);
      return;
    }

    setCancelModalVisible(false);
    setSelectedSale(null);
    setCancelReason('');
    await fetchSales();
    router.push({ pathname: '/(cashier)', params: { sourceSaleId: selectedSale.id } } as never);
  }

  function printReceipt() {
    if (!selectedSale) return;
    if (Platform.OS !== 'web') {
      Alert.alert('Boleta lista', 'La boleta se puede consultar en el historial desde la aplicación web.');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Alert.alert('Ventana bloqueada', 'Permite las ventanas emergentes para imprimir o guardar el comprobante en PDF.');
      return;
    }
    const productRows = items.map((item) => {
      const productName = Array.isArray(item.products) ? item.products[0]?.name : item.products?.name;
      return `<tr><td>${htmlEscape(productName || 'Producto')}</td><td>${item.quantity}</td><td>${htmlEscape(money(item.unit_price))}</td><td>${htmlEscape(money(Number(item.unit_price) * item.quantity))}</td></tr>`;
    }).join('');
    printWindow.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Boleta ${htmlEscape(selectedSale.id.slice(0, 8))}</title>
      <style>body{font:13px Arial,sans-serif;color:#111827;max-width:680px;margin:36px auto;padding:0 20px}
      h1{text-align:center;font-size:20px;letter-spacing:1px;margin-bottom:3px}.sub{text-align:center;color:#6b7280;font-size:11px;margin:0 0 20px}
      .meta{font-size:11px;line-height:1.8;border-bottom:1px dashed #9ca3af;padding-bottom:12px;margin-bottom:12px}
      table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 4px;border-bottom:1px solid #e5e7eb;font-size:11px}
      th:last-child,td:last-child{text-align:right}.total{display:flex;justify-content:space-between;font-weight:bold;font-size:16px;padding:15px 4px}
      .notice{text-align:center;color:#6b7280;font-size:10px;margin-top:28px}@media print{body{margin:10mm auto}}</style></head><body>
      <h1>FARMACIA LUCI</h1><p class="sub">Comprobante interno de venta</p>
      <div class="meta">Boleta: ${htmlEscape(selectedSale.id.toUpperCase())}<br>
      Fecha: ${htmlEscape(new Date(selectedSale.created_at).toLocaleString('es-PE'))}<br>
      Cliente: ${htmlEscape(selectedSale.customer_name || 'Cliente general')}<br>
      ${selectedSale.customer_dni ? `DNI: ${htmlEscape(selectedSale.customer_dni)}<br>` : ''}
      ${selectedSale.prescription_number ? `Receta médica: ${htmlEscape(selectedSale.prescription_number)}<br>` : ''}
      Método de pago: ${htmlEscape(selectedSale.payment_method)}</div>
      <table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${productRows}</tbody></table>
      <div class="total"><span>TOTAL</span><span>${htmlEscape(money(selectedSale.total_amount))}</span></div>
      <p class="notice">Este documento es un comprobante interno y no acredita por sí solo la emisión de un comprobante electrónico ante SUNAT.</p>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <View style={s.container}>
      <View style={s.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>HISTORIAL</Text>
          <Text style={s.title}>Boletas y ventas</Text>
          <Text style={s.subtitle}>Consulta, imprime o corrige una venta dejando registro de la anulación.</Text>
        </View>
        <TouchableOpacity style={s.refreshButton} onPress={fetchSales} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={15} color={C.textMid} />
          <Text style={s.refreshText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sales}
          keyExtractor={(sale) => sale.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item: sale }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() => openReceipt(sale)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`Boleta ${sale.id.slice(0, 8).toUpperCase()}`}
            >
              <View style={s.cardInfo}>
                <Text style={s.cardId}>Boleta {sale.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={s.cardDate}>{new Date(sale.created_at).toLocaleString('es-PE')}</Text>
                <Text style={s.cardBuyer}>{sale.customer_name || 'Cliente general'}{sale.customer_dni ? ` · DNI ${sale.customer_dni}` : ''}</Text>
              </View>
              <View style={s.cardRight}>
                <Text style={s.cardTotal}>{money(sale.total_amount)}</Text>
                <View style={[s.statusBadge, sale.status === 'completed' ? s.statusBadgeOk : s.statusBadgeOff]}>
                  <Text style={[s.status, sale.status === 'completed' ? s.statusComplete : s.statusCancelled]}>
                    {sale.status === 'completed' ? 'VIGENTE' : 'ANULADA'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="receipt-outline" size={34} color={C.textLight} />
              <Text style={s.empty}>Aún no hay boletas registradas en esta caja.</Text>
            </View>
          }
        />
      )}

      <Modal visible={selectedSale !== null} transparent animationType="fade" onRequestClose={() => setSelectedSale(null)}>
        <View style={s.backdrop}>
          <View style={s.receipt}>
            <Text style={s.receiptTitle}>FARMACIA LUCI</Text>
            <Text style={s.receiptSubtitle}>Comprobante interno de venta</Text>
            {selectedSale && (
              <>
                <Text style={s.receiptMeta}>Boleta: {selectedSale.id.toUpperCase()}</Text>
                <Text style={s.receiptMeta}>{new Date(selectedSale.created_at).toLocaleString('es-PE')}</Text>
                <Text style={s.receiptMeta}>Cliente: {selectedSale.customer_name || 'Cliente general'}</Text>
                {selectedSale.customer_dni && <Text style={s.receiptMeta}>DNI: {selectedSale.customer_dni}</Text>}
                {selectedSale.prescription_number && <Text style={s.receiptMeta}>Receta: {selectedSale.prescription_number}</Text>}
                <View style={s.divider} />
              </>
            )}

            {detailLoading ? (
              <ActivityIndicator color={C.green} />
            ) : (
              items.map((item, index) => (
                <View key={`${item.product_id}-${index}`} style={s.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>
                      {(Array.isArray(item.products) ? item.products[0]?.name : item.products?.name) || 'Producto'}
                    </Text>
                    <Text style={s.itemMeta}>{item.quantity} × {money(item.unit_price)}</Text>
                  </View>
                  <Text style={s.itemTotal}>{money(Number(item.unit_price) * item.quantity)}</Text>
                </View>
              ))
            )}

            {selectedSale && (
              <>
                <View style={s.divider} />
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>TOTAL</Text>
                  <Text style={s.totalValue}>{money(selectedSale.total_amount)}</Text>
                </View>
                <Text style={s.receiptMeta}>Pago: {selectedSale.payment_method}</Text>
                {selectedSale.status !== 'completed' && (
                  <Text style={s.cancelledText}>
                    ANULADA · {selectedSale.cancellation_reason || 'Motivo no registrado'}
                  </Text>
                )}
              </>
            )}

            <View style={s.actions}>
              <TouchableOpacity style={s.secondaryButton} onPress={() => setSelectedSale(null)}>
                <Text style={s.secondaryButtonText}>Cerrar</Text>
              </TouchableOpacity>
              {selectedSale?.status === 'completed' && (
                <TouchableOpacity style={s.dangerButton} onPress={() => setCancelModalVisible(true)}>
                  <Text style={s.actionText}>Anular y corregir</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.primaryButton} onPress={printReceipt}>
                <Ionicons name="print-outline" size={14} color={C.white} />
                <Text style={s.actionText}>Imprimir / PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => !cancelling && setCancelModalVisible(false)}>
        <View style={s.backdrop}>
          <View style={s.cancelCard}>
            <Text style={s.cancelTitle}>Anular boleta</Text>
            <Text style={s.cancelDescription}>
              La venta original quedará marcada como anulada y el stock se restaurará. Luego podrás revisar y modificar los productos antes de emitir otra boleta.
            </Text>
            <TextInput
              style={s.reasonInput}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Motivo de anulación"
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={s.actions}>
              <TouchableOpacity style={s.secondaryButton} disabled={cancelling} onPress={() => setCancelModalVisible(false)}>
                <Text style={s.secondaryButtonText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.dangerButton} disabled={cancelling} onPress={cancelAndPrepareCorrection}>
                <Text style={s.actionText}>{cancelling ? 'Anulando…' : 'Anular y cargar al POS'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage, padding: 22, maxWidth: 980, width: '100%', alignSelf: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  subtitle: { color: C.textMid, fontSize: 12, marginTop: 5, maxWidth: 560 },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 10,
    backgroundColor: C.white, borderRadius: 8, borderWidth: 1, borderColor: C.border,
  },
  refreshText: { color: C.textMid, fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: C.white, padding: 15, borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  cardInfo: { flex: 1, minWidth: 0 },
  cardId: { fontWeight: '700', color: C.text, fontSize: 14 },
  cardDate: { color: C.textMid, fontSize: 12, marginTop: 3 },
  cardBuyer: { color: C.textLight, fontSize: 11, marginTop: 4 },
  cardRight: { alignItems: 'flex-end' },
  cardTotal: { fontWeight: '700', color: C.text, fontSize: 15 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  statusBadgeOk: { backgroundColor: C.greenLight },
  statusBadgeOff: { backgroundColor: '#FEE2E2' },
  status: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  statusComplete: { color: C.greenDark },
  statusCancelled: { color: '#991B1B' },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 44 },
  empty: { textAlign: 'center', color: C.textMid, fontSize: 13 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(14,43,41,0.55)' },
  receipt: { width: '100%', maxWidth: 480, backgroundColor: C.white, borderRadius: 12, padding: 22, maxHeight: '90%', borderWidth: 1, borderColor: C.border },
  receiptTitle: { textAlign: 'center', fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: 1 },
  receiptSubtitle: { textAlign: 'center', color: C.textMid, fontSize: 11, marginBottom: 16 },
  receiptMeta: { color: C.textMid, fontSize: 11, marginTop: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  itemName: { color: C.text, fontSize: 12, fontWeight: '600' },
  itemMeta: { color: C.textMid, fontSize: 11, marginTop: 2 },
  itemTotal: { color: C.text, fontSize: 12, fontWeight: '700' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: C.text, fontSize: 15, fontWeight: '700' },
  cancelledText: { color: '#991B1B', fontSize: 11, fontWeight: '700', marginTop: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
  primaryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11,
  },
  dangerButton: { backgroundColor: C.red, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 },
  secondaryButton: { backgroundColor: C.white, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: C.borderStrong },
  actionText: { color: C.white, fontWeight: '700', fontSize: 12 },
  secondaryButtonText: { color: C.textMid, fontWeight: '700', fontSize: 12 },
  cancelCard: { width: '100%', maxWidth: 440, backgroundColor: C.white, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: C.border },
  cancelTitle: { color: C.text, fontSize: 18, fontWeight: '700' },
  cancelDescription: { color: C.textMid, fontSize: 12, lineHeight: 18, marginTop: 8 },
  reasonInput: {
    minHeight: 96, borderWidth: 1, borderColor: C.borderStrong, borderRadius: 8,
    padding: 12, marginTop: 14, color: C.text, fontSize: 13,
  },
});
