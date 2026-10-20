import { Slot, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, IconName } from '../../lib/theme';

type Tab = { icon: IconName; label: string; active: boolean; onPress: () => void };

export default function CashierLayout() {
  const { signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  // La restricción de acceso por rol se valida en el Root Layout (app/_layout.tsx).
  // No se navega aquí para evitar "navigate before mounting the Root Layout".
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, []);

  const isMain = pathname === '/(cashier)' || pathname === '/(cashier)/index';
  const isReceipts = pathname.includes('receipts');
  const isSupport = pathname.includes('tickets');

  const tabs: Tab[] = [
    { icon: 'cart-outline',         label: 'POS',     active: isMain,     onPress: () => router.replace('/(cashier)') },
    { icon: 'receipt-outline',      label: 'Recibos', active: isReceipts, onPress: () => router.push('/(cashier)/receipts') },
    { icon: 'chatbubbles-outline',  label: 'Soporte', active: isSupport,  onPress: () => router.push('/(support)/tickets') },
  ];

  return (
    <View style={s.container}>
      {/* Header */}
      <Animated.View
        style={[s.header, { paddingTop: insets.top + 14, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={s.headerTop}>
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Ionicons name="medkit" size={20} color={C.white} />
            </View>
            <View>
              <Text style={s.logoTitle}>Farmacia Luci</Text>
              <Text style={s.logoSub}>Punto de venta · Cajero</Text>
            </View>
          </View>

          <View style={s.rightArea}>
            <View style={s.roleBadge}>
              <View style={s.roleDot} />
              <Text style={s.roleText}>CAJERO</Text>
            </View>
            <TouchableOpacity
              style={s.logoutBtn}
              onPress={() => signOut()}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Ionicons name="log-out-outline" size={17} color={C.textMid} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nav Tabs */}
        <View style={s.navTabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.label}
              style={[s.tab, tab.active && s.tabActive]}
              onPress={tab.onPress}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: tab.active }}
            >
              <Ionicons name={tab.icon} size={16} color={tab.active ? C.green : C.textLight} />
              <Text style={[s.tabText, tab.active && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Content */}
      <View style={s.content}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage },

  header: {
    backgroundColor: C.white,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  logoSub: { color: C.textMid, fontSize: 12, fontWeight: '500', marginTop: 1 },

  rightArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.bgSubtle,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 6, borderWidth: 1, borderColor: C.border,
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  roleText: { color: C.greenDark, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  logoutBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },

  navTabs: { flexDirection: 'row', gap: 4 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, gap: 7,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.green },
  tabText: { fontSize: 13, color: C.textMid, fontWeight: '600' },
  tabTextActive: { color: C.greenDark, fontWeight: '700' },

  content: { flex: 1 },
});
