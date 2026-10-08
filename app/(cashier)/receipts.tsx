import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ReceiptsScreen() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSales(); }, []);

  async function fetchSales() {
    const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(50);
    setSales(data || []);
    setLoading(false);
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Historial de Boletas</Text>
      {loading ? <ActivityIndicator color="#ea580c" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={sales}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardId}>Boleta #{item.id.slice(0, 8)}</Text>
                <Text style={s.cardDate}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.cardTotal}>S/ {Number(item.total_amount).toFixed(2)}</Text>
                <Text style={s.cardMethod}>{item.payment_method}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay boletas registradas.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb' },
  cardId: { fontWeight: '700', color: '#1f2937', fontSize: 14 },
  cardDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  cardTotal: { fontWeight: 'bold', color: '#2563eb', fontSize: 15 },
  cardMethod: { color: '#6b7280', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
