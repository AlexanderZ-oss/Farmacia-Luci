import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, getTotal, clearCart, requiresAgeVerification } = useCartStore();
  const { session } = useAuthStore();
  const [address, setAddress] = useState('');
  const [dni, setDni] = useState('');
  const [loading, setLoading] = useState(false);

  const shippingCost = getTotal() >= 50 ? 0 : 5;
  const finalTotal = getTotal() + shippingCost;

  const handleCheckout = async () => {
    if (items.length === 0) { Alert.alert('Error', 'Tu carrito está vacío'); return; }
    if (!address.trim()) { Alert.alert('Error', 'Ingresa una dirección de envío'); return; }

    setLoading(true);
    let ageVerificationId = null;

    try {
      if (requiresAgeVerification()) {
        if (!dni || dni.length !== 8) {
          Alert.alert('Error', 'Se requiere un DNI válido (8 dígitos).');
          setLoading(false);
          return;
        }
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-age', {
          body: { dni, context: 'web' },
        });
        if (verifyError || !verifyData?.verified) {
          Alert.alert('Verificación Denegada', 'No se pudo verificar tu edad o el DNI es inválido.');
          setLoading(false);
          return;
        }
        ageVerificationId = verifyData.verification_id;
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke('confirm-order', {
        body: {
          items: items.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
          delivery_type: 'delivery',
          delivery_address: { street: address },
          payment_method: 'card',
          age_verification_id: ageVerificationId,
        },
      });
      
      if (orderError) throw orderError;

      clearCart();
      Alert.alert('¡Compra Exitosa!', 'Tu pedido ha sido procesado y está en camino.', [
        { text: 'Ver mis Pedidos', onPress: () => router.replace('/(store)/orders') },
        { text: 'Ir al Inicio', onPress: () => router.replace('/(store)') },
      ]);
    } catch (error: any) {
      Alert.alert('Error al Procesar', error.message || 'Hubo un error al procesar la compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <View style={s.headerBox}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={s.title}>Finalizar Compra</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>1. Resumen de la Orden</Text>
          <View style={s.card}>
            {items.map(item => (
              <View key={item.product.id} style={s.summaryItem}>
                <Text style={s.summaryItemName} numberOfLines={1}>{item.quantity}x {item.product.name}</Text>
                <Text style={s.summaryItemPrice}>S/ {(item.quantity * item.product.price).toFixed(2)}</Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>S/ {getTotal().toFixed(2)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Envío</Text>
              <Text style={[s.summaryValue, shippingCost === 0 && { color: '#34d399' }]}>
                {shippingCost === 0 ? 'GRATIS' : `S/ ${shippingCost.toFixed(2)}`}
              </Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total a Pagar</Text>
              <Text style={s.totalValue}>S/ {finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>2. Datos de Envío</Text>
          <View style={s.card}>
            <Text style={s.label}>Dirección Completa</Text>
            <TextInput 
              style={s.input} 
              placeholder="Ej: Av. Principal 123, Distrito, Ciudad" 
              value={address} 
              onChangeText={setAddress} 
              placeholderTextColor="#64748b"
            />
          </View>
        </View>

        {requiresAgeVerification() && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>3. Verificación de Edad</Text>
            <View style={s.ageCard}>
              <View style={s.ageHeader}>
                <Text style={s.ageIcon}>⚠️</Text>
                <Text style={s.ageTitle}>Restricción +18</Text>
              </View>
              <Text style={s.ageDesc}>
                Tu orden incluye productos regulados. Por ley, debemos verificar tu mayoría de edad mediante la RENIEC.
              </Text>
              <TextInput 
                style={[s.input, { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.05)' }]} 
                placeholder="Ingresa tu DNI (8 dígitos)" 
                keyboardType="number-pad" 
                maxLength={8} 
                value={dni} 
                onChangeText={setDni} 
                placeholderTextColor="#f87171"
              />
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[s.payBtn, loading && s.payBtnDisabled]} 
          onPress={handleCheckout} 
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.payBtnText}>Procesando Pago Seguro...</Text>
            </View>
          ) : (
            <Text style={s.payBtnText}>Pagar S/ {finalTotal.toFixed(2)}</Text>
          )}
        </TouchableOpacity>
        <Text style={s.secureText}>🔒 Pago encriptado y seguro</Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(59,130,246,0.1)', top: -100, right: -50 },
  circle2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(16,185,129,0.08)', bottom: 100, left: -50 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 60 },
  headerBox: { marginBottom: 24, marginTop: 10 },
  backBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(30,41,59,0.8)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' },
  backBtnText: { color: '#f1f5f9', fontWeight: '700', fontSize: 13 },
  title: { fontSize: 32, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.5 },
  
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(30,41,59,0.6)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' },
  
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryItemName: { color: '#cbd5e1', fontSize: 15, flex: 1, paddingRight: 10, fontWeight: '500' },
  summaryItemPrice: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(148,163,184,0.2)', marginVertical: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { color: '#94a3b8', fontSize: 15 },
  summaryValue: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(148,163,184,0.2)' },
  totalLabel: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  totalValue: { color: '#60a5fa', fontSize: 24, fontWeight: '800' },

  label: { fontSize: 14, fontWeight: '700', color: '#cbd5e1', marginBottom: 10 },
  input: { backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', borderRadius: 14, padding: 16, fontSize: 15, color: '#f1f5f9' },

  ageCard: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  ageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  ageIcon: { fontSize: 20, marginRight: 10 },
  ageTitle: { color: '#fca5a5', fontWeight: '800', fontSize: 16 },
  ageDesc: { color: '#f87171', fontSize: 14, marginBottom: 20, lineHeight: 22 },

  payBtn: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 10, shadowColor: '#3b82f6', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  secureText: { textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 20, fontWeight: '600' },
});
