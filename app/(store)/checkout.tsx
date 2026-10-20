import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, StyleSheet, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

type PaymentMethod = 'card' | 'yape' | 'plin';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; detail: string; mark: string }[] = [
  { value: 'card', label: 'Tarjeta',  detail: 'Débito o crédito', mark: 'VISA' },
  { value: 'yape', label: 'Yape',    detail: 'Pago móvil',        mark: 'Y' },
  { value: 'plin', label: 'Plin',    detail: 'Pago móvil',        mark: 'P' },
];

export default function CheckoutScreen() {
  const router   = useRouter();
  const { items, getTotal, clearCart, requiresAgeVerification, ageVerified } = useCartStore();
  const { session } = useAuthStore();
  const [address, setAddress]           = useState('');
  const [dni, setDni]                   = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [loading, setLoading]           = useState(false);

  const shippingCost = getTotal() >= 50 ? 0 : 5;
  const finalTotal   = getTotal() + shippingCost;

  useEffect(() => {
    if (!session) router.replace('/(auth)/login?mode=register&returnTo=checkout');
  }, [session, router]);

  const handleCheckout = async () => {
    if (!session) {
      router.replace('/(auth)/login?mode=register&returnTo=checkout');
      return;
    }
    if (items.length === 0) { Alert.alert('Error', 'Tu carrito está vacío'); return; }
    if (!address.trim())    { Alert.alert('Error', 'Ingresa una dirección de envío'); return; }

    setLoading(true);
    let ageVerificationId = null;

    try {
      if (requiresAgeVerification()) {
        // Puede saltarse la verificación si ya fue marcada en el cliente.
        if (ageVerified) {
          ageVerificationId = null;
        } else {
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
      }

      const { data: orderData, error: orderError } = await supabase.functions.invoke('confirm-order', {
        body: {
          items: items.map((item) => ({ product_id: item.product.id, quantity: item.quantity })),
          delivery_type: 'delivery',
          delivery_address: { street: address },
          payment_method: paymentMethod,
          age_verification_id: ageVerificationId,
        },
      });

      if (orderError) throw orderError;
      if (!orderData?.success || !orderData?.order_id) {
        throw new Error('No se pudo registrar el pedido. Inténtalo nuevamente.');
      }

      clearCart();
      Alert.alert(
        '¡Pedido registrado!',
        `Pedido #${orderData.order_id.slice(0, 8)}. El pago está pendiente de confirmación por ${
          paymentMethod === 'card' ? 'tarjeta' : paymentMethod === 'yape' ? 'Yape' : 'Plin'
        }. La farmacia coordinará contigo.`,
        [
          { text: 'Ver mis Pedidos', onPress: () => router.replace('/(store)/orders') },
          { text: 'Ir al Inicio',    onPress: () => router.replace('/(store)') },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error al Procesar', error.message || 'Hubo un error al procesar la compra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.wrapper}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────── */}
        <View style={s.headerBox}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={18} color={C.text} />
          </TouchableOpacity>
          <View>
            <Text style={s.eyebrow}>CHECKOUT</Text>
            <Text style={s.title}>Finalizar Compra</Text>
          </View>
        </View>

        {/* ── Step 1 – Order summary ──────────────────── */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepNum}><Text style={s.stepNumText}>1</Text></View>
            <Text style={s.sectionTitle}>Resumen del pedido</Text>
          </View>
          <View style={s.card}>
            {items.map((item) => (
              <View key={item.product.id} style={s.summaryItem}>
                <Text style={s.summaryItemName} numberOfLines={1}>
                  {item.quantity}× {item.product.name}
                </Text>
                <Text style={s.summaryItemPrice}>
                  S/ {(item.quantity * item.product.price).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={s.divider} />
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Subtotal</Text>
              <Text style={s.summaryValue}>S/ {getTotal().toFixed(2)}</Text>
            </View>
            <View style={s.summaryRow}>
              <Text style={s.summaryLabel}>Envío</Text>
              <Text style={[s.summaryValue, shippingCost === 0 && s.freeText]}>
                {shippingCost === 0 ? 'Gratis' : `S/ ${shippingCost.toFixed(2)}`}
              </Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Total a Pagar</Text>
              <Text style={s.totalValue}>S/ {finalTotal.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* ── Step 2 – Delivery address ───────────────── */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepNum}><Text style={s.stepNumText}>2</Text></View>
            <Text style={s.sectionTitle}>Datos de envío</Text>
          </View>
          <View style={s.card}>
            <Text style={s.fieldLabel}>Dirección completa *</Text>
            <TextInput
              style={s.input}
              placeholder="Ej: Av. Principal 123, Distrito, Ciudad"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor={C.textLight}
              accessibilityLabel="Dirección de envío"
            />
          </View>
        </View>

        {/* ── Step 3 – Payment method ─────────────────── */}
        <View style={s.section}>
          <View style={s.stepHeader}>
            <View style={s.stepNum}><Text style={s.stepNumText}>3</Text></View>
            <Text style={s.sectionTitle}>Método de pago</Text>
          </View>
          <View style={s.card}>
            <Text style={s.paymentNote}>
              Elige cómo deseas pagar. El pedido quedará pendiente hasta verificar el pago.
            </Text>
            {PAYMENT_METHODS.map((method) => {
              const selected = paymentMethod === method.value;
              return (
                <TouchableOpacity
                  key={method.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[s.payOption, selected && s.payOptionSelected]}
                  onPress={() => setPaymentMethod(method.value)}
                >
                  <View style={s.payMark}>
                    <Text style={s.payMarkText}>{method.mark}</Text>
                  </View>
                  <View style={s.payInfo}>
                    <Text style={[s.payName, selected && s.payNameSelected]}>{method.label}</Text>
                    <Text style={s.payDetail}>{method.detail}</Text>
                  </View>
                  <View style={[s.radio, selected && s.radioSelected]}>
                    {selected && <View style={s.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Step 4 – Age verification (conditional) ─── */}
        {requiresAgeVerification() && (
          <View style={s.section}>
            <View style={s.stepHeader}>
              <View style={[s.stepNum, s.stepNumWarn]}><Text style={s.stepNumText}>4</Text></View>
              <Text style={s.sectionTitle}>Verificación de edad</Text>
            </View>
            <View style={s.ageCard}>
              <View style={s.ageTitleRow}>
                <Ionicons name="alert-circle-outline" size={17} color="#B91C1C" />
                <Text style={s.ageTitle}>Restricción +18</Text>
              </View>
              <Text style={s.ageDesc}>
                Tu orden incluye productos regulados. Por ley, debemos verificar tu mayoría de edad mediante la RENIEC.
              </Text>
              <Text style={s.fieldLabel}>Número de DNI (8 dígitos) *</Text>
              <TextInput
                style={[s.input, s.inputDanger]}
                placeholder="Ingresa tu DNI"
                keyboardType="number-pad"
                maxLength={8}
                value={dni}
                onChangeText={setDni}
                placeholderTextColor="#F87171"
                accessibilityLabel="DNI para verificación de edad"
              />
            </View>
          </View>
        )}

        {/* ── CTA ─────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.payBtn, loading && s.payBtnDisabled]}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.87}
          accessibilityRole="button"
          accessibilityLabel={`Confirmar pedido por S/ ${finalTotal.toFixed(2)}`}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ActivityIndicator color={C.white} />
              <Text style={s.payBtnText}>Registrando pedido...</Text>
            </View>
          ) : (
            <Text style={s.payBtnText}>Confirmar pedido · S/ {finalTotal.toFixed(2)}</Text>
          )}
        </TouchableOpacity>

        <View style={s.secureRow}>
          <Ionicons name="lock-closed-outline" size={12} color={C.textLight} />
          <Text style={s.secureText}>
            El pedido se registrará pendiente; no se realizará ningún cobro en línea.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgPage },
  scroll:  { flex: 1 },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 24 : 16,
    paddingBottom: 60,
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
  },

  // ── Header
  headerBox: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  eyebrow:     { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6 },
  title:       { color: C.text,  fontSize: 25, fontWeight: '700', letterSpacing: -0.4 },

  // ── Sections
  section:      { marginBottom: 20 },
  stepHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumWarn:  { backgroundColor: C.amber },
  stepNumText:  { color: C.white, fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15.5, fontWeight: '700', color: C.text },

  card: {
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  // ── Summary
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryItemName:  { color: C.textMid, fontSize: 14, flex: 1, paddingRight: 12, fontWeight: '500' },
  summaryItemPrice: { color: C.text,    fontSize: 14, fontWeight: '700' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { color: C.textMid, fontSize: 14 },
  summaryValue: { color: C.text, fontSize: 14, fontWeight: '600' },
  freeText: { color: C.green },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  totalLabel: { color: C.text, fontSize: 16, fontWeight: '700' },
  totalValue: { color: C.green, fontSize: 22, fontWeight: '700' },

  // ── Input
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMid,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.bgPage,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 15,
    color: C.text,
    minHeight: 50,
  },
  inputDanger: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },

  // ── Payment
  paymentNote: { color: C.textMid, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
    gap: 12,
    backgroundColor: C.bgPage,
  },
  payOptionSelected: { borderColor: C.green, backgroundColor: C.greenLight },
  payMark: {
    minWidth: 46,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payMarkText: { color: C.text, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  payInfo:   { flex: 1 },
  payName:   { color: C.text, fontSize: 15, fontWeight: '700' },
  payNameSelected: { color: C.green },
  payDetail: { color: C.textMid, fontSize: 12, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: C.green },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
  },

  // ── Age
  ageCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 10,
  },
  ageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageTitle: { fontSize: 15, fontWeight: '700', color: '#B91C1C' },
  ageDesc:  { color: '#B91C1C', fontSize: 14, lineHeight: 20 },

  // ── CTA
  payBtn: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: C.green,
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 54,
    justifyContent: 'center',
  },
  payBtnDisabled: { opacity: 0.65 },
  payBtnText: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  secureText: { textAlign: 'center', color: C.textLight, fontSize: 12, lineHeight: 18, flex: 1 },
});
