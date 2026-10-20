import { Slot } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/cartStore';
import { C } from '../../lib/theme';

const WHATSAPP_NUMBER = '51999999999'; // Replace with real number
const WHATSAPP_MSG = encodeURIComponent('Hola! Quisiera consultar sobre sus productos.');

export default function StoreLayout() {
  const { session, role } = useAuthStore();
  const router = useRouter();
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((acc, i) => acc + i.quantity, 0);

  const handleLoginPress = () => router.push('/(auth)/login');
  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const handlePanelPress = () => {
    if (role === 'admin') router.push('/(admin)');
    else if (role === 'stocker') router.push('/(stocker)');
    else if (role === 'cashier') router.push('/(cashier)');
  };

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`);
  };

  return (
    <View style={s.container}>
      {/* ── Barra superior institucional ───────────────────── */}
      <View style={s.topBar}>
        <View style={s.topBarInner}>
          <View style={s.topBarItem}>
            <Ionicons name="shield-checkmark-outline" size={13} color={C.onDarkMid} />
            <Text style={s.topBarText}>Venta responsable · Químico farmacéutico responsable</Text>
          </View>

          <View style={s.topBarGroup}>
            <View style={s.topBarItem}>
              <Ionicons name="time-outline" size={13} color={C.onDarkMid} />
              <Text style={s.topBarText}>Lun – Sáb: 8:00 – 21:00</Text>
            </View>
            <View style={s.topBarItem}>
              <Ionicons name="call-outline" size={13} color={C.onDarkMid} />
              <Text style={s.topBarText}>(01) 555-0123</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/(store)')} activeOpacity={0.75}>
          <View style={s.logoRow}>
            <View style={s.logoMark}>
              <Text style={s.logoMarkText}>+</Text>
            </View>
            <View>
              <Text style={s.logoText}>Farmacia Luci</Text>
              <Text style={s.logoSub}>Droguería y farmacia</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={s.navRow}>
          {/* Text links */}
          <TouchableOpacity
            onPress={() => router.push('/(store)')}
            style={s.navItem}
            accessibilityRole="link"
          >
            <Text style={s.navText}>Inicio</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(store)/catalog')}
            style={s.navItem}
            accessibilityRole="link"
          >
            <Text style={s.navText}>Catálogo</Text>
          </TouchableOpacity>

          {session && (
            <TouchableOpacity
              onPress={() => router.push('/(support)/tickets' as never)}
              style={s.navItem}
              accessibilityRole="link"
            >
              <Text style={s.navText}>Soporte</Text>
            </TouchableOpacity>
          )}

          {session && role === 'customer' && (
            <TouchableOpacity
              onPress={() => router.push('/(store)/orders')}
              style={s.navItem}
              accessibilityRole="link"
            >
              <Text style={s.navText}>Mis Pedidos</Text>
            </TouchableOpacity>
          )}

          {/* Acciones */}
          <View style={s.actions}>
            <TouchableOpacity onPress={openWhatsApp} style={s.waBtn} activeOpacity={0.75}
              accessibilityRole="button" accessibilityLabel="Contactar por WhatsApp">
              <Ionicons name="logo-whatsapp" size={16} color="#128C7E" />
              <Text style={s.waBtnText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(store)/cart')}
              style={s.cartBtn}
              activeOpacity={0.75}
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

            {session ? (
              <>
                {(role === 'admin' || role === 'stocker' || role === 'cashier') && (
                  <TouchableOpacity onPress={handlePanelPress} style={s.panelBtn}
                    accessibilityRole="button">
                    <Text style={s.panelBtnText}>Mi Panel</Text>
                    <Ionicons name="open-outline" size={13} color={C.green} />
                  </TouchableOpacity>
                )}

                <TouchableOpacity onPress={handleSignOut} style={s.outBtn}
                  accessibilityRole="button">
                  <Ionicons name="log-out-outline" size={14} color={C.red} />
                  <Text style={s.outBtnText}>Salir</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity onPress={handleLoginPress} style={s.authBtn}
                accessibilityRole="button">
                <Ionicons name="person-outline" size={14} color={C.white} />
                <Text style={s.authBtnText}>Ingresar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <Slot />

      {/* ── Floating WhatsApp CTA ────────────────────────── */}
      <TouchableOpacity
        style={s.fab}
        onPress={openWhatsApp}
        activeOpacity={0.88}
        accessibilityLabel="Contactar por WhatsApp"
        accessibilityRole="button"
      >
        <Ionicons name="logo-whatsapp" size={26} color={C.white} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage },

  // ── Barra superior
  topBar: {
    backgroundColor: C.ink,
    paddingVertical: 7,
    paddingHorizontal: 20,
  },
  topBarInner: {
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  topBarGroup: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  topBarItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarText: { color: C.onDarkMid, fontSize: 11.5, letterSpacing: 0.2 },

  // ── Header
  header: {
    backgroundColor: C.white,
    paddingTop: Platform.OS === 'web' ? 12 : 44,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Logo
  logoRow:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMarkText: { color: C.white, fontSize: 24, fontWeight: '600', marginTop: -2 },
  logoText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  logoSub: {
    color: C.textLight,
    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Nav
  navRow:  { flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' },
  navItem: { paddingHorizontal: 10, paddingVertical: 9, minHeight: 40, justifyContent: 'center' },
  navText: { color: C.textMid, fontSize: 13.5, fontWeight: '600', letterSpacing: 0.2 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 6 },

  // WhatsApp nav button
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 40,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  waBtnText: { color: C.text, fontSize: 13, fontWeight: '600' },

  // Cart
  cartBtn: {
    width: 40,
    height: 40,
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
    top: -7,
    right: -7,
    backgroundColor: C.accent,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.white,
  },
  cartBadgeText: { color: C.white, fontSize: 9.5, fontWeight: '800' },

  // Auth
  authBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.green,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  authBtnText: { color: C.white, fontSize: 13.5, fontWeight: '700' },

  panelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.greenMid,
    minHeight: 40,
    justifyContent: 'center',
  },
  panelBtnText: { color: C.green, fontSize: 13, fontWeight: '700' },

  outBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
  },
  outBtnText: { color: C.red, fontSize: 13, fontWeight: '600' },

  // Floating WhatsApp
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 999,
  },
});
