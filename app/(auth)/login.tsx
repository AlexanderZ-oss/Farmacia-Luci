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
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const returnToCheckout = params.returnTo === 'checkout';
  const [isLogin, setIsLogin] = useState(params.mode !== 'register');
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

    floatLoop.start();
    r1.start();
    r2.start();

    return () => {
      floatLoop.stop();
      r1.stop();
      r2.stop();
    };
  }, []);

  const spin1 = rotate1.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spin2 = rotate2.interpolate({ inputRange: [-1, 0], outputRange: ['-360deg', '0deg'] });

  async function performLogin(targetEmail: string, targetPass: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: targetEmail, password: targetPass });
      if (error) {
        Alert.alert('Error al ingresar', error.message);
        return;
      }
      if (returnToCheckout) router.replace('/(store)/checkout');
    } catch (error) {
      Alert.alert('Error al ingresar', error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Completa todos los campos', 'Necesitas ingresar correo y contraseña.');
      return;
    }

    if (isLogin) {
      await performLogin(email, password);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert('Error al registrar', error.message);
      } else if (data.session && returnToCheckout) {
        router.replace('/(store)/checkout');
      } else if (data.session) {
        Alert.alert('Cuenta creada', 'Tu cuenta de cliente está lista.');
      } else {
        setIsLogin(true);
        Alert.alert(
          'Confirma tu correo',
          'Te enviamos un enlace de confirmación. Cuando confirmes tu correo, inicia sesión para continuar con tu compra.',
        );
      }
    } catch (error) {
      Alert.alert('Error al registrar', error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

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
                {isLogin ? 'Ingresa a tu cuenta de cliente' : 'Crea tu cuenta para continuar con tu compra'}
              </Text>
            </View>

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

              <TouchableOpacity style={styles.toggleBtn} onPress={() => setIsLogin((value) => !value)} disabled={loading}>
                <Text style={styles.toggleText}>
                  {isLogin ? '¿Sin cuenta? Regístrate aquí →' : '¿Ya tienes cuenta? Inicia sesión →'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerSection}>
              <View style={styles.footerDivider} />
              <Text style={styles.footer}>Las cuentas nuevas se registran como clientes.</Text>
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
});
