import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { C, IconName } from '../../lib/theme';

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES: { name: string; icon: IconName }[] = [
  { name: 'Medicamentos',     icon: 'medkit-outline' },
  { name: 'Vitaminas',        icon: 'nutrition-outline' },
  { name: 'Cuidado Personal', icon: 'sparkles-outline' },
  { name: 'Bebés',            icon: 'balloon-outline' },
  { name: 'Dermocosmética',   icon: 'water-outline' },
  { name: '1ros Auxilios',    icon: 'bandage-outline' },
];

const FEATURED: { name: string; price: number; tag: string; icon: IconName }[] = [
  { name: 'Paracetamol 500mg',      price: 3.50,  tag: 'Más vendido', icon: 'medkit-outline' },
  { name: 'Protector Solar FPS 50', price: 32.00, tag: 'Nuevo',       icon: 'sunny-outline' },
  { name: 'Vitamina C 1000mg',      price: 15.00, tag: 'Oferta',      icon: 'nutrition-outline' },
  { name: 'Ibuprofeno 400mg',       price: 5.50,  tag: 'Recomendado', icon: 'medkit-outline' },
];

const WHY_US: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'car-outline',          title: 'Entrega a domicilio',     desc: 'Rápida y segura en Lima Metropolitana.' },
  { icon: 'chatbubble-ellipses-outline', title: 'Asesoría profesional', desc: 'Atención de químico farmacéutico incluida.' },
  { icon: 'shield-checkmark-outline',    title: 'Productos garantizados', desc: '100% originales y con registro sanitario.' },
  { icon: 'time-outline',           title: 'Lun – Sáb: 8:00 – 21:00', desc: 'Domingos: 9:00 – 14:00.' },
];

const TRUST: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'shield-checkmark-outline', title: 'Productos originales',   desc: 'Con registro sanitario vigente.' },
  { icon: 'ribbon-outline',           title: 'Químico farmacéutico',   desc: 'Asesoría profesional en cada compra.' },
  { icon: 'car-outline',            title: 'Entrega en 24 horas',    desc: 'En Lima Metropolitana.' },
];

const WHATSAPP_NUMBER = '51999999999';
const WHATSAPP_MSG = encodeURIComponent('Hola! Quisiera pedir un producto.');

