import { Slot, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CashierLayout() {
  const { signOut, session, role } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (role && role !== 'cashier') {
      router.replace('/(store)');
      return;
    }

    // Slide-in header
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();

    // Pulse animation for active badge
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const isMain = pathname === '/(cashier)' || pathname === '/(cashier)/index';
  const isReceipts = pathname.includes('receipts');

  return (
    <View style={s.container}>
      {/* Animated Header */}
      <Animated.View style={[s.header, { paddingTop: insets.top + 12, transform: [{ translateY: slideAnim }] }]}>
        {/* Background decorations */}
        <View style={s.headerCircle1} />
        <View style={s.headerCircle2} />

        <View style={s.headerTop}>
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Text style={s.logoEmoji}>💊</Text>
            </View>
            <View>
              <Text style={s.logoTitle}>Farmacia Luci</Text>
              <Text style={s.logoSub}>Punto de Venta</Text>
            </View>
          </View>

          <View style={s.rightArea}>
            <Animated.View style={[s.roleBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={s.roleDot} />
              <Text style={s.roleText}>CAJERO</Text>
            </Animated.View>
            <TouchableOpacity style={s.logoutBtn} onPress={() => signOut()}>
              <Text style={s.logoutText}>🚪</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nav Tabs */}
        <View style={s.navTabs}>
          <TouchableOpacity
            style={[s.tab, isMain && s.tabActive]}
            onPress={() => router.replace('/(cashier)')}
          >
            <Text style={s.tabIcon}>🛒</Text>
            <Text style={[s.tabText, isMain && s.tabTextActive]}>POS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, isReceipts && s.tabActive]}
            onPress={() => router.push('/(cashier)/receipts')}
          >
            <Text style={s.tabIcon}>🧾</Text>
            <Text style={[s.tabText, isReceipts && s.tabTextActive]}>Recibos</Text>
          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#0f172a' },

  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,158,11,0.2)',
    overflow: 'hidden',
    zIndex: 10,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  headerCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(245,158,11,0.08)', top: -60, right: -40,
  },
  headerCircle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(59,130,246,0.06)', top: -30, left: 60,
  },

  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
  },
  logoEmoji: { fontSize: 22 },
  logoTitle: { color: '#f1f5f9', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  logoSub: { color: '#64748b', fontSize: 12, fontWeight: '500', marginTop: 1 },

  rightArea: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)',
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b' },
  roleText: { color: '#fbbf24', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)',
  },
  logoutText: { fontSize: 16 },

  navTabs: { flexDirection: 'row', gap: 4, paddingBottom: 0 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, gap: 6, borderRadius: 0,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#f59e0b' },
  tabIcon: { fontSize: 14 },
  tabText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#fbbf24', fontWeight: '700' },

  content: { flex: 1 },
});
