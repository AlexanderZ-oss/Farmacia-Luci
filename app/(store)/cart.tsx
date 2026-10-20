import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Platform, Image,
} from 'react-native';
import { useCartStore } from '../../stores/cartStore';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

export default function CartScreen() {
  const { items, removeItem, updateQuantity, getTotal } = useCartStore();
  const { session } = useAuthStore();
  const router   = useRouter();
  const subtotal  = getTotal();
  const shipping  = subtotal >= 50 ? 0 : 5;

  const handleCheckout = () => {
    if (!session) {
      router.push('/(auth)/login?mode=register&returnTo=checkout');
      return;
    }
    router.push('/(store)/checkout');
  };

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <View style={s.emptyIconBox}>
          <Ionicons name="cart-outline" size={44} color={C.green} />
        </View>
        <Text style={s.emptyTitle}>Tu carrito está vacío</Text>
        <Text style={s.emptySub}>
          Explora nuestro catálogo y agrega los productos que necesitas.
        </Text>
        <TouchableOpacity
          style={s.exploreBtn}
          onPress={() => router.push('/(store)/catalog')}
          accessibilityRole="button"
        >
          <Text style={s.exploreBtnText}>Explorar catálogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      {/* Page header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.eyebrow}>TU COMPRA</Text>
          <Text style={s.title}>Carrito</Text>
          <Text style={s.subtitle}>
            {items.reduce((c, i) => c + i.quantity, 0)} unidades · {items.length} productos
          </Text>
        </View>
        <TouchableOpacity
          style={s.continueBtn}
          onPress={() => router.push('/(store)/catalog')}
          accessibilityRole="button"
        >
          <Text style={s.continueBtnText}>Seguir comprando</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Items ─────────────────────────────────────── */}
        <View style={s.itemsColumn}>
          {items.map((item) => (
            <View key={item.product.id} style={s.itemCard}>
              {/* Thumbnail */}
              <View style={s.thumb}>
                {item.product.image_url ? (
                  <Image
                    source={{ uri: item.product.image_url }}
                    style={s.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="medkit-outline" size={28} color={C.textLight} />
                )}
              </View>

              {/* Info */}
              <View style={s.itemInfo}>
                <Text style={s.itemName} numberOfLines={2}>{item.product.name}</Text>
                <Text style={s.itemUnit}>S/ {Number(item.product.price).toFixed(2)} / u.</Text>
                <View style={s.qtyControl}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Reducir cantidad de ${item.product.name}`}
                    style={s.qtyBtn}
                    onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color={C.textMid} />
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Aumentar cantidad de ${item.product.name}`}
                    style={s.qtyBtn}
                    onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color={C.textMid} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Trailing */}
              <View style={s.itemTrailing}>
                <Text style={s.lineTotal}>
                  S/ {(Number(item.product.price) * item.quantity).toFixed(2)}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ${item.product.name} del carrito`}
                  onPress={() => removeItem(item.product.id)}
                  style={s.removeBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={C.textLight} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* ── Summary ──────────────────────────────────── */}
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

          {subtotal < 50 && (
            <View style={s.shippingHint}>
              <Text style={s.shippingHintText}>
                Agrega S/ {(50 - subtotal).toFixed(2)} más para envío gratis
              </Text>
            </View>
          )}

          <View style={s.divider} />

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total estimado</Text>
            <Text style={s.totalValue}>S/ {(subtotal + shipping).toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={s.checkoutBtn}
            onPress={handleCheckout}
            activeOpacity={0.87}
            accessibilityRole="button"
            accessibilityLabel={session ? 'Continuar al pago' : 'Crear cuenta y continuar'}
          >
            <Text style={s.checkoutBtnText}>
              {session ? 'Continuar al pago' : 'Crear cuenta y continuar'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={C.white} />
          </TouchableOpacity>

          <View style={s.secureNoteRow}>
            <Ionicons name="lock-closed-outline" size={12} color={C.textLight} />
            <Text style={s.secureNote}>
              El pedido se confirmará después de verificar el pago.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bgPage },

  // ── Empty
  emptyContainer: {
    flex: 1,
    backgroundColor: C.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconBox: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  emptyTitle: { color: C.text, fontSize: 22, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  emptySub: {
    color: C.textMid,
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreBtn: {
    backgroundColor: C.green,
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
  },
  exploreBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

  // ── Page header
  pageHeader: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 24 : 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  eyebrow:     { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 4 },
  title:       { color: C.text,  fontSize: 26, fontWeight: '700', letterSpacing: -0.4 },
  subtitle:    { color: C.textMid, fontSize: 13, marginTop: 4 },
  continueBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    minHeight: 44,
    justifyContent: 'center',
  },
  continueBtnText: { color: C.textMid, fontSize: 13, fontWeight: '600' },

  scroll:   { flex: 1 },
  content:  {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: 'flex-start',
    gap: 16,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Items
  itemsColumn: { width: Platform.OS === 'web' ? '60%' : '100%' },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: C.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  thumbImage:    { width: '100%', height: '100%' },
  itemInfo:      { flex: 1, minWidth: 0 },
  itemName:      { color: C.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  itemUnit:      { color: C.textMid, fontSize: 12, marginTop: 4 },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgSubtle,
  },
  qtyNum: {
    minWidth: 36,
    textAlign: 'center',
    color: C.text,
    fontSize: 14,
    fontWeight: '800',
  },
  itemTrailing: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  lineTotal:   { color: C.text, fontSize: 15, fontWeight: '700' },
  removeBtn:   { padding: 6, marginTop: 8 },

  // ── Summary
  summary: {
    width: Platform.OS === 'web' ? '38%' : '100%',
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 18, letterSpacing: 0.2 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: { color: C.textMid, fontSize: 14 },
  summaryValue: { color: C.text,    fontSize: 14, fontWeight: '600' },
  freeShipping: { color: C.green },

  shippingHint: {
    backgroundColor: C.greenLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  shippingHintText: { color: C.green, fontSize: 12, fontWeight: '600', textAlign: 'center' },

  divider:    { height: 1, backgroundColor: C.border, marginVertical: 12 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  totalLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  totalValue: { color: C.green, fontSize: 22, fontWeight: '700' },

  checkoutBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.green,
    borderRadius: 10,
    minHeight: 50,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: { color: C.white, fontSize: 14.5, fontWeight: '700', letterSpacing: 0.2 },
  secureNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  secureNote: { color: C.textLight, fontSize: 11, lineHeight: 17, textAlign: 'center', flex: 1 },
});