export default function StoreHome() {
  const router = useRouter();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.heroInner}>
          <View style={styles.heroLeft}>
            <Text style={styles.eyebrow}>ATENCIÓN FARMACÉUTICA PROFESIONAL</Text>

            <Text style={styles.heroTitle}>{'Tu salud,\ncerca de ti'}</Text>

            <Text style={styles.heroSubtitle}>
              Medicamentos, vitaminas y cuidado personal con atención profesional
              y entrega rápida en Lima.
            </Text>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={openWhatsApp}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Pedir por WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={17} color={C.white} />
                <Text style={styles.primaryBtnText}>Pedir por WhatsApp</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/(store)/catalog')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Ver catálogo de productos"
              >
                <Text style={styles.secondaryBtnText}>Ver catálogo</Text>
                <Ionicons name="arrow-forward" size={16} color={C.green} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Panel de confianza */}
          <View style={styles.trustPanel}>
            <Text style={styles.trustPanelTitle}>¿Por qué confiar en nosotros?</Text>
            {TRUST.map((t) => (
              <View key={t.title} style={styles.trustRow}>
                <View style={styles.trustIcon}>
                  <Ionicons name={t.icon} size={17} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.trustTitle}>{t.title}</Text>
                  <Text style={styles.trustDesc}>{t.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { value: '500+', label: 'Productos' },
            { value: '24 h', label: 'Entrega' },
            { value: '100%', label: 'Originales' },
          ].map((st, i) => (
            <React.Fragment key={st.value}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{st.value}</Text>
                <Text style={styles.statLabel}>{st.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </Animated.View>

      {/* ══════════════════════════════════════════════════════
          CATEGORIES
      ══════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>CATÁLOGO</Text>
            <Text style={styles.sectionTitle}>Categorías</Text>
          </View>
          <TouchableOpacity
            style={styles.sectionLink}
            onPress={() => router.push('/(store)/catalog')}
            accessibilityRole="button"
          >
            <Text style={styles.sectionLinkText}>Ver catálogo</Text>
            <Ionicons name="arrow-forward" size={14} color={C.green} />
          </TouchableOpacity>
        </View>

        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={styles.catCard}
              onPress={() => router.push('/(store)/catalog')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Ver categoría ${cat.name}`}
            >
              <View style={styles.catIcon}>
                <Ionicons name={cat.icon} size={22} color={C.green} />
              </View>
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          FEATURED PRODUCTS
      ══════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>SELECCIÓN</Text>
            <Text style={styles.sectionTitle}>Productos destacados</Text>
          </View>
          <TouchableOpacity
            style={styles.sectionLink}
            onPress={() => router.push('/(store)/catalog')}
            accessibilityRole="button"
          >
            <Text style={styles.sectionLinkText}>Ver todos</Text>
            <Ionicons name="arrow-forward" size={14} color={C.green} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.featuredScroll}
        >
          {FEATURED.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.featCard}
              onPress={() => router.push('/(store)/catalog')}
              activeOpacity={0.85}
            >
              {/* Image area */}
              <View style={styles.featImgBox}>
                <Ionicons name={item.icon} size={38} color={C.greenMid} />
                <View style={styles.featBadge}>
                  <Text style={styles.featBadgeText}>{item.tag}</Text>
                </View>
              </View>

              {/* Body */}
              <View style={styles.featBody}>
                <Text style={styles.featName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.featFooter}>
                  <Text style={styles.featPrice}>S/ {item.price.toFixed(2)}</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => router.push('/(store)/catalog')}
                    accessibilityRole="button"
                    accessibilityLabel={`Agregar ${item.name} al carrito`}
                  >
                    <Ionicons name="add" size={20} color={C.white} />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ══════════════════════════════════════════════════════
          PROMO BANNER – free shipping
      ══════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoEyebrow}>PROMOCIÓN VIGENTE</Text>
            <Text style={styles.promoTitle}>Envío gratis en compras mayores a S/ 50.00</Text>
            <Text style={styles.promoText}>
              Válido dentro de Lima Metropolitana. Aplica a todo el catálogo.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.promoBtn}
            onPress={() => router.push('/(store)/catalog')}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.promoBtnText}>Ver catálogo</Text>
            <Ionicons name="arrow-forward" size={15} color={C.green} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          WHY CHOOSE US
      ══════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>NUESTRO COMPROMISO</Text>
            <Text style={styles.sectionTitle}>¿Por qué elegirnos?</Text>
          </View>
        </View>

        <View style={styles.whyGrid}>
          {WHY_US.map((w) => (
            <View key={w.title} style={styles.whyCard}>
              <View style={styles.whyIcon}>
                <Ionicons name={w.icon} size={18} color={C.accent} />
              </View>
              <Text style={styles.whyTitle}>{w.title}</Text>
              <Text style={styles.whyDesc}>{w.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          LOCATION & HOURS
      ══════════════════════════════════════════════════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>VISÍTANOS</Text>
            <Text style={styles.sectionTitle}>Ubicación y horarios</Text>
          </View>
        </View>

        <View style={styles.locationCard}>
          {/* Map placeholder */}
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map-outline" size={30} color={C.textLight} />
            <Text style={styles.mapText}>Lima, Perú</Text>
          </View>

          <View style={styles.locationBody}>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={17} color={C.green} />
              <Text style={styles.locationText}>Av. Principal 123, Lima</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="time-outline" size={17} color={C.green} />
              <Text style={styles.locationText}>Lun – Sáb: 8:00 am – 9:00 pm</Text>
            </View>
            <View style={styles.locationRow}>
              <Ionicons name="time-outline" size={17} color={C.green} />
              <Text style={styles.locationText}>Dom: 9:00 am – 2:00 pm</Text>
            </View>
            <TouchableOpacity
              style={styles.directionsBtn}
              onPress={() => Linking.openURL('https://maps.google.com')}
              activeOpacity={0.85}
              accessibilityRole="button"
            >
              <Ionicons name="navigate-outline" size={15} color={C.green} />
              <Text style={styles.directionsBtnText}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <View style={styles.footer}>
        <View style={styles.footerInner}>
          {/* Brand */}
          <View style={styles.footerBrand}>
            <View style={styles.footerLogoRow}>
              <View style={styles.footerLogoMark}>
                <Text style={styles.footerLogoMarkText}>+</Text>
              </View>
              <View>
                <Text style={styles.footerLogoText}>Farmacia Luci</Text>
                <Text style={styles.footerLogoSub}>Droguería y farmacia</Text>
              </View>
            </View>

            <Text style={styles.footerDesc}>
              Farmacia y droguería con atención farmacéutica profesional,
              productos originales y entrega a domicilio en Lima.
            </Text>

            <View style={styles.footerSocial}>
              {([
                { icon: 'logo-facebook' as IconName, label: 'Facebook' },
                { icon: 'logo-instagram' as IconName, label: 'Instagram' },
                { icon: 'logo-whatsapp' as IconName, label: 'WhatsApp' },
              ]).map((soc) => (
                <TouchableOpacity
                  key={soc.label}
                  style={styles.socialBtn}
                  onPress={openWhatsApp}
                  accessibilityRole="button"
                  accessibilityLabel={soc.label}
                >
                  <Ionicons name={soc.icon} size={16} color={C.onDark} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tienda */}
          <View style={styles.footerCol}>
            <Text style={styles.footerColTitle}>Tienda</Text>
            {[
              { label: 'Catálogo',      route: '/(store)/catalog' },
              { label: 'Carrito',       route: '/(store)/cart' },
              { label: 'Mis Pedidos',   route: '/(store)/orders' },
              { label: 'Soporte',       route: '/(support)/tickets' },
            ].map((link) => (
              <TouchableOpacity
                key={link.label}
                style={styles.footerLink}
                onPress={() => router.push(link.route as never)}
                accessibilityRole="link"
              >
                <Text style={styles.footerLinkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contacto */}
          <View style={styles.footerCol}>
            <Text style={styles.footerColTitle}>Contacto</Text>
            <View style={styles.footerContactRow}>
              <Ionicons name="location-outline" size={15} color={C.onDarkMid} />
              <Text style={styles.footerContactText}>Av. Principal 123, Lima</Text>
            </View>
            <View style={styles.footerContactRow}>
              <Ionicons name="call-outline" size={15} color={C.onDarkMid} />
              <Text style={styles.footerContactText}>(01) 555-0123</Text>
            </View>
            <View style={styles.footerContactRow}>
              <Ionicons name="time-outline" size={15} color={C.onDarkMid} />
              <Text style={styles.footerContactText}>Lun – Sáb: 8:00 – 21:00{'\n'}Dom: 9:00 – 14:00</Text>
            </View>
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.footerBottom}>
          <Text style={styles.footerNote}>
            Venta responsable de medicamentos. Los productos requieren receta
            médica cuando corresponde. Registro sanitario vigente.
          </Text>
          <Text style={styles.footerCopy}>
            © 2026 Farmacia Luci · Todos los derechos reservados
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.bgPage },
  content: { paddingBottom: 72 },

  // ── HERO
  hero: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  heroInner: {
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 40,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 32,
  },
  heroLeft: { flex: 1, justifyContent: 'center' },

  eyebrow: {
    color: C.green,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: C.text,
    lineHeight: 44,
    marginBottom: 14,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: 15.5,
    color: C.textMid,
    lineHeight: 24,
    marginBottom: 26,
    maxWidth: 460,
  },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryBtnText: { color: C.white, fontSize: 14.5, fontWeight: '700', letterSpacing: 0.2 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  secondaryBtnText: { color: C.text, fontSize: 14.5, fontWeight: '700', letterSpacing: 0.2 },

  // Panel de confianza
  trustPanel: {
    width: Platform.OS === 'web' ? 340 : '100%',
    backgroundColor: C.bgPage,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 20,
    gap: 16,
  },
  trustPanelTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  trustIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustTitle: { color: C.text, fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  trustDesc:  { color: C.textMid, fontSize: 12.5, lineHeight: 17, marginTop: 2 },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.bgPage,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statItem:    { alignItems: 'center' },
  statValue:   { fontSize: 22, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  statLabel:   {
    fontSize: 10.5,
    color: C.textLight,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  statDivider: { width: 1, height: 32, backgroundColor: C.border },

  // ── SECTIONS
  section: {
    marginTop: 36,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 18,
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionTitle: { fontSize: 21, fontWeight: '700', color: C.text, letterSpacing: -0.3 },
  sectionLink:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  sectionLinkText: { color: C.green, fontSize: 13.5, fontWeight: '700' },

  // ── CATEGORIES
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: {
    width: '31%',
    minWidth: 150,
    padding: 16,
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  catName: { fontSize: 13.5, fontWeight: '600', color: C.text, lineHeight: 18 },

  // ── FEATURED
  featuredScroll: { paddingRight: 20, gap: 12 },
  featCard: {
    width: 186,
    backgroundColor: C.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  featImgBox: {
    height: 104,
    backgroundColor: C.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  featBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  featBadgeText: {
    color: C.accent,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  featBody:   { padding: 14 },
  featName:   { color: C.text, fontSize: 13.5, fontWeight: '600', lineHeight: 18, minHeight: 36 },
  featFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  featPrice:  { color: C.green, fontSize: 15.5, fontWeight: '700' },

  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── PROMO BANNER
  promoBanner: {
    backgroundColor: C.ink,
    borderRadius: 12,
    padding: 26,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    justifyContent: 'space-between',
    gap: 20,
    borderWidth: 1,
    borderColor: C.inkMid,
  },
  promoContent: { flex: 1 },
  promoEyebrow: {
    color: C.onDarkMid,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  promoTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.onDark,
    lineHeight: 29,
    marginBottom: 8,
    maxWidth: 520,
    letterSpacing: -0.3,
  },
  promoText:  { fontSize: 13.5, color: C.onDarkMid, lineHeight: 20, maxWidth: 480 },
  promoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.white,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  promoBtnText: { color: C.green, fontSize: 14, fontWeight: '700' },

  // ── WHY US
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  whyCard: {
    width: '48.5%',
    minWidth: 260,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  whyIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  whyTitle: { color: C.text, fontSize: 14, fontWeight: '700', marginBottom: 5 },
  whyDesc:  { color: C.textMid, fontSize: 12.5, lineHeight: 18 },

  // ── LOCATION
  locationCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
  },
  mapPlaceholder: {
    height: 150,
    flex: Platform.OS === 'web' ? 1 : undefined,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: C.border,
    borderBottomWidth: Platform.OS === 'web' ? 0 : 1,
    borderBottomColor: C.border,
  },
  mapText: { color: C.textMid, fontSize: 13, fontWeight: '600' },
  locationBody: {
    padding: 20,
    flex: Platform.OS === 'web' ? 1.4 : undefined,
    gap: 12,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  locationText: { color: C.textMid, fontSize: 14, fontWeight: '500' },
  directionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: C.white,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 4,
    minHeight: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  directionsBtnText: { color: C.green, fontSize: 13.5, fontWeight: '700' },

  // ── FOOTER
  footer: {
    marginTop: 44,
    backgroundColor: C.ink,
    paddingTop: 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  footerInner: {
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: Platform.OS === 'web' ? 48 : 28,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: C.onDarkLine,
  },
  footerBrand: { width: Platform.OS === 'web' ? '38%' : '100%', maxWidth: 420 },
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  footerLogoMark: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoMarkText: { color: C.white, fontSize: 21, fontWeight: '600', marginTop: -2 },
  footerLogoText: {
    color: C.onDark,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  footerLogoSub: {
    color: C.onDarkMid,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  footerDesc: { color: C.onDarkMid, fontSize: 13, lineHeight: 20, marginBottom: 16 },
  footerSocial: { flexDirection: 'row', gap: 8 },
  socialBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.onDarkLine,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerCol: { gap: 10 },
  footerColTitle: {
    color: C.onDark,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  footerLink: { paddingVertical: 3 },
  footerLinkText: { color: C.onDarkMid, fontSize: 13.5, fontWeight: '500' },
  footerContactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  footerContactText: { color: C.onDarkMid, fontSize: 13, lineHeight: 19, flex: 1 },

  footerBottom: {
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
    paddingTop: 18,
    gap: 8,
  },
  footerNote: { color: 'rgba(255,255,255,0.55)', fontSize: 11.5, lineHeight: 17, maxWidth: 640 },
  footerCopy: { color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: '600' },
});
