import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useCartStore, Product } from '../../stores/cartStore';

const CATEGORY_FILTERS = ['Todos', 'Medicamentos', 'Cosméticos', 'Suplementos', '1ros Auxilios', 'Bebés y Mamás', 'Higiene'];

const EMOJI_MAP: Record<string, string> = {
  'Medicamentos': '💊', 'Cosméticos': '✨', 'Suplementos': '💪',
  '1ros Auxilios': '🩹', 'Bebés y Mamás': '👶', 'Higiene': '🧴',
};

export default function CatalogScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image_url, requires_age_verification, description, stock, categories(name)')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const catName = p.categories?.name === 'Primeros Auxilios' ? '1ros Auxilios' : (p.categories?.name || 'Medicamentos');
    const matchCat = activeFilter === 'Todos' || catName === activeFilter;
    return matchSearch && matchCat;
  });

  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const renderProduct = ({ item }: { item: any }) => {
    const catName = item.categories?.name === 'Primeros Auxilios' ? '1ros Auxilios' : (item.categories?.name || 'Medicamentos');
    const emoji = EMOJI_MAP[catName] || '💊';

    return (
      <TouchableOpacity style={s.card} onPress={() => router.push(`/(store)/product/${item.id}`)} activeOpacity={0.85}>
        <View style={s.cardImgBox}>
          <Text style={s.cardEmoji}>{emoji}</Text>
          {item.requires_age_verification && (
            <View style={s.ageBadge}><Text style={s.ageBadgeText}>+18</Text></View>
          )}
          {item.stock < 10 && (
            <View style={s.lowStockBadge}><Text style={s.lowStockText}>Últimas u.</Text></View>
          )}
        </View>
        <View style={s.cardBody}>
          <Text style={s.cardCat}>{catName}</Text>
          <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={s.cardFooter}>
            <Text style={s.cardPrice}>S/ {Number(item.price).toFixed(2)}</Text>
            <TouchableOpacity
              style={s.addBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                addItem(item as Product, 1);
              }}
            >
              <Text style={s.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <View style={s.container}>
        {/* Header & Search Bar */}
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={s.searchBox}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar medicamentos..."
              placeholderTextColor="#94a3b8"
            />
          </View>
          <TouchableOpacity style={s.cartBtn} onPress={() => router.push('/(store)/cart')}>
            <Text style={s.cartBtnText}>🛒</Text>
            {cartItemCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={s.filtersRow}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORY_FILTERS}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.filterChip, activeFilter === item && s.filterChipActive]}
                onPress={() => setActiveFilter(item)}
              >
                <Text style={[s.filterText, activeFilter === item && s.filterTextActive]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Results count */}
        <View style={s.resultsBar}>
          <Text style={s.resultsText}>{filtered.length} productos encontrados</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={s.row}
            contentContainerStyle={s.list}
            ListEmptyComponent={
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>🔍</Text>
                <Text style={s.emptyText}>No se encontraron productos</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(59,130,246,0.1)', top: -100, right: -50 },
  circle2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(16,185,129,0.08)', bottom: 100, left: -50 },
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  header: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 16, gap: 12, alignItems: 'center' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(30,41,59,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' },
  backBtnText: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)'
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#f1f5f9' },
  cartBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(30,41,59,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)', position: 'relative' },
  cartBtnText: { fontSize: 20 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  filtersRow: { marginBottom: 8, height: 40 },
  filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(30,41,59,0.7)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)', justifyContent: 'center' },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  filterTextActive: { color: '#fff', fontWeight: '800' },

  resultsBar: { paddingHorizontal: 20, paddingVertical: 12 },
  resultsText: { color: '#64748b', fontSize: 13, fontWeight: '600' },

  list: { paddingHorizontal: 14, paddingBottom: 40 },
  row: { justifyContent: 'space-between', paddingHorizontal: 6 },

  card: {
    backgroundColor: 'rgba(30,41,59,0.7)', width: '48%', borderRadius: 20, overflow: 'hidden', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)',
  },
  cardImgBox: { width: '100%', height: 130, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardEmoji: { fontSize: 48 },
  ageBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ageBadgeText: { color: '#fca5a5', fontSize: 10, fontWeight: '800' },
  lowStockBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  lowStockText: { color: '#fde047', fontSize: 10, fontWeight: '800' },
  cardBody: { padding: 14 },
  cardCat: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', marginBottom: 10, lineHeight: 20, height: 40 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 16, fontWeight: '800', color: '#60a5fa' },
  addBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },

  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16, opacity: 0.5 },
  emptyText: { color: '#64748b', fontSize: 16, fontWeight: '500' },
});
