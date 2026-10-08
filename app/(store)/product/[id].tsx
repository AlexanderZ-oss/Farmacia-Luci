import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCartStore, Product } from '../../../stores/cartStore';

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  useEffect(() => { if (id) fetchProduct(); }, [id]);

  async function fetchProduct() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, description, image_url, requires_age_verification, stock, categories(name)')
        .eq('id', id).single();
      if (error) throw error;
      setProduct(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }

  if (loading) return <View style={s.loadingBox}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  if (!product) return <View style={s.loadingBox}><Text style={s.notFound}>Producto no encontrado</Text></View>;

  const catName = product.categories?.name || 'Medicamentos';

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      {/* Image Area */}
      <View style={s.imgArea}>
        <View style={s.imgDecor} />
        <Text style={s.imgEmoji}>💊</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Volver</Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={s.infoCard}>
        <Text style={s.cat}>{catName}</Text>
        <Text style={s.name}>{product.name}</Text>
        <View style={s.priceRow}>
          <Text style={s.price}>S/ {Number(product.price).toFixed(2)}</Text>
          <View style={[s.stockBadge, product.stock < 10 ? s.stockLow : s.stockOk]}>
            <Text style={s.stockText}>{product.stock < 10 ? `Quedan ${product.stock}` : 'En stock'}</Text>
          </View>
        </View>

        {product.requires_age_verification && (
          <View style={s.ageWarn}>
            <Text style={s.ageWarnText}>⚠️ Este producto requiere verificación de edad (+18) al comprar</Text>
          </View>
        )}

        <View style={s.divider} />
        <Text style={s.descTitle}>Descripción</Text>
        <Text style={s.desc}>{product.description || 'Sin descripción disponible.'}</Text>

        <View style={s.divider} />

        {/* Add to cart */}
        <TouchableOpacity
          style={[s.addBtn, added && s.addBtnDone]}
          activeOpacity={0.85}
          onPress={() => {
            addItem(product as Product, 1);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          <Text style={s.addBtnText}>{added ? '✓ Agregado al Carrito' : '🛒 Añadir al Carrito'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingBottom: 48 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  notFound: { color: '#94a3b8', fontSize: 16 },

  imgArea: { backgroundColor: '#f1f5f9', height: 260, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  imgDecor: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(59,130,246,0.08)', top: -40, right: -30 },
  imgEmoji: { fontSize: 80 },
  backBtn: { position: 'absolute', top: 48, left: 16, backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  backBtnText: { color: '#475569', fontWeight: '600', fontSize: 14 },

  infoCard: { backgroundColor: '#fff', marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 300 },
  cat: { fontSize: 12, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12, lineHeight: 30 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price: { fontSize: 28, fontWeight: '800', color: '#3b82f6' },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockOk: { backgroundColor: '#f0fdf4' },
  stockLow: { backgroundColor: '#fef2f2' },
  stockText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  ageWarn: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' },
  ageWarnText: { color: '#dc2626', fontSize: 13, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 16 },
  descTitle: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  desc: { fontSize: 15, color: '#64748b', lineHeight: 24 },
  addBtn: { backgroundColor: '#1e293b', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  addBtnDone: { backgroundColor: '#16a34a' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
