import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, TextInput, Platform, Image } from 'react-native';
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
        .select('id, name, price, image_url, requires_age_verification, description, stock, categories(name), product_images(image_url, sort_order)')
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
    const gallery = [...(item.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
    const primaryImage = gallery[0]?.image_url || item.image_url;

    return (
      <TouchableOpacity style={s.card} onPress={() => router.push(`/(store)/product/${item.id}`)} activeOpacity={0.85}>
        <View style={s.cardImgBox}>
          {primaryImage
            ? <Image source={{ uri: primaryImage }} style={s.productImage} resizeMode="cover" />
            : <Text style={s.cardEmoji}>{emoji}</Text>}
          {gallery.length > 1 && (
            <View style={s.imageCount}><Text style={s.imageCountText}>{gallery.length} fotos</Text></View>
          )}
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
  wrapper: { flex: 1, backgroundColor: '#050d17' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(59,130,246,0.12)',
    top: -100,
    right: -50,
  },
  circle2: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: 'rgba(168,85,247,0.08)',
    bottom: 100,
    left: -50,
  },
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },

  header: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  backBtnText: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#f8fafc' },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    position: 'relative',
  },
  cartBtnText: { fontSize: 20 },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  filtersRow: { marginBottom: 8, height: 40 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  filterText: { fontSize: 13, color: '#94a3b8', fontWeight: '700' },
  filterTextActive: { color: '#fff', fontWeight: '800' },

  resultsBar: { paddingHorizontal: 20, paddingVertical: 14, marginBottom: 8 },
  resultsText: { color: '#dbeafe', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  row: { justifyContent: 'space-between', paddingHorizontal: 20 },
  list: { paddingBottom: 40 },
  card: {
    width: '48%',
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    marginBottom: 14,
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  cardImgBox: {
    width: '100%',
    height: 130,
    backgroundColor: 'rgba(96,165,250,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productImage: { width: '100%', height: '100%' },
  imageCount: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(15,23,42,0.78)', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5 },
  imageCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  cardEmoji: { fontSize: 34 },
  ageBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  ageBadgeText: { color: '#fca5a5', fontSize: 10, fontWeight: '900' },
  lowStockBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowStockText: { color: '#fbbf24', fontSize: 9, fontWeight: '800' },
  cardBody: { padding: 12 },
  cardCat: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardName: { color: '#f8fafc', fontSize: 15, fontWeight: '800', lineHeight: 20, minHeight: 40 },
  cardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '900', fontSize: 22, lineHeight: 22 },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
});
