import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    if (!email || !password) { Alert.alert('Error', 'Completa todos los campos'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
        <View style={s.circle3} />
      </View>

      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.card}>
          <View style={s.logoContainer}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>💊</Text>
            </View>
          </View>

          <Text style={s.title}>Farmacia Luci</Text>
          <Text style={s.subtitle}>Gestión farmacéutica integral</Text>

          <View style={s.inputGroup}>
            <Text style={s.label}>Correo electrónico</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputIcon}>📧</Text>
              <TextInput
                style={s.input}
                onChangeText={setEmail}
                value={email}
                placeholder="tu@correo.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Contraseña</Text>
            <View style={s.inputWrapper}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                style={s.input}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            disabled={loading}
            onPress={signInWithEmail}
            activeOpacity={0.85}
          >
            <Text style={s.buttonText}>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</Text>
          </TouchableOpacity>

          <Text style={s.footer}>Sistema protegido por roles RBAC + RLS</Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(59,130,246,0.15)', top: -80, right: -60 },
  circle2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(139,92,246,0.12)', bottom: 60, left: -40 },
  circle3: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(16,185,129,0.1)', top: '40%', right: 30 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderRadius: 24,
    padding: 36,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(59,130,246,0.2)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(59,130,246,0.3)',
  },
  logoEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9', textAlign: 'center', letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 28, marginTop: 4 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', marginBottom: 8, marginLeft: 4 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.15)',
    paddingHorizontal: 14,
  },
  inputIcon: { fontSize: 16, marginRight: 10 },
  input: { flex: 1, padding: 14, fontSize: 15, color: '#f1f5f9' },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  footer: { textAlign: 'center', color: '#475569', fontSize: 11, marginTop: 20 },
});
