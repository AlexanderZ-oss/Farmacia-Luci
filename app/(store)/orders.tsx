import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { C, IconName } from '../../lib/theme';

type StatusConfig = { label: string; bg: string; text: string; icon: IconName };

const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending:      { label: 'Pendiente',       bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
  confirmed:    { label: 'Confirmado',      bg: '#DBEAFE', text: '#1E40AF', icon: 'checkmark-circle-outline' },
  shipped:      { label: 'En camino',       bg: '#E0E7FF', text: '#3730A3', icon: 'car-outline' },
  ready_pickup: { label: 'Listo para retiro', bg: C.greenLight, text: C.greenDark, icon: 'storefront-outline' },
  delivered:    { label: 'Entregado',       bg: C.greenLight, text: C.greenDark, icon: 'checkmark-done-outline' },
  cancelled:    { label: 'Cancelado',       bg: '#FEE2E2', text: '#991B1B', icon: 'close-circle-outline' },
};

const PAYMENT_LABELS: Record<string, string> = {
  card: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
};

export default function OrdersScreen() {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.pageHeader}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.push('/(store)')}
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
        >
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.eyebrow}>MI CUENTA</Text>
          <Text style={s.title}>Mis Pedidos</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={C.green} size="large" />
          <Text style={s.loadingText}>Cargando pedidos...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(i) => i.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const st = STATUS_CONFIG[item.status] || {
              label: item.status,
              bg: '#F1F5F9',
              text: C.textMid,
              icon: 'cube-outline' as IconName,
            };
            return (
              <View style={s.card}>
                <View style={s.cardLeft}>
                  <Text style={s.orderId}>Pedido #{item.id.slice(0, 8).toUpperCase()}</Text>
                  <Text style={s.orderDate}>
                    {new Date(item.created_at).toLocaleDateString('es-PE', {
                      day: '2-digit', month: 'long', year: 'numeric',
                    })}
                  </Text>
                  <View style={s.paymentRow}>
                    <Text style={s.paymentLabel}>
                      {PAYMENT_LABELS[item.payment_method] || item.payment_method}
                    </Text>
                    <View style={[
                      s.paymentBadge,
                      item.payment_status === 'paid'
                        ? { backgroundColor: C.greenLight }
                        : { backgroundColor: '#FEF3C7' },
                    ]}>
                      <Ionicons
                        name={item.payment_status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                        size={13}
                        color={item.payment_status === 'paid' ? C.green : '#92400E'}
                      />
                      <Text style={[
                        s.paymentBadgeText,
                        item.payment_status === 'paid'
                          ? { color: C.green }
                          : { color: '#92400E' },
                      ]}>
                        {item.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={s.cardRight}>
                  <Text style={s.orderTotal}>S/ {Number(item.total_amount).toFixed(2)}</Text>
                  <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={13} color={st.text} />
                    <Text style={[s.statusText, { color: st.text }]}>{st.label}</Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="cube-outline" size={52} color={C.textLight} style={{ marginBottom: 6 }} />
              <Text style={s.emptyTitle}>Sin pedidos aún</Text>
              <Text style={s.emptySub}>Tus pedidos aparecerán aquí una vez que realices tu primera compra.</Text>
              <TouchableOpacity
                style={s.shopBtn}
                onPress={() => router.push('/(store)/catalog')}
                accessibilityRole="button"
              >
                <Text style={s.shopBtnText}>Ir al catálogo</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage },

  // ── Header
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.white,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  eyebrow:     { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title:       { color: C.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.3 },

  // ── Loading
  loadingBox: { alignItems: 'center', paddingTop: 60, gap: 14 },
  loadingText: { color: C.textMid, fontSize: 14 },

  // ── List
  list: { padding: 16, paddingBottom: 100, gap: 12 },

  card: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    gap: 12,
  },
  cardLeft:  { flex: 1, gap: 4 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between' },

  orderId:   { color: C.text, fontWeight: '800', fontSize: 14 },
  orderDate: { color: C.textMid, fontSize: 12 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  paymentLabel: { color: C.textMid, fontSize: 12 },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paymentBadgeText: { fontSize: 11, fontWeight: '700' },

  orderTotal:   { color: C.green, fontWeight: '700', fontSize: 17 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
  },
  statusText:   { fontSize: 12, fontWeight: '700' },

  // ── Empty
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyTitle: { color: C.text, fontSize: 19, fontWeight: '700' },
  emptySub:   { color: C.textMid, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  shopBtn: {
    backgroundColor: C.green,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: 6,
  },
  shopBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
