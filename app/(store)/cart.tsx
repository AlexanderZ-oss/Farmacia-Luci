import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { useCartStore } from '../../stores/cartStore';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const { session } = useAuthStore();
  const router = useRouter();
  const subtotal = getTotal();
  const shipping = subtotal >= 50 ? 0 : 5;

  const handleCheckout = () => {
    if (!session) {
      router.push('/(auth)/login?mode=register&returnTo=checkout');
      return;
    }
    router.push('/(store)/checkout');
  };

  if (items.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.eyebrow}>TU COMPRA</Text>
        <Text style={s.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={s.emptySub}>Explora nuestro catálogo y agrega los productos que necesitas.</Text>
        <TouchableOpacity style={s.secondaryButton} onPress={() => router.push('/(store)/catalog')}>
          <Text style={s.secondaryButtonText}>Explorar catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.eyebrow}>TU COMPRA</Text>
          <Text style={s.title}>Carrito</Text>
          <Text style={s.subtitle}>{items.reduce((count, item) => count + item.quantity, 0)} unidades · {items.length} productos</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(store)/catalog')} style={s.continueButton}>
          <Text style={s.continueText}>Seguir comprando</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.itemsColumn}>
          {items.map((item) => (
            <View key={item.product.id} style={s.itemCard}>
              <View style={s.productImage}>
                {item.product.image_url ? (
                  <Image source={{ uri: item.product.image_url }} style={s.image} resizeMode="cover" />
                ) : (
                  <Text style={s.imageFallback}>MED</Text>
                )}
              </View>
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={s.itemUnitPrice}>S/ {Number(item.product.price).toFixed(2)} por unidad</Text>
                <View style={s.quantityControl}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Reducir cantidad de ${item.product.name}`}
                    style={s.quantityButton}
                    onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Text style={s.quantityButtonText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.quantity}>{item.quantity}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Aumentar cantidad de ${item.product.name}`}
                    style={s.quantityButton}
                    onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Text style={s.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.itemTrailing}>
                <Text style={s.lineTotal}>S/ {(Number(item.product.price) * item.quantity).toFixed(2)}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ${item.product.name} del carrito`}
                  onPress={() => removeItem(item.product.id)}
                  style={s.removeButton}
                >
                  <Text style={s.removeText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={s.summary}>
          <Text style={s.summaryTitle}>Resumen del pedido</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>S/ {subtotal.toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Envío</Text>
            <Text style={[s.summaryValue, shipping === 0 && s.freeShipping]}>
              {shipping === 0 ? 'Gratis' : `S/ ${shipping.toFixed(2)}`}
            </Text>
          </View>
          <View style={s.divider} />
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total estimado</Text>
            <Text style={s.totalValue}>S/ {(subtotal + shipping).toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={s.checkoutButton} onPress={handleCheckout} activeOpacity={0.85}>
            <Text style={s.checkoutText}>{session ? 'Continuar al pago' : 'Crear cuenta y continuar'}</Text>
            <Text style={s.checkoutArrow}>→</Text>
          </TouchableOpacity>
          <Text style={s.secureNote}>El pedido se confirmará después de verificar el pago.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6f8', paddingHorizontal: 24 },
  scroll: { flex: 1 },
  pageHeader: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingTop: Platform.OS === 'web' ? 38 : 24, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 },
  eyebrow: { color: '#64748b', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
  title: { color: '#0f172a', fontSize: 32, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 5 },
  continueButton: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff' },
  continueText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', flexGrow: 1, flexDirection: Platform.OS === 'web' ? 'row' : 'column', alignItems: 'flex-start', gap: 20, paddingBottom: 24 },
  itemsColumn: { width: Platform.OS === 'web' ? '62%' : '100%' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 16, marginBottom: 12, gap: 16 },
  productImage: { width: 76, height: 76, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imageFallback: { color: '#64748b', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { color: '#0f172a', fontSize: 15, fontWeight: '700', lineHeight: 21 },
  itemUnitPrice: { color: '#64748b', fontSize: 13, marginTop: 5 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 7, overflow: 'hidden' },
  quantityButton: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  quantityButtonText: { color: '#334155', fontSize: 18, fontWeight: '600' },
  quantity: { minWidth: 36, textAlign: 'center', color: '#0f172a', fontSize: 13, fontWeight: '700' },
  itemTrailing: { alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between' },
  lineTotal: { color: '#0f172a', fontSize: 15, fontWeight: '800' },
  removeButton: { paddingVertical: 5, paddingHorizontal: 2 },
  removeText: { color: '#b91c1c', fontSize: 12, fontWeight: '600' },
  summary: { width: Platform.OS === 'web' ? '38%' : '100%', backgroundColor: '#fff', padding: 22, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  summaryTitle: { color: '#0f172a', fontSize: 17, fontWeight: '800', marginBottom: 22 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  summaryLabel: { color: '#64748b', fontSize: 14 },
  summaryValue: { color: '#334155', fontSize: 14, fontWeight: '600' },
  freeShipping: { color: '#047857' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 6 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 20 },
  totalLabel: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  totalValue: { color: '#0f172a', fontSize: 21, fontWeight: '800' },
  checkoutButton: { backgroundColor: '#0f3d5e', borderRadius: 8, minHeight: 50, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  checkoutText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkoutArrow: { color: '#fff', fontSize: 17 },
  secureNote: { color: '#64748b', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 13 },
  emptyContainer: { flex: 1, backgroundColor: '#f4f6f8', alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { color: '#0f172a', fontSize: 26, fontWeight: '800', marginBottom: 8 },
  emptySub: { color: '#64748b', fontSize: 15, textAlign: 'center', maxWidth: 360, lineHeight: 22, marginBottom: 22 },
  secondaryButton: { backgroundColor: '#0f3d5e', paddingVertical: 13, paddingHorizontal: 20, borderRadius: 8 },
  secondaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
