import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Animated, ScrollView,
} from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';

export default function StockerDashboard() {
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, lowStockCount: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
    ]).start();

    // Rotating animation for low stock icon
    const spin = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [lowRes, statsRes] = await Promise.all([
      supabase.from('products').select('id, name, stock, min_stock').lt('stock', 10).order('stock', { ascending: true }).limit(20),
      supabase.from('products').select('id, is_active, stock, min_stock'),
    ]);
    const products = statsRes.data || [];
    setLowStock(lowRes.data || []);
    setStats({
      total: products.length,
      active: products.filter(p => p.is_active).length,
      lowStockCount: products.filter(p => p.stock < (p.min_stock || 5)).length,
    });
    setLoading(false);
  }

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const actions = [
    { icon: '📦', label: 'Ver Productos', color: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.4)', route: '/(stocker)/products' },
    { icon: '➕', label: 'Nuevo Producto', color: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.4)', route: '/(stocker)/product-form' },
    { icon: '🔄', label: 'Ajuste de Stock', color: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.4)', route: '/(stocker)/stock' },
  ];

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeAnim }]}>
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.circle3} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* Welcome Banner */}
          <View style={s.banner}>
            <View style={s.bannerLeft}>
              <Text style={s.bannerTitle}>Panel de Inventario</Text>
              <Text style={s.bannerSub}>Gestión de productos y stock</Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={fetchData}>
              <Animated.Text style={[s.refreshIcon, { transform: [{ rotate: loading ? spin : '0deg' }] }]}>🔄</Animated.Text>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          {loading ? (
            <ActivityIndicator color="#10b981" style={{ marginBottom: 24 }} />
          ) : (
            <View style={s.statsRow}>
              <View style={[s.statCard, { borderColor: 'rgba(59,130,246,0.3)' }]}>
                <Text style={s.statIcon}>📋</Text>
                <Text style={s.statVal}>{stats.total}</Text>
                <Text style={s.statLbl}>Total</Text>
              </View>
              <View style={[s.statCard, { borderColor: 'rgba(16,185,129,0.3)' }]}>
                <Text style={s.statIcon}>✅</Text>
                <Text style={[s.statVal, { color: '#34d399' }]}>{stats.active}</Text>
                <Text style={s.statLbl}>Activos</Text>
              </View>
              <View style={[s.statCard, { borderColor: 'rgba(239,68,68,0.3)' }]}>
                <Text style={s.statIcon}>⚠️</Text>
                <Text style={[s.statVal, { color: '#f87171' }]}>{stats.lowStockCount}</Text>
                <Text style={s.statLbl}>Stock bajo</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <Text style={s.sectionTitle}>Acciones Rápidas</Text>
          <View style={s.grid}>
            {actions.map((a, idx) => (
              <TouchableOpacity
                key={idx}
                style={[s.actionBtn, { borderColor: a.border }]}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.75}
              >
                <View style={[s.actionIcon, { backgroundColor: a.color }]}>
                  <Text style={s.actionEmoji}>{a.icon}</Text>
                </View>
                <Text style={s.actionText}>{a.label}</Text>
                <Text style={s.actionArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Low Stock List */}
          <View style={s.alertHeader}>
            <Animated.Text style={[s.alertIcon, { transform: [{ rotate: spin }] }]}>⚠️</Animated.Text>
            <Text style={s.sectionTitle}>Alertas de Stock Bajo</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#f87171" style={{ marginTop: 20 }} />
          ) : lowStock.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>🎉</Text>
              <Text style={s.emptyText}>¡Todo el stock está en orden!</Text>
            </View>
          ) : (
            <View style={s.alertList}>
              {lowStock.map(item => {
                const isDanger = item.stock <= (item.min_stock || 5);
                return (
                  <View key={item.id} style={[s.alertCard, isDanger ? s.alertCardDanger : s.alertCardWarn]}>
                    <View style={s.alertCardLeft}>
                      <View style={[s.alertDot, { backgroundColor: isDanger ? '#ef4444' : '#f59e0b' }]} />
                      <Text style={s.alertName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <View style={[s.alertBadge, isDanger ? s.badgeDanger : s.badgeWarn]}>
                      <Text style={[s.alertStock, isDanger ? s.stockDanger : s.stockWarn]}>
                        {item.stock} ud.
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#050d17',
  },
  circle1: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(16,185,129,0.1)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(59,130,246,0.08)',
    bottom: 100,
    left: -60,
  },
  circle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139,92,246,0.06)',
    top: '50%',
    right: 20,
  },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: 'rgba(16,185,129,0.08)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    shadowColor: '#10b981',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  bannerLeft: { flex: 1 },
  bannerTitle: { fontSize: 24, fontWeight: '900', color: '#f8fafc', letterSpacing: 0.3 },
  bannerSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  refreshIcon: { fontSize: 20 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statVal: { fontSize: 22, fontWeight: '900', color: '#f8fafc', marginBottom: 2 },
  statLbl: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#dbeafe', letterSpacing: 0.3 },
  grid: { gap: 10, marginBottom: 28, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.82)',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionEmoji: { fontSize: 22 },
  actionText: { flex: 1, fontSize: 15, color: '#e2e8f0', fontWeight: '800' },
  actionArrow: { color: '#64748b', fontSize: 24, fontWeight: '300' },

  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertIcon: { fontSize: 16 },

  alertList: { gap: 8 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  alertCardDanger: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
  alertCardWarn: { backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' },
  alertCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertName: { fontSize: 14, color: '#e2e8f0', fontWeight: '700', flex: 1 },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeDanger: { backgroundColor: 'rgba(239,68,68,0.15)' },
  badgeWarn: { backgroundColor: 'rgba(245,158,11,0.15)' },
  alertStock: { fontSize: 13, fontWeight: '900' },
  stockDanger: { color: '#f87171' },
  stockWarn: { color: '#fbbf24' },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '700' },
});
