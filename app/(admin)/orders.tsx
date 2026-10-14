import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'ready_pickup' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

interface Order {
  id: string;
  customer_id: string | null;
  status: OrderStatus;
  total_amount: number | string;
  payment_method: string | null;
  payment_status: PaymentStatus;
  delivery_type: string;
  delivery_address: Record<string, unknown> | null;
  created_at: string;
}

interface Customer { id: string; full_name: string | null; email: string | null; }

const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'shipped', label: 'En camino' },
  { value: 'ready_pickup', label: 'Listo para recojo' },
  { value: 'delivered', label: 'Entregado' },
  { value: 'cancelled', label: 'Cancelado' },
];
const PAYMENT_STATUSES: { value: PaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'paid', label: 'Pagado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'refunded', label: 'Reembolsado' },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { void loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, customer_id, status, total_amount, payment_method, payment_status, delivery_type, delivery_address, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      Alert.alert('No se pudieron cargar los pedidos', error.message);
      setOrders([]);
      setLoading(false);
      return;
    }
    const loaded = (data ?? []) as Order[];
    setOrders(loaded);
    const customerIds = Array.from(new Set(loaded.flatMap((order) => order.customer_id ? [order.customer_id] : [])));
    if (customerIds.length) {
      const { data: customerRows, error: customerError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', customerIds);
      if (customerError) {
        Alert.alert('No se pudieron cargar los clientes', customerError.message);
      } else {
        const lookup: Record<string, string> = {};
        for (const customer of (customerRows ?? []) as Customer[]) {
          lookup[customer.id] = customer.full_name || customer.email || customer.id.slice(0, 8);
        }
        setCustomers(lookup);
      }
    }
    setLoading(false);
  }

  function editOrder(order: Order) {
    setSelected(order);
    setStatus(order.status);
    setPaymentStatus(order.payment_status);
  }

  async function saveOrder() {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from('orders')
      .update({ status, payment_status: paymentStatus, updated_at: new Date().toISOString() })
      .eq('id', selected.id);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo actualizar el pedido', error.message);
      return;
    }
    setSelected(null);
    await loadOrders();
  }

  return (
    <View style={s.container}>
      <View style={s.heading}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Gestión de pedidos</Text>
          <Text style={s.subtitle}>Actualiza preparación, entrega y confirmación manual de pago.</Text>
        </View>
        <TouchableOpacity style={s.refreshButton} onPress={loadOrders}><Text style={s.refreshText}>Actualizar</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#2563eb" style={{ marginTop: 35 }} /> : (
        <ScrollView contentContainerStyle={s.list}>
          {orders.length === 0 ? <Text style={s.empty}>No hay pedidos.</Text> : orders.map((order) => (
            <TouchableOpacity key={order.id} style={s.card} onPress={() => editOrder(order)}>
              <View style={{ flex: 1 }}>
                <Text style={s.orderId}>Pedido {order.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={s.customer}>{order.customer_id ? customers[order.customer_id] || order.customer_id.slice(0, 8) : 'Sin cliente asignado'}</Text>
                <Text style={s.meta}>{new Date(order.created_at).toLocaleString('es-PE')} · {order.delivery_type === 'pickup' ? 'Recojo' : 'Delivery'}</Text>
              </View>
              <View style={s.right}>
                <Text style={s.amount}>S/ {Number(order.total_amount).toFixed(2)}</Text>
                <Text style={s.status}>{ORDER_STATUSES.find((item) => item.value === order.status)?.label}</Text>
                <Text style={s.payment}>{PAYMENT_STATUSES.find((item) => item.value === order.payment_status)?.label} · {order.payment_method || 'sin método'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Modal visible={selected !== null} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={s.backdrop}>
          <View style={s.editor}>
            <Text style={s.editorTitle}>Editar pedido</Text>
            <Text style={s.meta}>#{selected?.id}</Text>
            <Text style={s.label}>Estado del pedido</Text>
            <View style={s.options}>
              {ORDER_STATUSES.map((item) => (
                <TouchableOpacity key={item.value} style={[s.option, status === item.value && s.optionSelected]} onPress={() => setStatus(item.value)}>
                  <Text style={[s.optionText, status === item.value && s.optionTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Estado del pago</Text>
            <View style={s.options}>
              {PAYMENT_STATUSES.map((item) => (
                <TouchableOpacity key={item.value} style={[s.option, paymentStatus === item.value && s.optionSelected]} onPress={() => setPaymentStatus(item.value)}>
                  <Text style={[s.optionText, paymentStatus === item.value && s.optionTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Dirección / datos de entrega</Text>
            <Text style={s.address}>{selected?.delivery_address ? JSON.stringify(selected.delivery_address, null, 2) : 'No se registraron datos de entrega.'}</Text>
            <View style={s.actions}>
              <TouchableOpacity style={s.cancelButton} onPress={() => setSelected(null)} disabled={saving}><Text style={s.cancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveButton} onPress={saveOrder} disabled={saving}><Text style={s.saveText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  title: { color: '#111827', fontSize: 23, fontWeight: '900' },
  subtitle: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  refreshButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  refreshText: { color: '#374151', fontSize: 11, fontWeight: '800' },
  list: { paddingBottom: 30 },
  empty: { color: '#9ca3af', textAlign: 'center', marginTop: 35 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 9, gap: 12 },
  orderId: { color: '#111827', fontSize: 13, fontWeight: '800' },
  customer: { color: '#374151', fontSize: 12, marginTop: 4 },
  meta: { color: '#6b7280', fontSize: 10, marginTop: 4 },
  right: { alignItems: 'flex-end' },
  amount: { color: '#1d4ed8', fontSize: 14, fontWeight: '900' },
  status: { color: '#374151', fontSize: 10, fontWeight: '700', marginTop: 3 },
  payment: { color: '#6b7280', fontSize: 9, marginTop: 3, textTransform: 'capitalize' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(15,23,42,0.6)' },
  editor: { width: '100%', maxWidth: 500, backgroundColor: '#fff', padding: 19, borderRadius: 15, maxHeight: '90%' },
  editorTitle: { color: '#111827', fontSize: 19, fontWeight: '900' },
  label: { color: '#4b5563', fontSize: 12, fontWeight: '800', marginTop: 14, marginBottom: 7 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  option: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  optionSelected: { backgroundColor: '#dbeafe', borderColor: '#60a5fa' },
  optionText: { color: '#4b5563', fontSize: 10, fontWeight: '700' },
  optionTextSelected: { color: '#1d4ed8' },
  address: { color: '#4b5563', fontSize: 11, lineHeight: 17, backgroundColor: '#f9fafb', padding: 9, borderRadius: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 18 },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelText: { color: '#6b7280', fontSize: 12, fontWeight: '800' },
  saveButton: { backgroundColor: '#1d4ed8', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  saveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
