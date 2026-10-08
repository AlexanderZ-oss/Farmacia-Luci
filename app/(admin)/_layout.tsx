import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function AdminLayout() {
  const { signOut } = useAuthStore();
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.sidebar}>
        <View style={s.logoArea}>
          <Text style={s.logoEmoji}>🛡️</Text>
          <Text style={s.logoText}>Admin Pro</Text>
        </View>

        <View style={s.navGroup}>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(admin)')}>
            <Text style={s.navIcon}>📊</Text>
            <Text style={s.navText}>Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(admin)/users')}>
            <Text style={s.navIcon}>👥</Text>
            <Text style={s.navText}>Usuarios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(admin)/reports')}>
            <Text style={s.navIcon}>📈</Text>
            <Text style={s.navText}>Reportes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.navItem} onPress={() => router.push('/(admin)/settings')}>
            <Text style={s.navIcon}>⚙️</Text>
            <Text style={s.navText}>Configuración</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
          <Text style={s.logoutIcon}>🚪</Text>
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={s.mainContent}>
        <Slot />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f1f5f9' },
  sidebar: { width: 250, backgroundColor: '#0f172a', paddingVertical: 30, paddingHorizontal: 20, justifyContent: 'space-between' },
  logoArea: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, gap: 10 },
  logoEmoji: { fontSize: 24 },
  logoText: { color: '#f8fafc', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  navGroup: { flex: 1, gap: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
  navIcon: { fontSize: 18, marginRight: 12 },
  navText: { color: '#cbd5e1', fontSize: 15, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.1)' },
  logoutIcon: { fontSize: 18, marginRight: 12 },
  logoutText: { color: '#fca5a5', fontSize: 15, fontWeight: '600' },
  mainContent: { flex: 1, backgroundColor: '#f8fafc' },
});
