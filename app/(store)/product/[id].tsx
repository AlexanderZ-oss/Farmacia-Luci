import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, Image, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useCartStore, Product } from '../../../stores/cartStore';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../lib/theme';

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const [product, setProduct]       = useState<any>(null);
  const [gallery, setGallery]       = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [added, setAdded]           = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const router  = useRouter();

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
        .map((img) => img.image_url);
      if (images.length === 0 && data.image_url) images.push(data.image_url);
      setGallery(images);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={s.loadingBox}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={s.loadingText}>Cargando producto...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={s.loadingBox}>
        <Text style={s.notFound}>Producto no encontrado</Text>
        <TouchableOpacity
          style={s.backBtnCenter}
          onPress={() => router.back()}
        >
          <View style={s.backCenterRow}>
            <Ionicons name="arrow-back" size={16} color={C.white} />
            <Text style={s.backBtnCenterText}>Volver al catálogo</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const catName = product.categories?.name || 'Medicamentos';

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Image viewer ──────────────────────────────── */}
      <View style={s.imgArea}>
        <View style={s.imgBg} />
        {gallery[selectedImage]
          ? <Image source={{ uri: gallery[selectedImage] }} style={s.mainImage} resizeMode="contain" />
          : <Ionicons name="medkit-outline" size={80} color={C.greenMid} />
        }

        {/* Back */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>

        {/* Counter */}
        {gallery.length > 1 && (
          <View style={s.imgCounter}>
            <Text style={s.imgCounterText}>{selectedImage + 1} / {gallery.length}</Text>
          </View>
        )}
      </View>

      {/* ── Info Card ──────────────────────────────────── */}
      <View style={s.infoCard}>
        {/* Category */}
        <Text style={s.cat}>{catName}</Text>

        {/* Name */}
        <Text style={s.name}>{product.name}</Text>

        {/* Thumbnail strip */}
        {gallery.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.thumbnailList}
          >
            {gallery.map((url, idx) => (
              <TouchableOpacity
                key={`${url}-${idx}`}
                accessibilityRole="button"
                accessibilityLabel={`Ver imagen ${idx + 1} de ${gallery.length}`}
                accessibilityState={{ selected: idx === selectedImage }}
                style={[s.thumbnailBtn, idx === selectedImage && s.thumbnailBtnActive]}
                onPress={() => setSelectedImage(idx)}
              >
                <Image source={{ uri: url }} style={s.thumbnailImg} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Price + stock */}
        <View style={s.priceRow}>
          <Text style={s.price}>S/ {Number(product.price).toFixed(2)}</Text>
          <View style={[s.stockBadge, product.stock < 10 ? s.stockLow : s.stockOk]}>
            <Ionicons
              name={product.stock < 10 ? 'alert-circle-outline' : 'checkmark-circle'}
              size={14}
              color={product.stock < 10 ? '#92400E' : C.greenDark}
            />
            <Text style={[s.stockText, product.stock < 10 && { color: '#92400E' }]}>
              {product.stock < 10 ? `Quedan ${product.stock}` : 'En stock'}
            </Text>
          </View>
        </View>

        {/* Age warning */}
        {product.requires_age_verification && (
          <View style={s.ageWarn}>
            <Ionicons name="alert-circle-outline" size={17} color="#B91C1C" />
            <Text style={s.ageWarnText}>
              Este producto requiere verificación de edad (+18) al finalizar la compra.
            </Text>
          </View>
        )}

        <View style={s.divider} />

        {/* Description */}
        <Text style={s.descTitle}>Descripción</Text>
        <Text style={s.desc}>{product.description || 'Sin descripción disponible.'}</Text>

        <View style={s.divider} />

        {/* Add to cart */}
        <TouchableOpacity
          style={[s.addBtn, added && s.addBtnDone]}
          activeOpacity={0.87}
          accessibilityRole="button"
          accessibilityLabel={added ? 'Producto agregado al carrito' : 'Añadir al carrito'}
          onPress={() => {
            addItem(product as Product, 1);
            setAdded(true);
            setTimeout(() => setAdded(false), 2000);
          }}
        >
          <Ionicons name={added ? 'checkmark-circle-outline' : 'cart-outline'} size={19} color={C.white} />
          <Text style={s.addBtnText}>{added ? 'Agregado al carrito' : 'Añadir al carrito'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:   { flex: 1, backgroundColor: C.bgPage },
  content:  { paddingBottom: 60 },

  // Loading / error
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bgPage,
    gap: 16,
  },
  loadingText:    { color: C.textMid, fontSize: 14 },
  notFound:       { color: C.textMid, fontSize: 16, fontWeight: '600' },
  backBtnCenter: {
    backgroundColor: C.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backCenterRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backBtnCenterText: { color: C.white, fontWeight: '700', fontSize: 14 },

  // ── Image area
  imgArea: {
    height: 280,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  imgBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F8FAFB',
  },
  mainImage: { width: '100%', height: '100%' },

  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  imgCounter: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imgCounterText: { color: C.white, fontSize: 12, fontWeight: '700' },

  // ── Info card
  infoCard: {
    backgroundColor: C.white,
    marginTop: -1,
    padding: 22,
    minHeight: 320,
  },
  cat: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  name: { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 16, lineHeight: 30, letterSpacing: -0.3 },

  thumbnailList:  { gap: 8, marginBottom: 18 },
  thumbnailBtn: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: C.border,
  },
  thumbnailBtnActive: { borderColor: C.green },
  thumbnailImg:   { width: '100%', height: '100%' },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  price: { fontSize: 28, fontWeight: '700', color: C.green },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  stockOk: { backgroundColor: C.greenLight },
  stockLow: { backgroundColor: '#FEF3C7' },
  stockText: { fontSize: 12, fontWeight: '700', color: C.green },

  ageWarn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  ageWarnText: { color: '#B91C1C', fontSize: 13, fontWeight: '600', lineHeight: 18, flex: 1 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 18 },

  descTitle: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 8, letterSpacing: 0.3 },
  desc:      { fontSize: 15, color: C.textMid, lineHeight: 24 },

  addBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.green,
    padding: 17,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 54,
    justifyContent: 'center',
  },
  addBtnDone: { backgroundColor: C.greenDark },
  addBtnText: { color: C.white, fontWeight: '700', fontSize: 15.5, letterSpacing: 0.3 },
});
