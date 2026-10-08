import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform } from 'react-native';
import { useCartStore } from '../../stores/cartStore';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function CartScreen() {
  const { items, removeItem, getTotal } = useCartStore();
  const { session } = useAuthStore();
  const router = useRouter();

  const handleCheckout = () => {
    if (!session) {
      Alert.alert('Inicia Sesión', 'Debes iniciar sesión para comprar.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Ir a Login', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }
    router.push('/(store)/checkout');
  };

  if (items.length === 0) {
    return (
      <View style={s.wrapper}>
        <View style={s.gradientBg}>
          <View style={s.circle1} />
          <View style={s.circle2} />
        </View>
        <View style={s.emptyContainer}>
          <View style={s.emptyCircle}>
            <Text style={s.emptyIcon}>🛒</Text>
          </View>
          <Text style={s.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={s.emptySub}>Agrega productos del catálogo para empezar tu compra</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(store)/catalog')}>
            <Text style={s.emptyBtnText}>Explorar Productos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <View style={s.container}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={s.title}>Mi Carrito</Text>
            <Text style={s.subtitle}>{items.length} producto(s)</Text>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.product.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 250 }}
          renderItem={({ item }) => (
            <View style={s.item}>
              <View style={s.itemIcon}>
                <Text style={{ fontSize: 32 }}>💊</Text>
              </View>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.product.name}</Text>
                <Text style={s.itemMeta}>S/ {Number(item.product.price).toFixed(2)} × {item.quantity}</Text>
              </View>
              <View style={s.itemRight}>
                <Text style={s.itemTotal}>S/ {(Number(item.product.price) * item.quantity).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removeItem(item.product.id)} style={s.removeBtn}>
                  <Text style={s.removeText}>✕ Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <View style={s.footer}>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>S/ {getTotal().toFixed(2)}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Envío</Text>
            <Text style={[s.summaryValue, { color: '#34d399' }]}>{getTotal() >= 50 ? 'GRATIS' : 'S/ 5.00'}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.summaryRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalValue}>S/ {(getTotal() + (getTotal() >= 50 ? 0 : 5)).toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={s.checkoutBtn} onPress={handleCheckout} activeOpacity={0.85}>
            <Text style={s.checkoutText}>Proceder al Pago →</Text>
          </TouchableOpacity>
        </View>
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

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(30,41,59,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' },
  backBtnText: { color: '#f1f5f9', fontSize: 18, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.5 },
  subtitle: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },

  item: {
    backgroundColor: 'rgba(30,41,59,0.6)', padding: 16, borderRadius: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)',
  },
  itemIcon: { width: 60, height: 60, borderRadius: 14, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '700', color: '#f1f5f9', fontSize: 15, marginBottom: 4 },
  itemMeta: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  itemRight: { alignItems: 'flex-end' },
  itemTotal: { fontWeight: '800', color: '#60a5fa', fontSize: 18 },
  removeBtn: { marginTop: 8, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6 },
  removeText: { color: '#fca5a5', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15,23,42,0.95)', padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.1)',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: '#94a3b8', fontSize: 15, fontWeight: '500' },
  summaryValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(148,163,184,0.1)', marginVertical: 14 },
  totalLabel: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  totalValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  checkoutBtn: { backgroundColor: '#3b82f6', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20, shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  checkoutText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(30,41,59,0.8)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 24, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
  emptySub: { fontSize: 15, color: '#94a3b8', textAlign: 'center', marginBottom: 32, maxWidth: 280, lineHeight: 22 },
  emptyBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});
