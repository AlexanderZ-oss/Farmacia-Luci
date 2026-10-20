import { Slot, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { C, IconName } from '../../lib/theme';

type Tab = { icon: IconName; label: string; active: boolean; onPress: () => void };

/**
 * Soporte es compartido: administradores y clientes entran desde la tienda/admin;
 * cajero e inventario entran como pestaña de su propio panel. Este layout dibuja
 * el header con las pestañas del rol para cada caso.
 */
export default function SupportLayout() {
  const { signOut, role } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isCashier = role === 'cashier';
  const isStockerRole = role === 'stocker';

  const headerTitle = isCashier
    ? 'Punto de venta · Cajero'
    : isStockerRole
      ? 'Panel de inventario'
      : role === 'admin'
        ? 'Mesa de ayuda'
        : 'Ayuda y soporte';

  const roleLabel = role === 'admin' ? 'ADMIN' : isCashier ? 'CAJERO' : isStockerRole ? 'INVENTARIO' : 'SOPORTE';

  const backToPanel = () => {
    if (role === 'admin') router.replace('/(admin)');
    else if (role === 'stocker') router.replace('/(stocker)');
    else if (role === 'cashier') router.replace('/(cashier)');
    else router.replace('/(store)');
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 14 }]}>
        <View style={s.headerTop}>
          <View style={s.logoRow}>
            <View style={s.logoBox}>
              <Ionicons name="medkit" size={20} color={C.white} />
            </View>
            <View>
              <Text style={s.logoTitle}>Farmacia Luci</Text>
              <Text style={s.logoSub}>{headerTitle}</Text>
            </View>
          </View>

          <View style={s.rightArea}>
            <View style={s.roleBadge}>
              <View style={s.roleDot} />
              <Text style={s.roleText}>{roleLabel}</Text>
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
          {isCashier ? (
            <>
              <TabItem icon="cart-outline" label="POS" active={false} onPress={() => router.replace('/(cashier)')} />
              <TabItem icon="receipt-outline" label="Recibos" active={false} onPress={() => router.push('/(cashier)/receipts')} />
              <TabItem icon="chatbubbles-outline" label="Soporte" active onPress={() => router.push('/(support)/tickets')} />
            </>
          ) : isStockerRole ? (
            <>
              <TabItem icon="grid-outline" label="Panel" active={false} onPress={() => router.replace('/(stocker)')} />
              <TabItem icon="list-outline" label="Productos" active={false} onPress={() => router.push('/(stocker)/products')} />
              <TabItem icon="add-circle-outline" label="Agregar" active={false} onPress={() => router.push('/(stocker)/product-form')} />
              <TabItem icon="swap-vertical-outline" label="Stock" active={false} onPress={() => router.push('/(stocker)/stock')} />
              <TabItem icon="chatbubbles-outline" label="Soporte" active onPress={() => router.push('/(support)/tickets')} />
            </>
          ) : (
            <TabItem icon="chatbubbles-outline" label={role === 'admin' ? 'Soporte' : 'Ayuda'} active onPress={() => router.push('/(support)/tickets')} />
          )}
        </View>
      </View>

      {/* Content */}
      <View style={s.content}>
        <Slot />
      </View>
    </View>
  );
}

function TabItem({ icon, label, active, onPress }: Tab) {
  return (
    <TouchableOpacity
      style={[s.tab, active && s.tabActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={16} color={active ? C.green : C.textLight} />
      <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
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
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: C.green,
    justifyContent: 'center', alignItems: 'center',
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
