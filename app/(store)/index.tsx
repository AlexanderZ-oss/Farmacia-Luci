import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { name: 'Medicamentos', icon: '💊', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' },
  { name: 'Cosméticos', icon: '✨', color: '#f472b6', bg: 'rgba(236,72,153,0.15)' },
  { name: 'Suplementos', icon: '💪', color: '#fbbf24', bg: 'rgba(245,158,11,0.15)' },
  { name: '1ros Auxilios', icon: '🩹', color: '#f87171', bg: 'rgba(239,68,68,0.15)' },
  { name: 'Bebés y Mamás', icon: '👶', color: '#a78bfa', bg: 'rgba(139,92,246,0.15)' },
  { name: 'Higiene', icon: '🧴', color: '#2dd4bf', bg: 'rgba(20,184,166,0.15)' },
];

const FEATURED = [
  { name: 'Paracetamol 500mg', price: 3.50, tag: 'Más vendido', tagColor: '#10b981' },
  { name: 'Protector Solar FPS50', price: 32.00, tag: 'Nuevo', tagColor: '#3b82f6' },
  { name: 'Vitamina C 1000mg', price: 15.00, tag: 'Oferta', tagColor: '#f59e0b' },
];

export default function StoreHome() {
  const router = useRouter();

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.heroInner}>
            <Text style={s.heroTag}>🏥 Farmacia Online Premium</Text>
            <Text style={s.heroTitle}>Tu salud,{'\n'}nuestra prioridad</Text>
            <Text style={s.heroSub}>Medicamentos, suplementos y cuidado personal con envío a domicilio o retiro en tienda.</Text>
            <TouchableOpacity style={s.heroBtn} onPress={() => router.push('/(store)/catalog')} activeOpacity={0.85}>
              <Text style={s.heroBtnText}>Explorar Catálogo →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats bar */}
        <View style={s.statsBar}>
          <View style={s.stat}>
            <Text style={s.statNum}>500+</Text>
            <Text style={s.statLabel}>Productos</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>24h</Text>
            <Text style={s.statLabel}>Entrega</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.stat}>
            <Text style={s.statNum}>100%</Text>
            <Text style={s.statLabel}>Originales</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Categorías</Text>
          <View style={s.catGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat.name} style={[s.catCard, { backgroundColor: cat.bg }]} onPress={() => router.push('/(store)/catalog')} activeOpacity={0.8}>
                <Text style={s.catIcon}>{cat.icon}</Text>
                <Text style={[s.catName, { color: cat.color }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Destacados</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.featuredScroll}>
            {FEATURED.map((item) => (
              <TouchableOpacity key={item.name} style={s.featuredCard} onPress={() => router.push('/(store)/catalog')} activeOpacity={0.85}>
                <View style={s.featuredImgBox}>
                  <Text style={s.featuredEmoji}>💊</Text>
                  <View style={[s.featuredTag, { backgroundColor: item.tagColor }]}>
                    <Text style={s.featuredTagText}>{item.tag}</Text>
                  </View>
                </View>
                <View style={s.featuredCardBody}>
                  <Text style={s.featuredName} numberOfLines={2}>{item.name}</Text>
                  <Text style={s.featuredPrice}>S/ {item.price.toFixed(2)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Promo Banner */}
        <View style={s.section}>
          <View style={s.promoBanner}>
            <View style={s.promoDecor} />
            <Text style={s.promoTitle}>🎉 Envío GRATIS</Text>
            <Text style={s.promoSub}>En compras mayores a S/ 50.00 dentro de Lima Metropolitana</Text>
            <TouchableOpacity style={s.promoBtn} onPress={() => router.push('/(store)/catalog')}>
              <Text style={s.promoBtnText}>Aprovechar Oferta</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={s.footerBar}>
          <Text style={s.footerText}>© 2026 Farmacia Luci — Todos los derechos reservados</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 400, height: 400, borderRadius: 200, backgroundColor: 'rgba(59,130,246,0.1)', top: -150, right: -100 },
  circle2: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(139,92,246,0.1)', bottom: -50, left: -100 },
  scroll: { flex: 1 },
  content: { paddingBottom: 0 },

  // Hero
  hero: { paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: 40, paddingHorizontal: 24, position: 'relative' },
  heroInner: { position: 'relative', zIndex: 1, maxWidth: 480 },
  heroTag: { color: '#60a5fa', fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
  heroTitle: { fontSize: 40, fontWeight: '800', color: '#f1f5f9', lineHeight: 48, marginBottom: 16, letterSpacing: 0.5 },
  heroSub: { fontSize: 16, color: '#94a3b8', lineHeight: 24, marginBottom: 32, maxWidth: 360 },
  heroBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, alignSelf: 'flex-start', shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  heroBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },

  // Stats
  statsBar: { flexDirection: 'row', backgroundColor: 'rgba(30,41,59,0.8)', marginHorizontal: 20, marginTop: -20, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)', justifyContent: 'space-around', alignItems: 'center' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(148,163,184,0.2)' },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 40 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginBottom: 20, letterSpacing: 0.5 },

  // Categories
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: { width: '31%', paddingVertical: 20, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  catIcon: { fontSize: 32, marginBottom: 8 },
  catName: { fontSize: 12, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },

  // Featured
  featuredScroll: { paddingRight: 20, gap: 16 },
  featuredCard: { width: 180, backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' },
  featuredImgBox: { width: '100%', height: 140, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  featuredEmoji: { fontSize: 56 },
  featuredTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  featuredTagText: { color: '#fff', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  featuredCardBody: { padding: 16 },
  featuredName: { fontSize: 14, fontWeight: '600', color: '#f1f5f9', marginBottom: 8, height: 40 },
  featuredPrice: { fontSize: 18, fontWeight: '800', color: '#60a5fa' },

  // Promo
  promoBanner: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 24, padding: 32, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  promoDecor: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(59,130,246,0.2)', top: -50, right: -50 },
  promoTitle: { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 12 },
  promoSub: { fontSize: 15, color: '#bfdbfe', marginBottom: 24, maxWidth: 280, lineHeight: 22 },
  promoBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20, alignSelf: 'flex-start' },
  promoBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  // Footer
  footerBar: { padding: 32, marginTop: 20, alignItems: 'center' },
  footerText: { color: '#475569', fontSize: 12, fontWeight: '500' },
});
