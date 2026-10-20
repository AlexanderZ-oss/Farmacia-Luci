import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, ScrollView, Alert,
} from 'react-native';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { C, IconName } from '../../lib/theme';

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

    const spin = Animated.loop(
      Animated.timing(rotateAnim, { toValue: 1, duration: 3000, useNativeDriver: true })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [productsRes, settingRes] = await Promise.all([
      supabase.from('products').select('id, name, is_active, stock, min_stock').order('id').range(0, 499),
      supabase.from('pharmacy_settings').select('setting_value').eq('setting_key', 'low_stock_threshold').maybeSingle(),
    ]);
    if (productsRes.error || settingRes.error) {
      Alert.alert('No se pudo cargar el inventario', productsRes.error?.message || settingRes.error?.message);
      setLoading(false);
      return;
    }
    const products = [...(productsRes.data || [])];
    for (let from = 500; products.length === from; from += 500) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, is_active, stock, min_stock')
        .order('id')
        .range(from, from + 499);
      if (error) {
        Alert.alert('No se pudo cargar el inventario', error.message);
        setLoading(false);
        return;
      }
      products.push(...(data || []));
      if ((data || []).length < 500) break;
    }
    const globalThreshold = Number(settingRes.data?.setting_value ?? 5);
    if (!Number.isInteger(globalThreshold) || globalThreshold < 0) {
      Alert.alert('Configuración inválida', 'El umbral global de stock bajo debe ser un entero igual o mayor que cero.');
      setLoading(false);
      return;
    }
    const lowProducts = products
      .filter(product => product.is_active && product.stock <= Math.max(globalThreshold, product.min_stock ?? globalThreshold))
      .sort((a, b) => a.stock - b.stock);
    setLowStock(lowProducts.slice(0, 20));
    setStats({
      total: products.length,
      active: products.filter(p => p.is_active).length,
      lowStockCount: lowProducts.length,
    });
    setLoading(false);
  }

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const actions: { icon: IconName; label: string; route: string }[] = [
    { icon: 'list-outline',      label: 'Ver productos',     route: '/(stocker)/products' },
    { icon: 'add-circle-outline',label: 'Nuevo producto',    route: '/(stocker)/product-form' },
    { icon: 'swap-vertical-outline', label: 'Ajuste de stock', route: '/(stocker)/stock' },
  ];

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeAnim }]}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* Welcome Banner */}
          <View style={s.banner}>
            <View style={s.bannerLeft}>
              <Text style={s.eyebrow}>INVENTARIO</Text>
              <Text style={s.bannerTitle}>Panel de inventario</Text>
              <Text style={s.bannerSub}>Gestión de productos y stock</Text>
            </View>
            <TouchableOpacity
              style={s.refreshBtn}
              onPress={fetchData}
              accessibilityRole="button"
              accessibilityLabel="Actualizar inventario"
            >
              <Animated.View style={{ transform: [{ rotate: loading ? spin : '0deg' }] }}>
                <Ionicons name="refresh-outline" size={18} color={C.greenDark} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          {loading ? (
            <ActivityIndicator color={C.green} style={{ marginBottom: 24 }} />
          ) : (
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Ionicons name="list-outline" size={19} color={C.accent} />
                <Text style={s.statVal}>{stats.total}</Text>
                <Text style={s.statLbl}>Total</Text>
              </View>
              <View style={s.statCard}>
                <Ionicons name="checkmark-circle-outline" size={19} color={C.greenDark} />
                <Text style={[s.statVal, { color: C.greenDark }]}>{stats.active}</Text>
                <Text style={s.statLbl}>Activos</Text>
              </View>
              <View style={s.statCard}>
                <Ionicons name="alert-circle-outline" size={19} color={C.amber} />
                <Text style={[s.statVal, { color: '#92400E' }]}>{stats.lowStockCount}</Text>
                <Text style={s.statLbl}>Stock bajo</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <Text style={s.sectionTitle}>Acciones rápidas</Text>
          <View style={s.grid}>
            {actions.map((a, idx) => (
              <TouchableOpacity
                key={idx}
                style={s.actionBtn}
                onPress={() => router.push(a.route as any)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={a.label}
              >
                <View style={s.actionIcon}>
                  <Ionicons name={a.icon} size={19} color={C.greenDark} />
                </View>
                <Text style={s.actionText}>{a.label}</Text>
                <Ionicons name="chevron-forward" size={17} color={C.textLight} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Low Stock List */}
          <View style={s.alertHeader}>
            <Ionicons name="alert-circle-outline" size={17} color={C.amber} />
            <Text style={s.sectionTitle}>Alertas de stock bajo</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={C.amber} style={{ marginTop: 20 }} />
          ) : lowStock.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="checkmark-circle-outline" size={40} color={C.green} />
              <Text style={s.emptyText}>Todo el stock está en orden</Text>
            </View>
          ) : (
            <View style={s.alertList}>
              {lowStock.map(item => {
                const isDanger = item.stock <= (item.min_stock || 5);
                return (
                  <View key={item.id} style={[s.alertCard, isDanger ? s.alertCardDanger : s.alertCardWarn]}>
                    <View style={s.alertCardLeft}>
                      <View style={[s.alertDot, { backgroundColor: isDanger ? C.red : C.amber }]} />
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
  wrapper: { flex: 1, backgroundColor: C.bgPage },
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 44, maxWidth: 980, width: '100%', alignSelf: 'center' },

  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  bannerLeft: { flex: 1 },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  bannerTitle: { fontSize: 23, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  bannerSub: { fontSize: 13, color: C.textMid, marginTop: 5 },
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

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 18,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 7,
  },
  statVal: { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  statLbl: {
    fontSize: 11,
    color: C.textMid,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  grid: { gap: 10, marginBottom: 28, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { flex: 1, fontSize: 15, color: C.text, fontWeight: '700' },

  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  alertList: { gap: 8 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertCardDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  alertCardWarn: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  alertCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertName: { fontSize: 14, color: C.text, fontWeight: '600', flex: 1 },
  alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeWarn: { backgroundColor: '#FEF3C7' },
  alertStock: { fontSize: 13, fontWeight: '700' },
  stockDanger: { color: '#991B1B' },
  stockWarn: { color: '#92400E' },

  emptyBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: C.textMid, fontWeight: '600' },
});
