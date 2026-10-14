import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCartStore, Product } from '../../../stores/cartStore';

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();

  useEffect(() => { if (id) fetchProduct(); }, [id]);

  async function fetchProduct() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, description, image_url, requires_age_verification, stock, categories(name), product_images(image_url, sort_order)')
        .eq('id', id).single();
      if (error) throw error;
      setProduct(data);
      const images = [...(data.product_images || [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((image) => image.image_url);
      if (images.length === 0 && data.image_url) images.push(data.image_url);
      setGallery(images);
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
        {gallery[selectedImage]
          ? <Image source={{ uri: gallery[selectedImage] }} style={s.mainImage} resizeMode="contain" />
          : <Text style={s.imgEmoji}>💊</Text>}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Volver</Text>
        </TouchableOpacity>
        {gallery.length > 1 && (
          <View style={s.imageCount}>
            <Text style={s.imageCountText}>{selectedImage + 1} / {gallery.length}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={s.infoCard}>
        <Text style={s.cat}>{catName}</Text>
        <Text style={s.name}>{product.name}</Text>
        {gallery.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.thumbnailList}>
            {gallery.map((imageUrl, index) => (
              <TouchableOpacity
                key={`${imageUrl}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={`Ver imagen ${index + 1} de ${gallery.length}`}
                accessibilityState={{ selected: index === selectedImage }}
                style={[s.thumbnailButton, index === selectedImage && s.thumbnailSelected]}
                onPress={() => setSelectedImage(index)}
              >
                <Image source={{ uri: imageUrl }} style={s.thumbnailImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
  scroll: { flex: 1, backgroundColor: '#050d17' },
  content: { paddingBottom: 48 },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050d17' },
  notFound: { color: '#94a3b8', fontSize: 16 },

  imgArea: {
    backgroundColor: '#0f172a',
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  imgDecor: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(96,165,250,0.12)',
    top: -40,
    right: -30,
  },
  imgEmoji: { fontSize: 80 },
  mainImage: { width: '100%', height: '100%' },
  imageCount: { position: 'absolute', right: 16, bottom: 16, backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  imageCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    backgroundColor: 'rgba(15,23,42,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  backBtnText: { color: '#f8fafc', fontWeight: '700', fontSize: 14 },

  infoCard: {
    backgroundColor: '#0f172a',
    marginTop: -24,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    minHeight: 300,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.08)',
  },
  cat: {
    fontSize: 12,
    fontWeight: '800',
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  name: { fontSize: 24, fontWeight: '900', color: '#f8fafc', marginBottom: 12, lineHeight: 30 },
  thumbnailList: { gap: 8, marginBottom: 16 },
  thumbnailButton: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)' },
  thumbnailSelected: { borderColor: '#60a5fa', borderWidth: 2 },
  thumbnailImage: { width: '100%', height: '100%' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price: { fontSize: 28, fontWeight: '900', color: '#60a5fa' },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockOk: { backgroundColor: 'rgba(16,185,129,0.12)' },
  stockLow: { backgroundColor: 'rgba(239,68,68,0.12)' },
  stockText: { fontSize: 12, fontWeight: '700', color: '#34d399' },
  ageWarn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  ageWarnText: { color: '#fca5a5', fontSize: 13, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(148,163,184,0.08)', marginVertical: 16 },
  descTitle: { fontSize: 14, fontWeight: '800', color: '#cbd5e1', marginBottom: 8 },
  desc: { fontSize: 15, color: '#94a3b8', lineHeight: 24 },
  addBtn: {
    backgroundColor: '#3b82f6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  addBtnDone: { backgroundColor: '#16a34a' },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
