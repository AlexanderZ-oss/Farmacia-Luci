import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, IconName } from '../../lib/theme';

type StatCard = { icon: IconName; label: string; value: string; trend: string; trendPos: boolean; tint: string; tintText: string };

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ sales: 0, products: 0, lowStock: 0, users: 0 });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
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

  const statCards: StatCard[] = [
    { icon: 'cash-outline',        label: 'Ventas de hoy', value: `S/ ${stats.sales.toFixed(2)}`, trend: 'Ventas completadas', trendPos: true,  tint: C.greenLight, tintText: C.greenDark },
    { icon: 'alert-circle-outline', label: 'Stock bajo',   value: `${stats.lowStock} ítems`,      trend: 'Requieren atención', trendPos: false, tint: '#FEF3C7',    tintText: '#92400E' },
    { icon: 'cube-outline',        label: 'Productos',     value: `${stats.products}`,            trend: 'Activos',            trendPos: true,  tint: C.accentLight, tintText: C.accent },
    { icon: 'people-outline',      label: 'Usuarios',      value: `${stats.users}`,               trend: 'Registrados',        trendPos: true,  tint: C.bgSubtle,    tintText: C.textMid },
  ];
  const quickActions: { icon: IconName; label: string; route: string }[] = [
    { icon: 'cube-outline',        label: 'Editar inventario',    route: '/(stocker)/products' },
    { icon: 'bag-handle-outline',  label: 'Gestionar pedidos',    route: '/(admin)/orders' },
    { icon: 'chatbubbles-outline', label: 'Revisar tickets',      route: '/(support)/tickets' },
    { icon: 'people-outline',      label: 'Administrar usuarios', route: '/(admin)/users' },
  ];
  const roles: { icon: IconName; role: string; desc: string }[] = [
    { icon: 'shield-checkmark-outline', role: 'Admin',      desc: 'Acceso total: dashboard, usuarios, reportes, configuración' },
    { icon: 'card-outline',             role: 'Cajero',     desc: 'Punto de venta, procesar ventas y ver recibos' },
    { icon: 'cube-outline',             role: 'Inventario', desc: 'Gestión de productos, stock y alertas' },
    { icon: 'cart-outline',             role: 'Cliente',    desc: 'Tienda pública: navegar y realizar pedidos' },
  ];

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeAnim }]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>PANEL INTERNO</Text>
              <Text style={s.title}>Panel de administración</Text>
              <Text style={s.date}>
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity
              style={s.refreshBtn}
              onPress={fetchStats}
              accessibilityRole="button"
              accessibilityLabel="Actualizar datos"
            >
              <Ionicons name="refresh-outline" size={18} color={C.greenDark} />
            </TouchableOpacity>
          </View>

          {/* Stats Grid */}
          <Text style={s.sectionTitle}>Resumen del sistema</Text>
          <View style={s.grid}>
            {statCards.map((card, idx) => (
              <View key={idx} style={s.statCard}>
                <View style={[s.iconBox, { backgroundColor: card.tint }]}>
                  <Ionicons name={card.icon} size={20} color={card.tintText} />
                </View>
                <Text style={s.statLabel}>{card.label}</Text>
                <Text style={s.statValue}>{loading ? '—' : card.value}</Text>
                <Text style={[s.statTrend, card.trendPos ? s.trendPos : s.trendNeg]}>{card.trend}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>Acciones rápidas</Text>
          <View style={s.quickActions}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={s.quickAction}
                onPress={() => router.push(action.route as never)}
                accessibilityRole="button"
              >
                <Ionicons name={action.icon} size={17} color={C.green} />
                <Text style={s.quickActionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Sales */}
          <Text style={s.sectionTitle}>Ventas recientes</Text>
          <View style={s.activityCard}>
            {loading ? (
              <Text style={s.loadingText}>Cargando...</Text>
            ) : recentSales.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="receipt-outline" size={32} color={C.textLight} style={{ marginBottom: 8 }} />
                <Text style={s.emptyText}>No hay ventas registradas aún</Text>
              </View>
            ) : (
              recentSales.map((sale, idx) => (
                <View key={sale.id} style={[s.activityItem, idx < recentSales.length - 1 && s.itemBorder]}>
                  <Ionicons
                    name={sale.payment_method === 'cash' ? 'cash-outline' : 'card-outline'}
                    size={17}
                    color={C.textMid}
                  />
                  <View style={s.activityContent}>
                    <Text style={s.activityText}>
                      <Text style={s.activityBold}>
                        {sale.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                      </Text>
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
          <Text style={s.sectionTitle}>Roles del sistema</Text>
          <View style={s.rolesCard}>
            {roles.map((r, idx) => (
              <View key={idx} style={[s.roleItem, idx < roles.length - 1 && s.roleItemBorder]}>
                <View style={s.roleItemIconBox}>
                  <Ionicons name={r.icon} size={17} color={C.greenDark} />
                </View>
                <View style={s.roleItemInfo}>
                  <Text style={s.roleItemTitle}>{r.role}</Text>
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
  wrapper: { flex: 1, backgroundColor: C.bgPage },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 60, maxWidth: 1180, width: '100%', alignSelf: 'center' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 16,
  },
  eyebrow: { fontSize: 11, color: C.green, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '700', color: C.text, marginBottom: 6, letterSpacing: -0.4 },
  date: { fontSize: 13, color: C.textMid, textTransform: 'capitalize' },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMid,
    marginBottom: 12,
    letterSpacing: 1.3,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 30 },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  quickAction: {
    minWidth: 180,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickActionText: { color: C.text, fontSize: 13, fontWeight: '600' },
  statCard: {
    minWidth: '45%',
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statLabel: {
    color: C.textMid,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  statValue: { fontSize: 23, fontWeight: '700', color: C.text, marginBottom: 6, letterSpacing: -0.4 },
  statTrend: { fontSize: 12, fontWeight: '600' },
  trendPos: { color: C.greenDark },
  trendNeg: { color: C.amber },

  activityCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 28,
    overflow: 'hidden',
  },
  activityItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  activityContent: { flex: 1 },
  activityText: { fontSize: 14, color: C.textMid, lineHeight: 20 },
  activityBold: { fontWeight: '700', color: C.text },
  activityTime: { fontSize: 12, color: C.textLight, marginTop: 3 },
  saleBadge: { color: C.textLight, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  loadingText: { color: C.textMid, textAlign: 'center', padding: 24 },
  emptyBox: { alignItems: 'center', padding: 36 },
  emptyText: { color: C.textMid, fontWeight: '600' },

  rolesCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  roleItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  roleItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  roleItemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleItemInfo: { flex: 1 },
  roleItemTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  roleItemDesc: { fontSize: 12, color: C.textMid, lineHeight: 18 },
});
