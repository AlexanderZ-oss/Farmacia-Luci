import { Slot } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';

export default function StoreLayout() {
  const { session, signOut } = useAuthStore();
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/(store)')} activeOpacity={0.8}>
          <View style={s.logoRow}>
            <View style={s.logoDot} />
            <Text style={s.logoText}>Farmacia Luci</Text>
          </View>
        </TouchableOpacity>
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.push('/(store)/catalog')} style={s.navItem}>
            <Text style={s.navText}>Catálogo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(store)/cart')} style={s.navItem}>
            <Text style={s.navText}>🛒</Text>
          </TouchableOpacity>
          {session ? (
            <>
              <TouchableOpacity onPress={() => router.push('/(store)/orders')} style={s.navItem}>
                <Text style={s.navText}>Pedidos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => signOut()} style={s.authBtn}>
                <Text style={s.authBtnText}>Salir</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={s.authBtn}>
              <Text style={s.authBtnText}>Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Slot />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#0f172a',
    paddingTop: 48,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.1)',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6' },
  logoText: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  navItem: { paddingHorizontal: 10, paddingVertical: 6 },
  navText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  authBtn: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  authBtnText: { color: '#60a5fa', fontSize: 13, fontWeight: '600' },
});
