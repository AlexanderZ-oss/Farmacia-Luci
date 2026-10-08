import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function StockerDashboard() {
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuthStore();
  const router = useRouter();

  useEffect(() => { fetchLowStock(); }, []);

  async function fetchLowStock() {
    const { data } = await supabase.from('products').select('id, name, stock, min_stock').lt('stock', 10).order('stock', { ascending: true });
    setLowStock(data || []);
    setLoading(false);
  }

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <View style={s.container}>
        <Text style={s.title}>Panel de Inventario</Text>

        <View style={s.grid}>
          <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/(stocker)/products')} activeOpacity={0.8}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(59,130,246,0.2)' }]}><Text style={s.icon}>📦</Text></View>
            <Text style={s.actionText}>Ver Productos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => router.push('/(stocker)/product-form')} activeOpacity={0.8}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(16,185,129,0.2)' }]}><Text style={s.icon}>➕</Text></View>
            <Text style={s.actionText}>Nuevo Producto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.actionBtn, { minWidth: '100%' }]} onPress={() => router.push('/(stocker)/stock')} activeOpacity={0.8}>
            <View style={[s.iconBox, { backgroundColor: 'rgba(139,92,246,0.2)' }]}><Text style={s.icon}>🔄</Text></View>
            <Text style={s.actionText}>Ajuste de Stock Rápido</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>⚠️ Alertas de Stock Bajo</Text>
        <View style={s.listContainer}>
          {loading ? <ActivityIndicator color="#3b82f6" style={{ marginTop: 20 }} /> : (
            <FlatList
              data={lowStock}
              keyExtractor={(i) => i.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={s.card}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <View style={[s.stockBadge, item.stock <= (item.min_stock || 5) ? s.stockBadgeDanger : s.stockBadgeWarn]}>
                    <Text style={[s.cardStock, item.stock <= (item.min_stock || 5) ? { color: '#fca5a5' } : { color: '#fde047' }]}>
                      Stock: {item.stock}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={s.empty}>No hay alertas de stock bajo 🎉</Text>}
            />
          )}
        </View>

        <TouchableOpacity style={s.logoutBtn} onPress={() => signOut()} activeOpacity={0.8}>
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(59,130,246,0.1)', top: -100, right: -50 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(239,68,68,0.08)', bottom: 100, left: -50 },
  container: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9', marginBottom: 24, letterSpacing: 0.5 },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  actionBtn: { 
    flex: 1, minWidth: '45%', 
    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
    padding: 16, borderRadius: 16, 
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)',
    alignItems: 'center', flexDirection: 'row', gap: 12
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 16 },
  actionText: { fontSize: 14, color: '#f1f5f9', fontWeight: '600', flex: 1 },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9', marginBottom: 16 },
  listContainer: { flex: 1 },
  card: { 
    backgroundColor: 'rgba(30, 41, 59, 0.7)', 
    padding: 16, borderRadius: 16, marginBottom: 12, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' 
  },
  cardName: { fontWeight: '600', color: '#e2e8f0', fontSize: 15, flex: 1 },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  stockBadgeDanger: { backgroundColor: 'rgba(220,38,38,0.2)' },
  stockBadgeWarn: { backgroundColor: 'rgba(202,138,4,0.2)' },
  cardStock: { fontWeight: '700', fontSize: 13 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 32, fontSize: 15 },
  
  logoutBtn: { 
    backgroundColor: 'rgba(239,68,68,0.1)', 
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
    padding: 16, borderRadius: 14, 
    alignItems: 'center', marginTop: 16 
  },
  logoutText: { color: '#fca5a5', fontWeight: '700', fontSize: 15 },
});
