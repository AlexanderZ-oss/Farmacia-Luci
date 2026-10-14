import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAV_ITEMS = [
  { icon: '📊', label: 'Dashboard', route: '/(admin)', matchKey: 'index' },
  { icon: '👥', label: 'Usuarios', route: '/(admin)/users', matchKey: 'users' },
  { icon: '📈', label: 'Reportes', route: '/(admin)/reports', matchKey: 'reports' },
  { icon: '⚙️', label: 'Config.', route: '/(admin)/settings', matchKey: 'settings' },
];

export default function AdminLayout() {
  const { signOut, role } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (role && role !== 'admin') {
      router.replace('/(store)');
      return;
    }

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const isActive = (key: string) => {
    if (key === 'index') return pathname === '/(admin)' || pathname === '/(admin)/index';
    return pathname.includes(key);
  };

  return (
    <View style={s.container}>
      {/* Sidebar */}
      <Animated.View style={[s.sidebar, { transform: [{ translateX: slideAnim }], paddingTop: insets.top + 16 }]}>
        {/* Decorative circles */}
        <View style={s.sideCircle1} />
        <View style={s.sideCircle2} />

        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>🛡️</Text>
          </View>
          <View>
            <Text style={s.logoText}>Farmacia Luci</Text>
            <Animated.View style={[s.roleBadge, { transform: [{ scale: pulseAnim }] }]}>
              <View style={s.roleDot} />
              <Text style={s.roleText}>ADMIN</Text>
            </Animated.View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Navigation */}
        <View style={s.navGroup}>
          <Text style={s.navGroupLabel}>MENÚ PRINCIPAL</Text>
          {NAV_ITEMS.map((item, idx) => {
            const active = isActive(item.matchKey);
            return (
              <TouchableOpacity
                key={idx}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
              >
                <View style={[s.navIconBox, active && s.navIconBoxActive]}>
                  <Text style={s.navIcon}>{item.icon}</Text>
                </View>
                <Text style={[s.navText, active && s.navTextActive]}>{item.label}</Text>
                {active && <View style={s.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom area */}
        <View style={s.sidebarBottom}>
          <View style={s.divider} />
          <View style={s.userInfo}>
            <View style={s.avatarBox}>
              <Text style={s.avatarText}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>Administrador</Text>
              <Text style={s.userEmail}>admin@gmail.com</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={signOut} activeOpacity={0.8}>
            <Text style={s.logoutIcon}>🚪</Text>
            <Text style={s.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Main Content */}
      <View style={s.mainContent}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#0f172a' },

  sidebar: {
    width: 240,
    backgroundColor: '#0a0f1e',
    paddingHorizontal: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: 'rgba(59,130,246,0.15)',
    overflow: 'hidden',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  sideCircle1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(59,130,246,0.06)', top: -60, right: -60,
  },
  sideCircle2: {
    position: 'absolute', width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(139,92,246,0.05)', bottom: 80, left: -40,
  },

  logoArea: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  logoBox: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  logoEmoji: { fontSize: 24 },
  logoText: { color: '#f8fafc', fontSize: 15, fontWeight: '800', letterSpacing: 0.3, marginBottom: 4 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.35)',
    alignSelf: 'flex-start',
  },
  roleDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3b82f6' },
  roleText: { color: '#60a5fa', fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  divider: { height: 1, backgroundColor: 'rgba(148,163,184,0.1)', marginVertical: 12 },

  navGroup: { flex: 1, gap: 4 },
  navGroupLabel: { color: '#334155', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, position: 'relative',
  },
  navItemActive: { backgroundColor: 'rgba(59,130,246,0.12)' },
  navIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center', alignItems: 'center',
  },
  navIconBoxActive: { backgroundColor: 'rgba(59,130,246,0.15)' },
  navIcon: { fontSize: 16 },
  navText: { color: '#64748b', fontSize: 14, fontWeight: '600', flex: 1 },
  navTextActive: { color: '#93c5fd', fontWeight: '700' },
  activeIndicator: {
    position: 'absolute', right: 0, top: '20%',
    width: 3, height: '60%', borderRadius: 2,
    backgroundColor: '#3b82f6',
  },

  sidebarBottom: {},
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingVertical: 8 },
  avatarBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(59,130,246,0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)',
  },
  avatarText: { fontSize: 16 },
  userName: { color: '#e2e8f0', fontSize: 13, fontWeight: '700' },
  userEmail: { color: '#475569', fontSize: 11, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, gap: 10,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
  },
  logoutIcon: { fontSize: 16 },
  logoutText: { color: '#fca5a5', fontSize: 14, fontWeight: '600' },

  mainContent: { flex: 1, backgroundColor: '#0f172a' },
});
