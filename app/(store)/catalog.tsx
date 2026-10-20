import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput, Platform, Image,
} from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useCartStore, Product } from '../../stores/cartStore';
import { Ionicons } from '@expo/vector-icons';
import { C, IconName } from '../../lib/theme';

const CATEGORY_FILTERS = [
  'Todos', 'Medicamentos', 'Cosméticos', 'Suplementos',
  '1ros Auxilios', 'Bebés y Mamás', 'Higiene',
];

const ICON_MAP: Record<string, IconName> = {
  Medicamentos: 'medkit-outline', Cosméticos: 'sparkles-outline',
  Suplementos: 'nutrition-outline', '1ros Auxilios': 'bandage-outline',
  'Bebés y Mamás': 'balloon-outline', Higiene: 'water-outline',
};

export default function CatalogScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const router   = useRouter();
  const addItem  = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  useEffect(() => { fetchProducts(); }, [search]);

  async function fetchProducts() {
    try {
      // Búsqueda en servidor. Nota: usa el helper search_products_vulnerable
      // (pendiente revisar sanitización del parámetro query_param).
      if (search.trim()) {
        const { data, error } = await supabase.rpc('search_products_vulnerable', {
          query_param: search.trim(),
        });
        if (error) throw error;
        setProducts((data as any[]) || []);
        return;
      }
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

  const filtered = products.filter((p) => {
    const catName = p.categories?.name === 'Primeros Auxilios'
      ? '1ros Auxilios'
      : (p.categories?.name || 'Medicamentos');
    const matchCat = activeFilter === 'Todos' || catName === activeFilter;
    return matchCat;
  });

  const renderProduct = ({ item }: { item: any }) => {
    const catName = item.categories?.name === 'Primeros Auxilios'
      ? '1ros Auxilios'
      : (item.categories?.name || 'Medicamentos');
    const icon = ICON_MAP[catName] || 'medkit-outline';
    const gallery = [...(item.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
    const primaryImage = gallery[0]?.image_url || item.image_url;

    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => router.push(`/(store)/product/${item.id}`)}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${item.name}`}
      >
        {/* Image */}
        <View style={s.cardImgBox}>
          {primaryImage
            ? <Image source={{ uri: primaryImage }} style={s.productImage} resizeMode="cover" />
            : <Ionicons name={icon} size={40} color={C.greenMid} />
          }
          {gallery.length > 1 && (
            <View style={s.imageCount}>
              <Text style={s.imageCountText}>{gallery.length} fotos</Text>
            </View>
          )}
          {item.requires_age_verification && (
            <View style={s.ageBadge}>
              <Text style={s.ageBadgeText}>+18</Text>
            </View>
          )}
          {item.stock < 10 && (
            <View style={s.lowStockBadge}>
              <Text style={s.lowStockText}>Últimas u.</Text>
            </View>
          )}
        </View>

        {/* Body */}
        <View style={s.cardBody}>
          <Text style={s.cardCat}>{catName}</Text>
          <Text style={s.cardName} numberOfLines={2}>{item.name}</Text>
          <View style={s.cardFooter}>
            <Text style={s.cardPrice}>S/ {Number(item.price).toFixed(2)}</Text>
            <View
              style={s.addBtn}
              onStartShouldSetResponder={() => true}
              onResponderRelease={(e) => {
                e.stopPropagation?.();
                addItem(item as Product, 1);
              }}
              accessibilityRole="none"
              accessibilityLabel={`Agregar ${item.name} al carrito`}
            >
              <Ionicons name="add" size={20} color={C.white} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.wrapper}>
      {/* ── Sub-header ────────────────────────────────────── */}
      <View style={s.subHeader}>
        {/* Back + Search + Cart */}
        <View style={s.searchRow}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={18} color={C.text} />
          </TouchableOpacity>

          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={C.textLight} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar medicamentos..."
              placeholderTextColor={C.textLight}
              accessibilityLabel="Buscar productos"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close" size={16} color={C.textLight} style={{ paddingHorizontal: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={s.cartBtn}
            onPress={() => router.push('/(store)/cart')}
            accessibilityRole="button"
            accessibilityLabel={`Carrito, ${cartCount} productos`}
          >
            <Ionicons name="cart-outline" size={20} color={C.text} />
            {cartCount > 0 && (
              <View style={s.cartBadge}>
                <Text style={s.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Category chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={s.filtersRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.chip, activeFilter === item && s.chipActive]}
              onPress={() => setActiveFilter(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilter === item }}
              accessibilityLabel={`Filtrar por ${item}`}
            >
              <Text style={[s.chipText, activeFilter === item && s.chipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results count */}
      <View style={s.resultsBar}>
        <Text style={s.resultsText}>
          {loading ? 'Cargando...' : `${filtered.length} productos`}
        </Text>
      </View>

      {/* Product grid */}
      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={C.green} />
          <Text style={s.loadingText}>Cargando productos...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={s.row}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Ionicons name="search-outline" size={44} color={C.textLight} style={{ marginBottom: 14 }} />
              <Text style={s.emptyTitle}>Sin resultados</Text>
              <Text style={s.emptyText}>
                No encontramos productos para "{search || activeFilter}".
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => { setSearch(''); setActiveFilter('Todos'); }}
              >
                <Text style={s.emptyBtnText}>Ver todos los productos</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgPage },

  // ── Sub-header
  subHeader: {
    backgroundColor: C.white,
    paddingTop: Platform.OS === 'ios' ? 0 : 8,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },

  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderStrong,
  },

  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bgPage,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14.5, color: C.text, height: 44 },

  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderStrong,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: C.accent,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.white,
  },
  cartBadgeText: { color: C.white, fontSize: 10, fontWeight: '900' },

  filtersRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.bgPage,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipActive:     { backgroundColor: C.green, borderColor: C.green },
  chipText:       { fontSize: 13, color: C.textMid, fontWeight: '600' },
  chipTextActive: { color: C.white, fontWeight: '800' },

  // ── Results bar
  resultsBar: { paddingHorizontal: 18, paddingVertical: 10 },
  resultsText: { color: C.textMid, fontSize: 13, fontWeight: '700' },

  // ── Loading
  loadingBox: { alignItems: 'center', paddingTop: 60 },
  loadingText: { color: C.textLight, marginTop: 14, fontSize: 14 },

  // ── Grid
  row:  { justifyContent: 'space-between', paddingHorizontal: 16 },
  list: { paddingBottom: 100, paddingTop: 4 },

  card: {
    width: '48%',
    backgroundColor: C.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  cardImgBox: {
    width: '100%',
    height: 130,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  productImage: { width: '100%', height: '100%' },

  imageCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageCountText: { color: C.white, fontSize: 10, fontWeight: '700' },

  ageBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  ageBadgeText: { color: C.red, fontSize: 10, fontWeight: '800' },

  lowStockBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lowStockText: { color: '#92400E', fontSize: 9, fontWeight: '800' },

  cardBody: { padding: 12 },
  cardCat: {
    color: C.green,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardName: {
    color: C.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    minHeight: 38,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: { color: C.green, fontSize: 16, fontWeight: '700' },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Empty
  emptyBox:  { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 24 },
  emptyTitle:{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: C.textMid, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn:  {
    backgroundColor: C.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  emptyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
