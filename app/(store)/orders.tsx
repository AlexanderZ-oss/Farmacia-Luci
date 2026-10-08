import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOrders(); }, []);

  async function fetchOrders() {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }

  const statusColors: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#2563eb', shipped: '#8b5cf6',
    ready_pickup: '#16a34a', delivered: '#059669', cancelled: '#dc2626',
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Mis Pedidos</Text>
      {loading ? <ActivityIndicator color="#2563eb" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={orders}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.orderId}>Pedido #{item.id.slice(0, 8)}</Text>
                <Text style={s.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.orderTotal}>S/ {Number(item.total_amount).toFixed(2)}</Text>
                <View style={[s.badge, { backgroundColor: (statusColors[item.status] || '#6b7280') + '20' }]}>
                  <Text style={[s.badgeText, { color: statusColors[item.status] || '#6b7280' }]}>{item.status}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>No tienes pedidos aún.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb' },
  orderId: { fontWeight: '700', color: '#1f2937', fontSize: 14 },
  orderDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  orderTotal: { fontWeight: 'bold', color: '#2563eb', fontSize: 15 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
