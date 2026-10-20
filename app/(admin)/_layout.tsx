import { View, Text, StyleSheet, TouchableOpacity, Animated, ScrollView } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, IconName } from '../../lib/theme';

type NavItem = { icon: IconName; label: string; route: string; matchKey: string };

const NAV_ITEMS: NavItem[] = [
  { icon: 'grid-outline',       label: 'Dashboard',  route: '/(admin)',              matchKey: 'index' },
  { icon: 'cube-outline',       label: 'Inventario', route: '/(stocker)/products',   matchKey: 'products' },
  { icon: 'bag-handle-outline', label: 'Pedidos',    route: '/(admin)/orders',       matchKey: 'orders' },
  { icon: 'people-outline',     label: 'Usuarios',   route: '/(admin)/users',        matchKey: 'users' },
  { icon: 'bar-chart-outline',  label: 'Reportes',   route: '/(admin)/reports',      matchKey: 'reports' },
  { icon: 'chatbubbles-outline',label: 'Soporte',    route: '/(support)/tickets',    matchKey: 'tickets' },
  { icon: 'settings-outline',   label: 'Config.',    route: '/(admin)/settings',     matchKey: 'settings' },
];

export default function AdminLayout() {
  const { signOut } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-280)).current;

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

  const isActive = (key: string) => {
    if (key === 'index') return pathname === '/(admin)' || pathname === '/(admin)/index';
    return pathname.includes(key);
  };

  return (
    <View style={s.container}>
      {/* Sidebar */}
      <Animated.View
        style={[
          s.sidebar,
          { transform: [{ translateX: slideAnim }], paddingTop: insets.top + 20 },
        ]}
      >
        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBox}>
            <Ionicons name="medkit" size={22} color={C.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.logoText}>Farmacia Luci</Text>
            <View style={s.roleBadge}>
              <View style={s.roleDot} />
              <Text style={s.roleText}>ADMIN</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* Navigation */}
        <ScrollView style={s.navScroll} showsVerticalScrollIndicator={false}>
          <Text style={s.navGroupLabel}>MENÚ PRINCIPAL</Text>
          {NAV_ITEMS.map((item, idx) => {
            const active = isActive(item.matchKey);
            return (
              <TouchableOpacity
                key={idx}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => router.push(item.route as any)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={active ? C.green : C.textLight}
                />
                <Text style={[s.navText, active && s.navTextActive]}>{item.label}</Text>
                {active && <View style={s.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Bottom area */}
        <View style={s.sidebarBottom}>
          <View style={s.divider} />
          <View style={s.userInfo}>
            <View style={s.avatarBox}>
              <Ionicons name="person-outline" size={16} color={C.textMid} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>Administrador</Text>
              <Text style={s.userEmail}>admin@gmail.com</Text>
            </View>
          </View>
          <TouchableOpacity
            style={s.logoutBtn}
            onPress={signOut}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
          >
            <Ionicons name="log-out-outline" size={17} color={C.red} />
            <Text style={s.logoutText}>Cerrar sesión</Text>
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
  container: { flex: 1, flexDirection: 'row', backgroundColor: C.bgPage },

  sidebar: {
    width: 248,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: C.border,
  },

  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: -0.2, marginBottom: 4 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.bgSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    alignSelf: 'flex-start',
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  roleText: { color: C.greenDark, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },

  navScroll: { flex: 1 },
  navGroupLabel: {
    color: C.textLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: 10,
    marginLeft: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    position: 'relative',
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: C.greenLight },
  navText: { color: C.textMid, fontSize: 14, fontWeight: '600', flex: 1 },
  navTextActive: { color: C.greenDark, fontWeight: '700' },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: '22%',
    width: 3,
    height: '56%',
    borderRadius: 2,
    backgroundColor: C.green,
  },

  sidebarBottom: {},
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  userName: { color: C.text, fontSize: 13, fontWeight: '700' },
  userEmail: { color: C.textLight, fontSize: 11, marginTop: 1 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 9,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  logoutText: { color: C.red, fontSize: 13, fontWeight: '700' },

  mainContent: { flex: 1, backgroundColor: C.bgPage },
});
