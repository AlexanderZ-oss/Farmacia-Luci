import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Alert, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { C } from '../../lib/theme';

interface PosItem { product_id: string; name: string; price: number; quantity: number; requires_prescription: boolean; }
interface CashSession { id: string; opened_at: string; opening_cash: number; }

export default function CashierPOS() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [cart, setCart] = useState<PosItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [openingCash, setOpeningCash] = useState('');
  const [countedCash, setCountedCash] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [buyerDni, setBuyerDni] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [verifiedBuyerDni, setVerifiedBuyerDni] = useState('');
  const [prescriptionNumber, setPrescriptionNumber] = useState('');
  const [dniLoading, setDniLoading] = useState(false);
  const { session } = useAuthStore();
  const router = useRouter();
  const { sourceSaleId } = useLocalSearchParams<{ sourceSaleId?: string }>();

  // Animations
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cartBounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (session?.user.id) {
      void fetchCashSession();
    } else {
      setCashSession(null);
      setSessionLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (sourceSaleId) void loadSaleDraft(sourceSaleId);
  }, [sourceSaleId]);

  async function fetchCashSession() {
    setSessionLoading(true);
    const { data, error } = await supabase
      .from('cash_sessions')
      .select('id, opened_at, opening_cash')
      .eq('cashier_id', session?.user.id ?? '')
      .is('closed_at', null)
      .maybeSingle();
    if (error) {
      Alert.alert('No se pudo consultar la caja', error.message);
    } else {
      setCashSession(data);
    }
    setSessionLoading(false);
  }

  async function loadSaleDraft(saleId: string) {
    let itemsRes: any = await supabase
      .from('sale_items')
      .select('product_id, quantity, unit_price, products(name, requires_prescription)')
      .eq('sale_id', saleId);
    if (itemsRes.error && /requires_prescription/i.test(itemsRes.error.message)) {
      itemsRes = await supabase
        .from('sale_items')
        .select('product_id, quantity, unit_price, products(name)')
        .eq('sale_id', saleId);
    }

    let saleRes: any = await supabase
      .from('sales')
      .select('customer_dni, customer_name, prescription_number')
      .eq('id', saleId)
      .single();
    if (saleRes.error && /prescription_number/i.test(saleRes.error.message)) {
      saleRes = await supabase
        .from('sales')
        .select('customer_dni, customer_name')
        .eq('id', saleId)
        .single();
    }

    const { data, error } = itemsRes;
    const { data: sale, error: saleError } = saleRes;
    if (error) {
      Alert.alert('No se pudo cargar la boleta para corregirla', error.message);
      return;
    }
    if (saleError) {
      Alert.alert('No se pudieron cargar los datos del cliente', saleError.message);
      return;
    }
    const draft = ((data ?? []) as any[]).flatMap((item: any) => {
      const relatedProducts = item.products as { name: string; requires_prescription: boolean }[] | { name: string; requires_prescription: boolean } | null;
      const product = Array.isArray(relatedProducts) ? relatedProducts[0] : relatedProducts;
      if (!product) return [];
      return [{
        product_id: item.product_id,
        name: product.name,
        price: Number(item.unit_price),
        quantity: item.quantity,
        requires_prescription: !!product.requires_prescription,
      }];
    });
    if (draft.length === 0) {
      Alert.alert('Boleta sin productos', 'No hay productos disponibles para cargar en la boleta corregida.');
      return;
    }
    setCart(draft);
    setBuyerDni(sale.customer_dni || '');
    setBuyerName(sale.customer_name || '');
    setVerifiedBuyerDni(sale.customer_dni && sale.customer_name ? sale.customer_dni : '');
    setPrescriptionNumber(sale.prescription_number || '');
    Alert.alert('Borrador listo', 'Revisa y modifica las cantidades antes de emitir la boleta corregida.');
  }

  async function openCashSession() {
    const amount = Number(openingCash);
    if (!openingCash.trim() || !Number.isFinite(amount) || amount < 0) {
      Alert.alert('Monto inválido', 'Ingresa un fondo inicial igual o mayor que cero.');
      return;
    }
    setSessionBusy(true);
    const { error } = await supabase.rpc('open_cash_session', { p_opening_cash: amount });
    if (error) {
      Alert.alert('No se pudo abrir la caja', error.message);
    } else {
      setOpeningCash('');
      await fetchCashSession();
    }
    setSessionBusy(false);
  }

  async function closeCashSession() {
    if (!cashSession) return;
    const amount = Number(countedCash);
    if (!countedCash.trim() || !Number.isFinite(amount) || amount < 0) {
      Alert.alert('Monto inválido', 'Ingresa el efectivo contado al cierre.');
      return;
    }
    setSessionBusy(true);
    const { data, error } = await supabase.rpc('close_cash_session', {
      p_session_id: cashSession.id,
      p_counted_cash: amount,
    });
    if (error) {
      Alert.alert('No se pudo cerrar la caja', error.message);
    } else if (!data) {
      Alert.alert('No se pudo cerrar la caja', 'El servidor no devolvió los datos del cierre.');
    } else {
      const result = data as { expected_cash: number; difference: number };
      Alert.alert(
        'Caja cerrada',
        `Efectivo esperado: S/ ${Number(result.expected_cash).toFixed(2)}\nDiferencia: S/ ${Number(result.difference).toFixed(2)}`,
      );
      setCountedCash('');
      await fetchCashSession();
    }
    setSessionBusy(false);
  }

  async function lookupBuyerDni() {
    if (!/^\d{8}$/.test(buyerDni)) {
      Alert.alert('DNI inválido', 'Ingresa los 8 dígitos del DNI.');
      return;
    }
    setDniLoading(true);
    const { data, error } = await supabase.functions.invoke('verify-age', {
      body: { dni: buyerDni, context: 'pos', action: 'lookup' },
    });
    if (error) {
      Alert.alert('No se pudo consultar el DNI', error.message);
    } else if (!data?.full_name) {
      Alert.alert('DNI no encontrado', 'La API no devolvió datos para ese documento.');
    } else if (String(data.dni) !== buyerDni) {
      Alert.alert('DNI no coincide', 'La API devolvió información de un documento diferente.');
    } else {
      setBuyerName(data.full_name);
      setVerifiedBuyerDni(buyerDni);
    }
    setDniLoading(false);
  }

  // Bounce cart icon when item is added
  const bounceCart = useCallback(() => {
    Animated.sequence([
      Animated.spring(cartBounce, { toValue: 1.3, useNativeDriver: true, tension: 200 }),
      Animated.spring(cartBounce, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();
  }, []);

  async function searchProducts(query: string) {
    setSearch(query);
    if (query.length < 2) { setResults([]); return; }
    const BASE = 'id, name, price, stock, barcode, category_id';
    let res: any = await supabase
      .from('products')
      .select(`${BASE}, requires_prescription`)
      .or(`name.ilike.%${query}%,barcode.eq.${query}`)
      .eq('is_active', true)
      .limit(10);
    if (res.error && /requires_prescription/i.test(res.error.message)) {
      res = await supabase
        .from('products')
        .select(BASE)
        .or(`name.ilike.%${query}%,barcode.eq.${query}`)
        .eq('is_active', true)
        .limit(10);
    }
    setResults(res.data || []);
  }

  function addToCart(product: any) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        requires_prescription: !!product.requires_prescription,
      }];
    });
    setSearch('');
    setResults([]);
    bounceCart();
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }

  function updateQty(productId: string, delta: number) {
    setCart(prev => prev
      .map(i => i.product_id === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartRequiresPrescription = cart.some(i => i.requires_prescription);

  async function handleSale(paymentMethod: string) {
    if (cart.length === 0) { Alert.alert('Error', 'Agrega productos al carrito'); return; }
    if (!cashSession) { Alert.alert('Caja cerrada', 'Abre la caja antes de registrar una venta.'); return; }

    if (cartRequiresPrescription) {
      // Venta con receta: DNI verificado + número de receta obligatorios.
      if (!/^\d{8}$/.test(buyerDni) || verifiedBuyerDni !== buyerDni) {
        Alert.alert('DNI requerido', 'Este producto requiere receta. Consulta y verifica el DNI del cliente antes de cobrar.');
        return;
      }
      if (!buyerName.trim()) {
        Alert.alert('Nombre requerido', 'Registra el nombre del cliente antes de cobrar.');
        return;
      }
      if (prescriptionNumber.trim().length < 4) {
        Alert.alert('Receta requerida', 'Ingresa el número de receta médica para emitir esta venta.');
        return;
      }
    } else if (buyerDni) {
      // Venta simple: no se admite DNI suelto.
      Alert.alert('DNI no necesario', 'Esta venta no requiere receta: solo puedes registrar el nombre del cliente.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-sale', {
        body: {
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
          payment_method: paymentMethod,
          customer_dni: cartRequiresPrescription ? buyerDni : null,
          customer_name: buyerName.trim() || null,
          prescription_number: cartRequiresPrescription ? prescriptionNumber.trim() : null,
        },
      });
      if (error) throw error;
      Alert.alert('✅ Venta Completada', `Total: S/ ${total.toFixed(2)}\nMétodo: ${paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}`);
      setCart([]);
      setBuyerDni('');
      setBuyerName('');
      setVerifiedBuyerDni('');
      setPrescriptionNumber('');
      router.push({ pathname: '/(cashier)/receipts', params: { saleId: data.sale_id } } as never);
    } catch (error: any) {
      Alert.alert('Error en Venta', error.message || 'No se pudo procesar la venta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeAnim }]}>

      <Animated.View style={[s.container, { transform: [{ translateY: slideAnim }] }]}>

        <View style={s.sessionCard}>
          <View style={s.sessionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.sessionTitle}>{cashSession ? 'Caja abierta' : 'Control de caja'}</Text>
              <Text style={s.sessionSubtitle}>
                {cashSession
                  ? `Desde ${new Date(cashSession.opened_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · Fondo S/ ${Number(cashSession.opening_cash).toFixed(2)}`
                  : 'Abre el turno para habilitar las ventas'}
              </Text>
            </View>
            <View style={[s.sessionStatusBadge, cashSession ? s.sessionStatusOn : s.sessionStatusOff]}>
              <Ionicons
                name={cashSession ? 'lock-open-outline' : 'lock-closed-outline'}
                size={11}
                color={cashSession ? C.greenDark : C.textMid}
              />
              <Text style={[s.sessionStatus, cashSession ? s.sessionStatusTextOn : s.sessionStatusTextOff]}>
                {cashSession ? 'ACTIVA' : 'CERRADA'}
              </Text>
            </View>
          </View>
          {sessionLoading ? (
            <ActivityIndicator color={C.green} />
          ) : cashSession ? (
            <View style={s.sessionControls}>
              <TextInput
                style={s.sessionInput}
                value={countedCash}
                onChangeText={setCountedCash}
                placeholder="Efectivo contado al cierre"
                placeholderTextColor={C.textLight}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={s.sessionButton} disabled={sessionBusy} onPress={closeCashSession}>
                <Text style={s.sessionButtonText}>{sessionBusy ? 'Procesando…' : 'Cerrar caja'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.sessionControls}>
              <TextInput
                style={s.sessionInput}
                value={openingCash}
                onChangeText={setOpeningCash}
                placeholder="Fondo inicial en S/"
                placeholderTextColor={C.textLight}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={s.sessionButton} disabled={sessionBusy} onPress={openCashSession}>
                <Text style={s.sessionButtonText}>{sessionBusy ? 'Procesando…' : 'Abrir caja'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Bar */}
        <View style={s.searchSection}>
          <Text style={s.sectionLabel}>Buscar producto</Text>
          <View style={s.searchContainer}>
            <Ionicons name="search-outline" size={17} color={C.textLight} />
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={searchProducts}
              placeholder="Nombre, código de barras..."
              placeholderTextColor={C.textLight}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearch(''); setResults([]); }}
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
              >
                <Ionicons name="close" size={16} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results Dropdown */}
        {results.length > 0 && (
          <View style={s.resultsList}>
            {results.map((p, idx) => (
              <TouchableOpacity key={p.id} style={[s.resultItem, idx < results.length - 1 && s.resultBorder]} onPress={() => addToCart(p)}>
                <View style={s.resultIconBox}>
                  <Ionicons name="medkit-outline" size={17} color={C.greenDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultName}>{p.name}</Text>
                  <View style={s.resultMetaRow}>
                    <Text style={s.resultPrice}>S/ {Number(p.price).toFixed(2)}</Text>
                    {p.requires_prescription && (
                      <View style={s.rxChip}>
                        <Ionicons name="document-text-outline" size={10} color={C.greenDark} />
                        <Text style={s.rxChipText}>Receta</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[s.stockBadge, p.stock < 10 && s.stockBadgeLow]}>
                  <Text style={[s.stockText, p.stock < 10 && s.stockTextLow]}>
                    {p.stock} ud.
                  </Text>
                </View>
                <Ionicons name="add" size={18} color={C.green} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Cart Header */}
        <View style={s.cartHeaderRow}>
          <Text style={s.sectionTitle}>Carrito</Text>
          <Animated.View style={[s.cartBadge, { transform: [{ scale: cartBounce }] }]}>
            <Text style={s.cartBadgeText}>{cart.reduce((n, i) => n + i.quantity, 0)}</Text>
          </Animated.View>
        </View>

        {/* Cart List */}
        <View style={s.cartContainer}>
          <FlatList
            data={cart}
            keyExtractor={(i) => i.product_id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            renderItem={({ item }) => (
              <View style={s.cartItem}>
                <View style={s.cartIconBox}>
                  <Ionicons name="medkit-outline" size={17} color={C.textMid} />
                </View>
                <View style={s.cartItemLeft}>
                  <Text style={s.cartName} numberOfLines={1}>{item.name}</Text>
                  <View style={s.cartMetaRow}>
                    <Text style={s.cartSub}>S/ {item.price.toFixed(2)} c/u</Text>
                    {item.requires_prescription && (
                      <View style={s.rxChip}>
                        <Ionicons name="document-text-outline" size={10} color={C.greenDark} />
                        <Text style={s.rxChipText}>Receta</Text>
                      </View>
                    )}
                  </View>
                </View>
                {/* Qty controls */}
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.product_id, -1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Reducir cantidad de ${item.name}`}
                  >
                    <Ionicons name="remove" size={15} color={C.textMid} />
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => updateQty(item.product_id, 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Aumentar cantidad de ${item.name}`}
                  >
                    <Ionicons name="add" size={15} color={C.textMid} />
                  </TouchableOpacity>
                </View>
                <Text style={s.cartTotal}>S/ {(item.price * item.quantity).toFixed(2)}</Text>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.product_id)}
                  style={s.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${item.name} del carrito`}
                >
                  <Ionicons name="trash-outline" size={16} color={C.textLight} />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyContainer}>
                <Ionicons name="cart-outline" size={44} color={C.textLight} />
                <Text style={s.emptyTitle}>Carrito vacío</Text>
                <Text style={s.emptyText}>Busca un producto arriba para agregarlo</Text>
              </View>
            }
          />
        </View>

        <View style={[s.buyerCard, cartRequiresPrescription && s.buyerCardRx]}>
          <View style={s.buyerCardHeader}>
            <Ionicons
              name={cartRequiresPrescription ? 'document-text-outline' : 'person-outline'}
              size={15}
              color={cartRequiresPrescription ? C.greenDark : C.textMid}
            />
            <Text style={s.buyerTitle}>
              {cartRequiresPrescription ? 'Venta con receta médica' : 'Datos del cliente (opcional)'}
            </Text>
          </View>

          {cartRequiresPrescription ? (
            <>
              <Text style={s.buyerHint}>
                Este carrito incluye medicamentos que requieren receta. El DNI y el número de receta son obligatorios.
              </Text>
              <View style={s.buyerRow}>
                <TextInput
                  style={s.buyerInput}
                  value={buyerDni}
                  onChangeText={(value) => {
                    const dni = value.replace(/\D/g, '').slice(0, 8);
                    setBuyerDni(dni);
                    if (dni !== verifiedBuyerDni) {
                      setBuyerName('');
                      setVerifiedBuyerDni('');
                    }
                  }}
                  placeholder="DNI (8 dígitos)"
                  placeholderTextColor={C.textLight}
                  keyboardType="number-pad"
                  maxLength={8}
                />
                <TouchableOpacity style={s.lookupButton} onPress={lookupBuyerDni} disabled={dniLoading}>
                  <Text style={s.lookupButtonText}>{dniLoading ? 'Buscando…' : 'Buscar DNI'}</Text>
                </TouchableOpacity>
              </View>
              {verifiedBuyerDni === buyerDni && !!buyerName && (
                <View style={s.verifiedRow}>
                  <Ionicons name="checkmark-circle" size={13} color={C.greenDark} />
                  <Text style={s.verifiedText}>DNI verificado: {buyerDni}</Text>
                </View>
              )}
              <TextInput
                style={s.buyerNameInput}
                value={buyerName}
                onChangeText={setBuyerName}
                placeholder="Nombre y apellidos del cliente"
                placeholderTextColor={C.textLight}
              />
              <TextInput
                style={s.buyerNameInput}
                value={prescriptionNumber}
                onChangeText={setPrescriptionNumber}
                placeholder="Número de receta médica (obligatorio)"
                placeholderTextColor={C.textLight}
                maxLength={60}
              />
            </>
          ) : (
            <>
              <Text style={s.buyerHint}>
                Venta de medicamento simple. Puedes registrar el nombre del cliente; el DNI y la receta no son necesarios.
              </Text>
              <TextInput
                style={s.buyerNameInput}
                value={buyerName}
                onChangeText={setBuyerName}
                placeholder="Nombre y apellidos del cliente (opcional)"
                placeholderTextColor={C.textLight}
              />
            </>
          )}
        </View>

        {/* Footer / Checkout */}
        <View style={s.footer}>
          <View style={s.totalRow}>
            <View>
              <Text style={s.totalLabel}>TOTAL A PAGAR</Text>
              <Text style={s.totalItems}>{cart.length} producto(s)</Text>
            </View>
            <Text style={s.totalAmount}>S/ {total.toFixed(2)}</Text>
          </View>

          {loading ? (
            <View style={s.loadingRow}>
              <ActivityIndicator color={C.green} size="small" />
              <Text style={s.loadingText}>Procesando venta...</Text>
            </View>
          ) : (
            <View style={s.payBtns}>
              <TouchableOpacity
                style={[s.payBtn, s.payBtnCash]}
                onPress={() => handleSale('cash')}
                disabled={loading || cart.length === 0 || !cashSession}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="cash-outline" size={18} color={C.greenDark} />
                <Text style={[s.payBtnText, { color: C.greenDark }]}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.payBtn, s.payBtnCard]}
                onPress={() => handleSale('card')}
                disabled={loading || cart.length === 0 || !cashSession}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Ionicons name="card-outline" size={18} color={C.accent} />
                <Text style={[s.payBtnText, { color: C.accent }]}>Tarjeta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: C.bgPage },
  sessionCard: {
    backgroundColor: C.white,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  sessionTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  sessionSubtitle: { color: C.textMid, fontSize: 12, marginTop: 3 },
  sessionStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6,
    borderWidth: 1,
  },
  sessionStatusOn: { backgroundColor: C.greenLight, borderColor: '#BFDCD7' },
  sessionStatusOff: { backgroundColor: C.bgSubtle, borderColor: C.border },
  sessionStatus: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  sessionStatusTextOn: { color: C.greenDark },
  sessionStatusTextOff: { color: C.textMid },
  sessionControls: { flexDirection: 'row', gap: 8 },
  sessionInput: {
    flex: 1,
    color: C.text,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    backgroundColor: C.white,
  },
  sessionButton: { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  sessionButtonText: { color: C.white, fontWeight: '700', fontSize: 12 },
  buyerCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  buyerCardRx: { borderColor: C.green, backgroundColor: '#F4FBFA' },
  buyerCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  buyerTitle: { color: C.textMid, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  buyerHint: { color: C.textLight, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  buyerRow: { flexDirection: 'row', gap: 7 },
  buyerInput: {
    flex: 1,
    color: C.text,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  lookupButton: { backgroundColor: C.accent, borderRadius: 8, justifyContent: 'center', paddingHorizontal: 14 },
  lookupButtonText: { color: C.white, fontWeight: '700', fontSize: 12 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  verifiedText: { color: C.greenDark, fontSize: 11, fontWeight: '700' },
  rxChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.greenLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
    borderWidth: 1, borderColor: '#BFDCD7',
  },
  rxChipText: { color: C.greenDark, fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  resultMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 2 },
  cartMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  buyerNameInput: {
    color: C.text,
    borderWidth: 1,
    borderColor: C.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginTop: 8,
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20, maxWidth: 980, width: '100%', alignSelf: 'center' },

  sectionLabel: {
    fontSize: 11,
    color: C.textMid,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  searchSection: { marginBottom: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: C.text },

  resultsList: {
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
    maxHeight: 240,
    overflow: 'hidden',
  },
  resultItem: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  resultIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultName: { fontWeight: '700', color: C.text, fontSize: 14 },
  resultPrice: { color: C.textMid, fontSize: 12, marginTop: 2 },
  stockBadge: { backgroundColor: C.accentLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  stockText: { color: C.accent, fontSize: 11, fontWeight: '700' },
  stockTextLow: { color: '#92400E' },

  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, letterSpacing: -0.2 },
  cartBadge: {
    backgroundColor: C.green,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: C.white, fontSize: 12, fontWeight: '700' },

  cartContainer: { flex: 1 },
  cartItem: {
    backgroundColor: C.white,
    padding: 13,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cartIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemLeft: { flex: 1 },
  cartName: { fontWeight: '700', color: C.text, fontSize: 14 },
  cartSub: { color: C.textMid, fontSize: 12, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.bgSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyNum: { color: C.text, fontWeight: '700', fontSize: 15, minWidth: 22, textAlign: 'center' },
  cartTotal: { fontWeight: '700', color: C.text, fontSize: 14, minWidth: 64, textAlign: 'right' },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: C.textMid },
  emptyText: { fontSize: 13, color: C.textLight, textAlign: 'center' },

  footer: {
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 11, color: C.textMid, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  totalItems: { fontSize: 12, color: C.textLight, marginTop: 2 },
  totalAmount: { fontSize: 30, fontWeight: '700', color: C.text, letterSpacing: -0.6 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  loadingText: { color: C.textMid, fontWeight: '600', fontSize: 14 },

  payBtns: { flexDirection: 'row', gap: 12 },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  payBtnCash: { backgroundColor: C.greenLight, borderColor: C.green },
  payBtnCard: { backgroundColor: C.accentLight, borderColor: C.accent },
  payBtnText: { fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
});
