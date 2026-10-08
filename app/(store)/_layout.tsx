import { Slot } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function StoreLayout() {
  const { session, role } = useAuthStore();
  const router = useRouter();

  const handleLoginPress = () => {
    router.push('/(auth)/login');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePanelPress = () => {
    if (role === 'admin') router.push('/(admin)');
    else if (role === 'stocker') router.push('/(stocker)');
    else if (role === 'cashier') router.push('/(cashier)');
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.push('/(store)')} activeOpacity={0.8}>
          <View style={s.logoRow}>
            <Text style={s.logoEmoji}>💊</Text>
            <Text style={s.logoText}>Farmacia Luci</Text>
          </View>
        </TouchableOpacity>

        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.push('/(store)/catalog')} style={s.navItem}>
            <Text style={s.navText}>Catálogo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(store)/cart')} style={s.navItem}>
            <Text style={s.navText}>🛒 Carrito</Text>
          </TouchableOpacity>

          {session ? (
            <>
              {(role === 'admin' || role === 'stocker' || role === 'cashier') && (
                <TouchableOpacity onPress={handlePanelPress} style={s.panelBtn}>
                  <Text style={s.panelBtnText}>Mi Panel ↗</Text>
                </TouchableOpacity>
              )}
              {role === 'customer' && (
                <TouchableOpacity onPress={() => router.push('/(store)/orders')} style={s.navItem}>
                  <Text style={s.navText}>Mis Pedidos</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleSignOut} style={s.outBtn}>
                <Text style={s.outBtnText}>Salir</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={handleLoginPress} style={s.authBtn}>
              <Text style={s.authBtnText}>🔐 Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Slot />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    backgroundColor: 'rgba(15,23,42,0.97)',
    paddingTop: Platform.OS === 'web' ? 0 : 48,
    paddingBottom: 14,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.12)',
    minHeight: Platform.OS === 'web' ? 64 : 110,
    zIndex: 100,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoEmoji: { fontSize: 22 },
  logoText: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navItem: { paddingHorizontal: 12, paddingVertical: 8 },
  navText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  authBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 10,
    marginLeft: 8,
  },
  authBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  panelBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
    marginLeft: 8,
  },
  panelBtnText: { color: '#34d399', fontSize: 13, fontWeight: '700' },
  outBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    marginLeft: 8,
  },
  outBtnText: { color: '#f87171', fontSize: 13, fontWeight: '600' },
});
