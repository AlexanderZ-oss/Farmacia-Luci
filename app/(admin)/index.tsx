import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';

export default function AdminDashboard() {
  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>Panel General</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
        </View>

        <View style={s.grid}>
          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
              <Text style={s.icon}>💰</Text>
            </View>
            <Text style={s.statLabel}>Ventas del Día</Text>
            <Text style={s.statValue}>S/ 2,450.00</Text>
            <Text style={s.statTrendPos}>+12.5% vs ayer</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(239,68,68,0.2)' }]}>
              <Text style={s.icon}>📦</Text>
            </View>
            <Text style={s.statLabel}>Alertas Stock</Text>
            <Text style={s.statValue}>18 items</Text>
            <Text style={s.statTrendNeg}>Requieren atención</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
              <Text style={s.icon}>👥</Text>
            </View>
            <Text style={s.statLabel}>Nuevos Usuarios</Text>
            <Text style={s.statValue}>42</Text>
            <Text style={s.statTrendPos}>+5.2% vs semana ant.</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Actividad Reciente</Text>
          <View style={s.activityCard}>
            <View style={s.activityItem}>
              <View style={s.activityDot} />
              <View style={s.activityContent}>
                <Text style={s.activityText}><Text style={{fontWeight: 'bold', color: '#f1f5f9'}}>Cajero Juan</Text> procesó venta #0042</Text>
                <Text style={s.activityTime}>Hace 5 min</Text>
              </View>
            </View>
            <View style={s.activityItem}>
              <View style={[s.activityDot, {backgroundColor: '#f59e0b'}]} />
              <View style={s.activityContent}>
                <Text style={s.activityText}><Text style={{fontWeight: 'bold', color: '#f1f5f9'}}>Sistema</Text> detectó stock bajo en Paracetamol</Text>
                <Text style={s.activityTime}>Hace 15 min</Text>
              </View>
            </View>
            <View style={s.activityItem}>
              <View style={[s.activityDot, {backgroundColor: '#10b981'}]} />
              <View style={s.activityContent}>
                <Text style={s.activityText}><Text style={{fontWeight: 'bold', color: '#f1f5f9'}}>Nuevo Usuario</Text> registrado (luis@...)</Text>
                <Text style={s.activityTime}>Hace 1 hora</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(59,130,246,0.1)', top: -80, left: -60 },
  circle2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(139,92,246,0.1)', bottom: 60, right: -40 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', color: '#f1f5f9', marginBottom: 4, letterSpacing: 0.5 },
  date: { fontSize: 14, color: '#94a3b8', textTransform: 'capitalize' },

  grid: { flexDirection: 'row', gap: 16, marginBottom: 32, flexWrap: 'wrap' },
  statCard: { 
    minWidth: '45%', flex: 1, 
    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
    borderRadius: 20, padding: 20, 
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)',
  },
  iconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  icon: { fontSize: 20 },
  statLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 8 },
  statTrendPos: { color: '#34d399', fontSize: 13, fontWeight: '600' },
  statTrendNeg: { color: '#f87171', fontSize: 13, fontWeight: '600' },

  section: { marginTop: 10, marginBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 16 },
  activityCard: { 
    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
    borderRadius: 20, padding: 24, 
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)',
  },
  activityItem: { flexDirection: 'row', marginBottom: 20 },
  activityDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3b82f6', marginTop: 5, marginRight: 16 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, color: '#cbd5e1', lineHeight: 22 },
  activityTime: { fontSize: 12, color: '#64748b', marginTop: 4 },
});
