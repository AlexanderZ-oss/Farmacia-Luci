import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Image, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const BASE = 'id, name, price, stock, is_active, image_url';
    let res: any = await supabase.from('products').select(`${BASE}, requires_prescription`).order('name');
    if (res.error && /requires_prescription/i.test(res.error.message)) {
      res = await supabase.from('products').select(BASE).order('name');
    }
    const { data, error } = res;
    if (error) Alert.alert('Error al cargar productos', error.message);
    setProducts(data ?? []);
    setLoading(false);
  }

  return (
    <View style={s.container}>
      <View style={s.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>CATÁLOGO</Text>
          <Text style={s.title}>Productos</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => router.push('/(stocker)/product-form')}
          accessibilityRole="button"
          accessibilityLabel="Nuevo producto"
        >
          <Ionicons name="add" size={16} color={C.white} />
          <Text style={s.addBtnText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const low = item.stock < 5;
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => router.push(`/(stocker)/product-form?id=${item.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.name}`}
              >
                <View style={s.thumbnailBox}>
                  {item.image_url
                    ? <Image source={{ uri: item.image_url }} style={s.thumbnail} resizeMode="cover" />
                    : <Ionicons name="medkit-outline" size={20} color={C.textLight} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.price}>S/ {Number(item.price).toFixed(2)}</Text>
                    {item.requires_prescription && (
                      <View style={s.rxBadge}>
                        <Ionicons name="document-text-outline" size={11} color={C.greenDark} />
                        <Text style={s.rxText}>Receta</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={s.right}>
                  <View style={[s.stockBadge, low && s.stockBadgeLow]}>
                    <Text style={[s.stock, low && s.stockLow]}>Stock {item.stock}</Text>
                  </View>
                  <View style={s.statusRow}>
                    <View style={[s.statusDot, { backgroundColor: item.is_active ? C.green : C.textLight }]} />
                    <Text style={s.status}>{item.is_active ? 'Activo' : 'Inactivo'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="cube-outline" size={34} color={C.textLight} />
              <Text style={s.empty}>No hay productos.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage, padding: 22, maxWidth: 980, width: '100%', alignSelf: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginBottom: 18 },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { fontSize: 23, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.green, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8,
  },
  addBtnText: { color: C.white, fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: C.white, padding: 14, borderRadius: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.border,
  },
  thumbnailBox: {
    width: 52, height: 52, borderRadius: 8, overflow: 'hidden',
    backgroundColor: C.bgSubtle, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  thumbnail: { width: '100%', height: '100%' },
  name: { fontWeight: '700', color: C.text, fontSize: 14 },
  price: { color: C.textMid, fontWeight: '600', fontSize: 13, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
  stockBadge: { backgroundColor: C.accentLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  stock: { fontWeight: '700', color: C.accent, fontSize: 12 },
  stockLow: { color: '#92400E' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 },
  rxBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    borderWidth: 1, borderColor: '#BFDCD7',
  },
  rxText: { color: C.greenDark, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  status: { fontSize: 11, color: C.textMid, fontWeight: '600' },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 40 },
  empty: { textAlign: 'center', color: C.textMid, fontSize: 13 },
});
