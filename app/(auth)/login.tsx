import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotate1 = useRef(new Animated.Value(0)).current;
  const rotate2 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1800, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    );

    const r1 = Animated.loop(Animated.timing(rotate1, { toValue: 1, duration: 14000, useNativeDriver: true }));
    const r2 = Animated.loop(Animated.timing(rotate2, { toValue: -1, duration: 18000, useNativeDriver: true }));
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
      ]),
    );

    floatLoop.start();
    r1.start();
    r2.start();
    p.start();

    return () => {
      floatLoop.stop();
      r1.stop();
      r2.stop();
      p.stop();
    };
  }, []);

  const spin1 = rotate1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = rotate2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });

  async function performLogin(targetEmail: string, targetPass: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password: targetPass });
    if (error) {
      Alert.alert('Error al ingresar', error.message);
    }
    setLoading(false);
  }

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Completa todos los campos', 'Necesitas ingresar correo y contraseña.');
      return;
    }

    setLoading(true);

    if (isLogin) {
      await performLogin(email, password);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Error al registrar', error.message);
    } else {
      Alert.alert('¡Registro exitoso!', 'Puedes iniciar sesión con tu cuenta.');
    }
    setLoading(false);
  }

  const quickLogin = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    void performLogin(presetEmail, presetPass);
  };

  const quickRoles = [
    { label: 'Admin', icon: '🛡️', email: 'admin@gmail.com', pass: 'Admin1234!', color: '#60a5fa', bg: 'rgba(96,165,250,0.14)', border: 'rgba(96,165,250,0.38)' },
    { label: 'Cajero', icon: '💳', email: 'cajero@gmail.com', pass: 'Cajero1234!', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.36)' },
    { label: 'Inventario', icon: '📦', email: 'inventario@gmail.com', pass: 'Inventario1234!', color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.36)' },
  ];

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.bgCircle1, { transform: [{ rotate: spin1 }] }]} />
      <Animated.View style={[styles.bgCircle2, { transform: [{ rotate: spin2 }] }]} />
      <View style={styles.bgCircle3} />
      <View style={styles.bgCircle4} />

      <View style={styles.pill1}><Text style={styles.pillText}>💊</Text></View>
      <View style={styles.pill2}><Text style={styles.pillText}>🩺</Text></View>
      <View style={styles.pill3}><Text style={styles.pillText}>⚕️</Text></View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(store)')}>
              <Text style={styles.backIcon}>←</Text>
              <Text style={styles.backText}>Volver a la tienda</Text>
            </TouchableOpacity>

            <View style={styles.logoSection}>
              <Animated.View style={[styles.logoRing, { transform: [{ translateY: floatAnim }] }]}>
                <View style={styles.logoInner}>
                  <Text style={styles.logoEmoji}>💊</Text>
                </View>
                <View style={styles.logoRingOuter} />
              </Animated.View>
              <Text style={styles.title}>Farmacia Luci</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Accede a tu panel de trabajo' : 'Crea tu cuenta de cliente'}
              </Text>
            </View>

            {isLogin && (
              <Animated.View style={[styles.quickSection, { transform: [{ scale: pulse }] }]}>
                <Text style={styles.quickTitle}>Acceso rápido por rol</Text>
                <View style={styles.quickRow}>
                  {quickRoles.map((role, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.chip, { backgroundColor: role.bg, borderColor: role.border }]}
                      onPress={() => quickLogin(role.email, role.pass)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.chipIcon}>{role.icon}</Text>
                      <Text style={[styles.chipLabel, { color: role.color }]}>{role.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>
            )}

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>📧</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={setEmail}
                    value={email}
                    placeholder="tu@correo.com"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={handleAuth}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonText}>{loading ? '⏳ Procesando...' : isLogin ? '🚀 Iniciar sesión' : '✨ Crear cuenta'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsLogin((value) => !value)}>
                <Text style={styles.toggleText}>
                  {isLogin ? '¿Sin cuenta? Regístrate aquí →' : '¿Ya tienes cuenta? Inicia sesión →'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerSection}>
              <View style={styles.footerDivider} />
              <Text style={styles.footer}>El sistema asigna automáticamente tu acceso según el rol asignado.</Text>
              <View style={styles.footerBadges}>
                <View style={[styles.fBadge, { borderColor: 'rgba(59,130,246,0.3)' }]}><Text style={styles.fBadgeText}>🛡️ Admin</Text></View>
                <View style={[styles.fBadge, { borderColor: 'rgba(245,158,11,0.3)' }]}><Text style={styles.fBadgeText}>💳 Cajero</Text></View>
                <View style={[styles.fBadge, { borderColor: 'rgba(16,185,129,0.3)' }]}><Text style={styles.fBadgeText}>📦 Inventario</Text></View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#050d18',
  },
  bgCircle1: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.09)',
    top: -220,
    right: -150,
  },
  bgCircle2: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 230,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.08)',
    bottom: -200,
    left: -140,
  },
  bgCircle3: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(96,165,250,0.06)',
    top: 60,
    right: -90,
  },
  bgCircle4: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(168,85,247,0.07)',
    bottom: 110,
    left: -80,
  },
  pill1: {
    position: 'absolute',
    top: '12%',
    left: '8%',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(96,165,250,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.22)',
  },
  pill2: {
    position: 'absolute',
    top: '25%',
    right: '6%',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(52,211,153,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.22)',
  },
  pill3: {
    position: 'absolute',
    bottom: '18%',
    left: '6%',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168,85,247,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.22)',
  },
  pillText: { fontSize: 18 },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 48,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 32,
    padding: 28,
    width: '100%',
    maxWidth: 470,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.14)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.42,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 20,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backIcon: { color: '#94a3b8', fontSize: 16 },
  backText: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  logoSection: { alignItems: 'center', marginBottom: 26 },
  logoRing: {
    width: 94,
    height: 94,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  logoInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(96,165,250,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(96,165,250,0.38)',
    zIndex: 2,
    shadowColor: '#60a5fa',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  logoRingOuter: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.15)',
    borderStyle: 'dashed',
  },
  logoEmoji: { fontSize: 34 },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  quickSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.08)',
    padding: 14,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dbeafe',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 2,
  },
  chipIcon: { fontSize: 14, marginRight: 4 },
  chipLabel: { fontSize: 11.5, fontWeight: '800' },

  form: { gap: 4 },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#dbeafe',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
    paddingHorizontal: 12,
  },
  inputIcon: { fontSize: 15, marginRight: 8 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#f8fafc' },
  eyeBtn: { padding: 8 },
  eyeIcon: { fontSize: 15 },

  button: {
    backgroundColor: '#2563eb',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.72 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  toggleBtn: { marginTop: 16, alignItems: 'center', padding: 6 },
  toggleText: { color: '#7dd3fc', fontSize: 13.5, fontWeight: '800' },

  footerSection: { marginTop: 24 },
  footerDivider: { height: 1, backgroundColor: 'rgba(148,163,184,0.1)', marginBottom: 16 },
  footer: { textAlign: 'center', color: '#64748b', fontSize: 11.5, lineHeight: 18 },
  footerBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  fBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(15,23,42,0.65)',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  fBadgeText: { color: '#dbeafe', fontSize: 11, fontWeight: '700' },
});
