import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

const CATEGORIES = [
  { name: 'Medicamentos', icon: '💊', color: '#60a5fa', bg: 'rgba(96,165,250,0.14)' },
  { name: 'Cosméticos', icon: '✨', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' },
  { name: 'Suplementos', icon: '💪', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  { name: '1ros Auxilios', icon: '🩹', color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  { name: 'Bebés y Mamás', icon: '👶', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  { name: 'Higiene', icon: '🧴', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
];

const FEATURED = [
  { name: 'Paracetamol 500mg', price: 3.5, tag: 'Más vendido', tagColor: '#10b981' },
  { name: 'Protector Solar FPS50', price: 32.0, tag: 'Nuevo', tagColor: '#3b82f6' },
  { name: 'Vitamina C 1000mg', price: 15.0, tag: 'Oferta', tagColor: '#f59e0b' },
];

export default function StoreHome() {
  const router = useRouter();
  const { session, role } = useAuthStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAccountClick = async () => {
    if (!session) {
      router.push('/(auth)/login');
      return;
    }

    if (role === 'admin') {
      router.push('/(admin)');
      return;
    }

    if (role === 'stocker') {
      router.push('/(stocker)');
      return;
    }

    if (role === 'cashier') {
      router.push('/(cashier)');
      return;
    }

    await supabase.auth.signOut();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bgGlow} />
      <View style={styles.bgGlowSecondary} />

      <View style={styles.navbar}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>💊</Text>
          <Text style={styles.logoText}>Luci</Text>
        </View>

        <TouchableOpacity style={styles.accountBtn} onPress={handleAccountClick} activeOpacity={0.88}>
          <Text style={styles.accountBtnText}>
            {session ? (role === 'customer' ? 'Cerrar sesión' : 'Mi panel') : 'Iniciar sesión'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroContent}>
            <Text style={styles.heroTag}>Farmacia online premium</Text>
            <Text style={styles.heroTitle}>{`Tu salud,
Nuestra prioridad`}</Text>
            <Text style={styles.heroText}>
              Medicamentos, suplementos y cuidado personal con entrega rápida y atención de confianza.
            </Text>

            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(store)/catalog')}>
                <Text style={styles.primaryBtnText}>Explorar catálogo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(store)/cart')}>
                <Text style={styles.secondaryBtnText}>Ver carrito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>500+</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24h</Text>
            <Text style={styles.statLabel}>Entrega</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>100%</Text>
            <Text style={styles.statLabel}>Originales</Text>
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Categorías</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={[styles.categoryCard, { backgroundColor: cat.bg }]}
                onPress={() => router.push('/(store)/catalog')}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryName, { color: cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Destacados</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredScroll}>
            {FEATURED.map((item) => (
              <TouchableOpacity key={item.name} style={styles.featuredCard} onPress={() => router.push('/(store)/catalog')} activeOpacity={0.9}>
                <View style={styles.featuredImage}>
                  <Text style={styles.featuredEmoji}>💊</Text>
                  <View style={[styles.badge, { backgroundColor: item.tagColor }]}>
                    <Text style={styles.badgeText}>{item.tag}</Text>
                  </View>
                </View>

                <View style={styles.featuredBody}>
                  <Text style={styles.featuredName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.featuredPrice}>S/ {item.price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionWrap}>
          <View style={styles.promoBanner}>
            <View style={styles.promoDecor} />
            <Text style={styles.promoTitle}>🎉 Envío gratis</Text>
            <Text style={styles.promoText}>En compras mayores a S/ 50.00 dentro de Lima Metropolitana.</Text>
            <TouchableOpacity style={styles.primaryBtnWide} onPress={() => router.push('/(store)/catalog')}>
              <Text style={styles.primaryBtnText}>Aprovechar oferta</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footerBar}>
          <Text style={styles.footerText}>© 2026 Farmacia Luci — Todos los derechos reservados</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050d17',
  },
  bgGlow: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(59,130,246,0.18)',
    top: -140,
    right: -90,
    shadowColor: '#60a5fa',
    shadowOpacity: 0.22,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  bgGlowSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(168,85,247,0.15)',
    bottom: -110,
    left: -100,
    shadowColor: '#a78bfa',
    shadowOpacity: 0.16,
    shadowRadius: 70,
    shadowOffset: { width: 0, height: 0 },
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 28,
    paddingBottom: 16,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.12)',
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center' },
  logoEmoji: { fontSize: 24, marginRight: 8 },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  accountBtn: {
    backgroundColor: 'rgba(96,165,250,0.13)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#60a5fa',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  accountBtnText: {
    color: '#dbeafe',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  scroll: { flex: 1 },
  content: { paddingBottom: 32 },

  hero: {
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.18)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.45,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
  },
  heroGlow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(96,165,250,0.14)',
    right: -60,
    top: -60,
  },
  heroContent: { padding: 24 },
  heroTag: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 39,
    lineHeight: 44,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 12,
  },
  heroText: {
    fontSize: 15,
    color: '#dbeafe',
    lineHeight: 22,
    maxWidth: 430,
    marginBottom: 22,
  },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  primaryBtnWide: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    backgroundColor: 'rgba(148,163,184,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.16)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  secondaryBtnText: { color: '#e2e8f0', fontSize: 14, fontWeight: '800' },

  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginTop: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.09)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#f8fafc' },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(148,163,184,0.16)' },

  sectionWrap: { marginTop: 30, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f8fafc',
    marginBottom: 18,
  },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  categoryCard: {
    width: '31%',
    marginHorizontal: 6,
    marginBottom: 12,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  categoryIcon: { fontSize: 30, marginBottom: 8 },
  categoryName: {
    fontSize: 11.5,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  featuredScroll: { paddingRight: 20 },
  featuredCard: {
    width: 190,
    backgroundColor: 'rgba(15,23,42,0.8)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    marginRight: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.34,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  featuredImage: {
    height: 142,
    backgroundColor: 'rgba(30,41,59,0.74)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  featuredEmoji: { fontSize: 54 },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  featuredBody: { padding: 14 },
  featuredName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    minHeight: 38,
  },
  featuredPrice: { fontSize: 18, fontWeight: '900', color: '#7dd3fc' },

  promoBanner: {
    position: 'relative',
    overflow: 'hidden',
    padding: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(37,99,235,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.22)',
    shadowColor: '#2563eb',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
  },
  promoDecor: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(59,130,246,0.18)',
    top: -80,
    right: -60,
  },
  promoTitle: { fontSize: 28, fontWeight: '900', color: '#f8fafc', marginBottom: 8 },
  promoText: {
    fontSize: 14,
    color: '#dbeafe',
    lineHeight: 20,
    marginBottom: 18,
    maxWidth: 260,
  },

  footerBar: { paddingVertical: 28, alignItems: 'center' },
  footerText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
});
