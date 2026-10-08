import { View, Text, StyleSheet } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Configuración</Text>
      <View style={s.card}>
        <Text style={s.label}>Nombre de la Farmacia</Text>
        <Text style={s.value}>Farmacia Luci</Text>
      </View>
      <View style={s.card}>
        <Text style={s.label}>Dirección</Text>
        <Text style={s.value}>Av. Principal 456, Lima</Text>
      </View>
      <View style={s.card}>
        <Text style={s.label}>Versión de la App</Text>
        <Text style={s.value}>1.0.0</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  label: { color: '#6b7280', fontSize: 12, marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
});
