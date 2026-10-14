import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ sales: 0, products: 0, lowStock: 0, users: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
    ]).start();
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    try {
      const [prodRes, usersRes, salesRes, settingRes] = await Promise.all([
        supabase.from('products').select('id, stock, min_stock', { count: 'exact' }).eq('is_active', true).order('id').range(0, 499),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('sales').select('id, total_amount, payment_method, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('pharmacy_settings').select('setting_value').eq('setting_key', 'low_stock_threshold').maybeSingle(),
      ]);
      const failed = [prodRes, usersRes, salesRes, settingRes].find((result) => result.error);
      if (failed?.error) throw failed.error;

      const threshold = Number(settingRes.data?.setting_value ?? 5);
      if (!Number.isInteger(threshold) || threshold < 0) throw new Error('El umbral de stock bajo guardado no es válido.');
      const products = [...(prodRes.data ?? [])];
      for (let from = 500; products.length === from; from += 500) {
        const { data, error } = await supabase
          .from('products')
          .select('id, stock, min_stock')
          .eq('is_active', true)
          .order('id')
          .range(from, from + 499);
        if (error) throw error;
        products.push(...(data ?? []));
        if ((data ?? []).length < 500) break;
      }
      const lowStock = products.filter((product) => (
        product.stock <= Math.max(threshold, product.min_stock ?? threshold)
      )).length;

      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      let dayTotal = 0;
      for (let from = 0; ; from += 500) {
        const { data, error } = await supabase
          .from('sales')
          .select('total_amount')
          .eq('status', 'completed')
          .gte('created_at', dayStart.toISOString())
          .range(from, from + 499);
        if (error) throw error;
        const page = data ?? [];
        dayTotal += page.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        if (page.length < 500) break;
      }
      setStats({
        sales: dayTotal,
        products: prodRes.count || 0,
        lowStock,
        users: usersRes.count || 0,
      });
      setRecentSales(salesRes.data || []);
    } catch (error) {
      Alert.alert('No se pudo cargar el panel', error instanceof Error ? error.message : 'Error desconocido');
    }
    setLoading(false);
  }

  const statCards = [
    { icon: '💰', label: 'Ventas de Hoy', value: `S/ ${stats.sales.toFixed(2)}`, trend: 'Ventas completadas', trendPos: true, color: 'rgba(59,130,246,0.2)', border: 'rgba(59,130,246,0.3)' },
    { icon: '⚠️', label: 'Stock Bajo', value: `${stats.lowStock} items`, trend: 'Requieren atención', trendPos: false, color: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.3)' },
    { icon: '📦', label: 'Productos', value: `${stats.products}`, trend: 'Activos', trendPos: true, color: 'rgba(16,185,129,0.2)', border: 'rgba(16,185,129,0.3)' },
    { icon: '👥', label: 'Usuarios', value: `${stats.users}`, trend: 'Registrados', trendPos: true, color: 'rgba(139,92,246,0.2)', border: 'rgba(139,92,246,0.3)' },
  ];
  const quickActions = [
    { icon: '📦', label: 'Editar inventario', route: '/(stocker)/products' },
    { icon: '🛍️', label: 'Gestionar pedidos', route: '/(admin)/orders' },
    { icon: '🎫', label: 'Revisar tickets', route: '/(support)/tickets' },
    { icon: '👥', label: 'Administrar usuarios', route: '/(admin)/users' },
  ];

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeAnim }]}>
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.circle3} />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.greeting}>Bienvenido 👋</Text>
              <Text style={s.title}>Panel de Administración</Text>
              <Text style={s.date}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity style={s.refreshBtn} onPress={fetchStats}>
              <Text style={s.refreshIcon}>🔄</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <Text style={s.sectionTitle}>Resumen del Sistema</Text>
          <View style={s.grid}>
            {statCards.map((card, idx) => (
              <Animated.View
                key={idx}
                style={[
                  s.statCard,
                  { borderColor: card.border },
                  {
                    opacity: fadeAnim,
                    transform: [{
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 + idx * 8, 0],
                      }),
                    }],
                  },
                ]}
              >
                <View style={[s.iconBox, { backgroundColor: card.color }]}>
                  <Text style={s.icon}>{card.icon}</Text>
                </View>
                <Text style={s.statLabel}>{card.label}</Text>
                <Text style={s.statValue}>{loading ? '—' : card.value}</Text>
                <Text style={[s.statTrend, card.trendPos ? s.trendPos : s.trendNeg]}>{card.trend}</Text>
              </Animated.View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Acciones rápidas</Text>
          <View style={s.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity key={action.label} style={s.quickAction} onPress={() => router.push(action.route as never)}>
                <Text style={s.quickActionIcon}>{action.icon}</Text>
                <Text style={s.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Sales */}
          <Text style={s.sectionTitle}>Ventas Recientes</Text>
          <View style={s.activityCard}>
            {loading ? (
              <Text style={s.loadingText}>Cargando...</Text>
            ) : recentSales.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📭</Text>
                <Text style={s.emptyText}>No hay ventas registradas aún</Text>
              </View>
            ) : (
              recentSales.map((sale, idx) => (
                <View key={sale.id} style={[s.activityItem, idx < recentSales.length - 1 && s.itemBorder]}>
                  <View style={[s.activityDot, { backgroundColor: sale.payment_method === 'cash' ? '#10b981' : '#3b82f6' }]} />
                  <View style={s.activityContent}>
                    <Text style={s.activityText}>
                      <Text style={s.activityBold}>{sale.payment_method === 'cash' ? '💵 Efectivo' : '💳 Tarjeta'}</Text>
                      {' — S/ '}{Number(sale.total_amount).toFixed(2)}
                    </Text>
                    <Text style={s.activityTime}>
                      {new Date(sale.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {' · '}{new Date(sale.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </Text>
                  </View>
                  <Text style={s.saleBadge}>#{sale.id.slice(-4).toUpperCase()}</Text>
                </View>
              ))
            )}
          </View>

          {/* Role Reference */}
          <Text style={s.sectionTitle}>Roles del Sistema</Text>
          <View style={s.rolesCard}>
            {[
              { icon: '🛡️', role: 'Admin', desc: 'Acceso total: dashboard, usuarios, reportes, configuración', color: '#60a5fa' },
              { icon: '💳', role: 'Cajero', desc: 'Punto de venta, procesar ventas y ver recibos', color: '#fbbf24' },
              { icon: '📦', role: 'Inventario', desc: 'Gestión de productos, stock y alertas', color: '#34d399' },
              { icon: '🛒', role: 'Cliente', desc: 'Tienda pública: navegar y realizar pedidos', color: '#a78bfa' },
            ].map((r, idx) => (
              <View key={idx} style={[s.roleItem, idx < 3 && s.roleItemBorder]}>
                <Text style={s.roleItemIcon}>{r.icon}</Text>
                <View style={s.roleItemInfo}>
                  <Text style={[s.roleItemTitle, { color: r.color }]}>{r.role}</Text>
                  <Text style={s.roleItemDesc}>{r.desc}</Text>
                </View>
              </View>
            ))}
          </View>

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
    backgroundColor: 'rgba(59,130,246,0.12)',
    top: -100,
    left: -80,
  },
  circle2: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(168,85,247,0.1)',
    bottom: 60,
    right: -60,
  },
  circle3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16,185,129,0.08)',
    top: '35%',
    right: 20,
  },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 60 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 26,
  },
  greeting: { fontSize: 14, color: '#94a3b8', fontWeight: '700', marginBottom: 6 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  date: { fontSize: 13, color: '#94a3b8', textTransform: 'capitalize' },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(96,165,250,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.25)',
  },
  refreshIcon: { fontSize: 20 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 32 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -4, marginBottom: 28 },
  quickAction: { minWidth: 170, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(15,23,42,0.82)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(148,163,184,0.16)' },
  quickActionIcon: { fontSize: 16 },
  quickActionText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  statCard: {
    minWidth: '45%',
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    shadowColor: '#020617',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: { fontSize: 22 },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  statTrend: { fontSize: 12, fontWeight: '700' },
  trendPos: { color: '#34d399' },
  trendNeg: { color: '#f87171' },

  activityCard: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 22,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    marginBottom: 28,
    shadowColor: '#020617',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.08)' },
  activityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, color: '#dbeafe', lineHeight: 20 },
  activityBold: { fontWeight: '800', color: '#f8fafc' },
  activityTime: { fontSize: 12, color: '#64748b', marginTop: 3 },
  saleBadge: { color: '#94a3b8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  loadingText: { color: '#cbd5e1', textAlign: 'center', padding: 20 },
  emptyBox: { alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: '#94a3b8', fontWeight: '700' },

  rolesCard: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 22,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.1)',
    marginBottom: 20,
    shadowColor: '#020617',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  roleItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
  roleItemBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.08)' },
  roleItemIcon: { fontSize: 24, marginTop: 2 },
  roleItemInfo: { flex: 1 },
  roleItemTitle: { fontSize: 14, fontWeight: '900', marginBottom: 3 },
  roleItemDesc: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
});
