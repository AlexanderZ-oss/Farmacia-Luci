import { View, Text, StyleSheet } from 'react-native';

export default function ReportsScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Reportes de Ventas</Text>
      <View style={s.card}>
        <Text style={s.cardTitle}>Ventas de Hoy</Text>
        <Text style={s.amount}>S/ 1,250.00</Text>
        <Text style={s.sub}>32 transacciones</Text>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Ventas de la Semana</Text>
        <Text style={s.amount}>S/ 8,430.00</Text>
        <Text style={s.sub}>187 transacciones</Text>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>Producto Más Vendido</Text>
        <Text style={s.amount}>Paracetamol 500mg</Text>
        <Text style={s.sub}>142 unidades esta semana</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { color: '#6b7280', fontSize: 13, marginBottom: 6 },
  amount: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  sub: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
});
