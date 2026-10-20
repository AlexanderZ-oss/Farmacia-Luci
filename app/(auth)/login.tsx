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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { C } from '../../lib/theme';

// mode=staff  → solo login, sin registro, mensajería neutral
// mode=register → abre en modo registro (cliente)
// default     → login de cliente con opción a registrarse
export default function LoginScreen() {
  const params = useLocalSearchParams<{ mode?: string; returnTo?: string }>();
  const returnToCheckout = params.returnTo === 'checkout';
  const isStaffMode = params.mode === 'staff';
  const [isLogin, setIsLogin] = useState(params.mode !== 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  async function performLogin() {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { Alert.alert('Error al ingresar', error.message); return; }
      if (returnToCheckout) router.replace('/(store)/checkout');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  async function performRegister() {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { Alert.alert('Error al registrar', error.message); return; }
      if (data.session && returnToCheckout) {
        router.replace('/(store)/checkout');
      } else if (data.session) {
        Alert.alert('Cuenta creada', 'Tu cuenta de cliente está lista.');
      } else {
        setIsLogin(true);
        Alert.alert('Confirma tu correo', 'Te enviamos un enlace de confirmación. Luego inicia sesión.');
      }
    } catch (e) {
      Alert.alert('Error al registrar', e instanceof Error ? e.message : 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  const handleAuth = () => (isLogin ? performLogin() : performRegister());

  /* ─── Derived UI text ──────────────────────────────────────── */
  const titleText = 'Farmacia Luci';
  const subtitle  = isStaffMode
    ? 'Acceso de personal — ingresa con tus credenciales'
    : isLogin
      ? 'Ingresa a tu cuenta para continuar'
      : 'Crea tu cuenta de cliente';
  const btnLabel = loading
    ? 'Procesando…'
    : isLogin
      ? 'Iniciar sesión'
      : 'Crear cuenta';
  const backRoute: any = isStaffMode ? '/(store)' : '/(store)';

  return (
    <View style={styles.wrapper}>
      {/* ── Barra institucional ────────────────────────────── */}
      <View style={styles.topBar}>
        <View style={styles.topBarBrand}>
          <View style={styles.topBarMark}>
            <Text style={styles.topBarMarkText}>+</Text>
          </View>
          <Text style={styles.topBarName}>Farmacia Luci</Text>
        </View>
        <View style={styles.topBarSecure}>
          <Ionicons name="lock-closed-outline" size={12} color={C.onDarkMid} />
          <Text style={styles.topBarSecureText}>Acceso seguro</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.replace(backRoute)}
              accessibilityRole="button"
              accessibilityLabel="Volver a la tienda"
            >
              <Ionicons name="arrow-back" size={16} color={C.textMid} />
              <Text style={styles.backText}>Volver a la tienda</Text>
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>+</Text>
              </View>
              <Text style={styles.title}>{titleText}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {/* Staff mode indicator */}
            {isStaffMode && (
              <View style={styles.staffBanner}>
                <Ionicons name="shield-checkmark-outline" size={15} color={C.accent} />
                <Text style={styles.staffBannerText}>Acceso de personal autorizado</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'email' && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons name="mail-outline" size={16} color={C.textLight} />
                  <TextInput
                    style={styles.input}
                    onChangeText={setEmail}
                    value={email}
                    placeholder={isStaffMode ? 'cajero@farmacialuci.com' : 'tu@correo.com'}
                    placeholderTextColor={C.textLight}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    accessibilityLabel="Correo electrónico"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    focusedField === 'password' && styles.inputWrapperFocused,
                  ]}
                >
                  <Ionicons name="lock-closed-outline" size={16} color={C.textLight} />
                  <TextInput
                    style={styles.input}
                    onChangeText={setPassword}
                    value={password}
                    secureTextEntry={!showPassword}
                    placeholder="••••••••"
                    placeholderTextColor={C.textLight}
                    autoCapitalize="none"
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    accessibilityLabel="Contraseña"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(v => !v)}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={17}
                      color={C.textLight}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                disabled={loading}
                onPress={handleAuth}
                activeOpacity={0.88}
                accessibilityRole="button"
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>{btnLabel}</Text>
                }
              </TouchableOpacity>

              {/* Toggle login/register — only for non-staff */}
              {!isStaffMode && (
                <TouchableOpacity
                  style={styles.toggleBtn}
                  onPress={() => setIsLogin(v => !v)}
                  disabled={loading}
                  accessibilityRole="button"
                >
                  <Text style={styles.toggleText}>
                    {isLogin ? '¿Sin cuenta? Regístrate aquí' : '¿Ya tienes cuenta? Inicia sesión'}
                  </Text>
                  <Ionicons name="arrow-forward" size={13} color={C.green} />
                </TouchableOpacity>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footerSection}>
              <View style={styles.footerDivider} />
              {isStaffMode ? (
                <Text style={styles.footer}>
                  Solo para cajeros, inventario y administradores.{'\n'}Si eres cliente, vuelve a la tienda.
                </Text>
              ) : (
                <Text style={styles.footer}>
                  Las cuentas nuevas se registran como clientes.{'\n'}
                  ¿Eres personal de la farmacia?{' '}
                  <Text
                    style={styles.staffLink}
                    onPress={() => router.replace('/(auth)/login?mode=staff' as any)}
                  >
                    Ingresa aquí
                  </Text>
                </Text>
              )}
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgPage },

  // ── Barra institucional
  topBar: {
    backgroundColor: C.ink,
    paddingTop: Platform.OS === 'web' ? 10 : 46,
    paddingBottom: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBarMark: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarMarkText: { color: C.white, fontSize: 15, fontWeight: '600', marginTop: -1 },
  topBarName: {
    color: C.onDark,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  topBarSecure: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarSecureText: { color: C.onDarkMid, fontSize: 11, letterSpacing: 0.4 },

  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 48,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 30,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#0D1B2A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 24,
    paddingVertical: 4,
  },
  backText: { color: C.textMid, fontSize: 13, fontWeight: '600' },

  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoMarkText: { color: C.white, fontSize: 30, fontWeight: '600', marginTop: -3 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: { fontSize: 13.5, color: C.textMid, textAlign: 'center', lineHeight: 20 },

  staffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(30,58,95,0.25)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  staffBannerText: { color: C.accent, fontSize: 12.5, fontWeight: '700', letterSpacing: 0.2 },

  form: { gap: 4 },
  inputGroup: { marginBottom: 14 },
  label: {
    fontSize: 10.5,
    fontWeight: '700',
    color: C.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.bgPage,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
  },
  inputWrapperFocused: {
    borderColor: C.green,
    backgroundColor: C.white,
  },
  input: { flex: 1, paddingVertical: 13, fontSize: 14.5, color: C.text },
  eyeBtn: { padding: 6 },

  button: {
    backgroundColor: C.green,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: C.white, fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },

  toggleBtn: {
    marginTop: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  toggleText: { color: C.green, fontSize: 13.5, fontWeight: '700' },

  footerSection: { marginTop: 24 },
  footerDivider: { height: 1, backgroundColor: C.border, marginBottom: 16 },
  footer: { textAlign: 'center', color: C.textLight, fontSize: 12, lineHeight: 19 },
  staffLink: { color: C.green, fontWeight: '700', textDecorationLine: 'underline' },
});
