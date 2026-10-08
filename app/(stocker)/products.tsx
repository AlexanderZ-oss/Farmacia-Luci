import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, price, stock, is_active').order('name');
    setProducts(data || []);
    setLoading(false);
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <Text style={s.title}>Productos</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/(stocker)/product-form')}>
          <Text style={s.addBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => router.push(`/(stocker)/product-form?id=${item.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.price}>S/ {Number(item.price).toFixed(2)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.stock, item.stock < 5 && { color: '#dc2626' }]}>Stock: {item.stock}</Text>
                <Text style={s.status}>{item.is_active ? '✅ Activo' : '❌ Inactivo'}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay productos.</Text>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  addBtn: { backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, flexDirection: 'row', borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontWeight: '700', color: '#1f2937', fontSize: 14 },
  price: { color: '#2563eb', fontWeight: '600', fontSize: 13, marginTop: 2 },
  stock: { fontWeight: 'bold', color: '#f59e0b', fontSize: 13 },
  status: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
