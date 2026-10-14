import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Alert, StyleSheet, ActivityIndicator, Animated,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface PosItem { product_id: string; name: string; price: number; quantity: number; }
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
    const [{ data, error }, { data: sale, error: saleError }] = await Promise.all([
      supabase
      .from('sale_items')
      .select('product_id, quantity, unit_price, products(name)')
      .eq('sale_id', saleId),
      supabase
        .from('sales')
        .select('customer_dni, customer_name')
        .eq('id', saleId)
        .single(),
    ]);
    if (error) {
      Alert.alert('No se pudo cargar la boleta para corregirla', error.message);
      return;
    }
    if (saleError) {
      Alert.alert('No se pudieron cargar los datos del cliente', saleError.message);
      return;
    }
    const draft = (data ?? []).flatMap((item) => {
      const relatedProducts = item.products as { name: string }[] | { name: string } | null;
      const product = Array.isArray(relatedProducts) ? relatedProducts[0] : relatedProducts;
      if (!product) return [];
      return [{
        product_id: item.product_id,
        name: product.name,
        price: Number(item.unit_price),
        quantity: item.quantity,
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
    const { data } = await supabase
      .from('products')
      .select('id, name, price, stock, barcode, category_id')
      .or(`name.ilike.%${query}%,barcode.eq.${query}`)
      .eq('is_active', true)
      .limit(10);
    setResults(data || []);
  }

  function addToCart(product: any) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, name: product.name, price: product.price, quantity: 1 }];
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

  async function handleSale(paymentMethod: string) {
    if (cart.length === 0) { Alert.alert('Error', 'Agrega productos al carrito'); return; }
    if (!cashSession) { Alert.alert('Caja cerrada', 'Abre la caja antes de registrar una venta.'); return; }
    if (buyerDni && verifiedBuyerDni !== buyerDni) {
      Alert.alert('DNI sin consultar', 'Usa “Buscar DNI” para rellenar y verificar los datos del cliente antes de emitir la boleta.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-sale', {
        body: {
          items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
          payment_method: paymentMethod,
          customer_dni: buyerDni || null,
          customer_name: buyerName.trim() || null,
        },
      });
      if (error) throw error;
      Alert.alert('✅ Venta Completada', `Total: S/ ${total.toFixed(2)}\nMétodo: ${paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}`);
      setCart([]);
      setBuyerDni('');
      setBuyerName('');
      setVerifiedBuyerDni('');
      router.push({ pathname: '/(cashier)/receipts', params: { saleId: data.sale_id } } as never);
    } catch (error: any) {
      Alert.alert('Error en Venta', error.message || 'No se pudo procesar la venta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Animated.View style={[s.wrapper, { opacity: fadeAnim }]}>
      {/* Background glow circles */}
      <View style={s.circle1} />
      <View style={s.circle2} />
      <View style={s.circle3} />

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
            <Text style={s.sessionStatus}>{cashSession ? 'ACTIVA' : 'CERRADA'}</Text>
          </View>
          {sessionLoading ? (
            <ActivityIndicator color="#fbbf24" />
          ) : cashSession ? (
            <View style={s.sessionControls}>
              <TextInput
                style={s.sessionInput}
                value={countedCash}
                onChangeText={setCountedCash}
                placeholder="Efectivo contado al cierre"
                placeholderTextColor="#64748b"
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
                placeholderTextColor="#64748b"
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
          <Text style={s.sectionLabel}>🔍 Buscar Producto</Text>
          <View style={s.searchContainer}>
            <Text style={s.searchIcon}>🔎</Text>
            <TextInput
              style={s.searchInput}
              value={search}
              onChangeText={searchProducts}
              placeholder="Nombre, código de barras..."
              placeholderTextColor="#475569"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }}>
                <Text style={s.clearIcon}>✕</Text>
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
                  <Text style={s.resultEmoji}>💊</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultName}>{p.name}</Text>
                  <Text style={s.resultPrice}>S/ {Number(p.price).toFixed(2)}</Text>
                </View>
                <View style={[s.stockBadge, p.stock < 10 && s.stockBadgeLow]}>
                  <Text style={[s.stockText, p.stock < 10 && s.stockTextLow]}>
                    {p.stock < 10 ? '⚠️ ' : ''}{p.stock} ud.
                  </Text>
                </View>
                <Text style={s.addIcon}>＋</Text>
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
                  <Text style={s.cartEmoji}>💊</Text>
                </View>
                <View style={s.cartItemLeft}>
                  <Text style={s.cartName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cartSub}>S/ {item.price.toFixed(2)} c/u</Text>
                </View>
                {/* Qty controls */}
                <View style={s.qtyRow}>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.product_id, -1)}>
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyNum}>{item.quantity}</Text>
                  <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.product_id, 1)}>
                    <Text style={s.qtyBtnText}>＋</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.cartTotal}>S/ {(item.price * item.quantity).toFixed(2)}</Text>
                <TouchableOpacity onPress={() => removeFromCart(item.product_id)} style={s.removeBtn}>
                  <Text style={s.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={s.emptyContainer}>
                <Text style={s.emptyIcon}>🛒</Text>
                <Text style={s.emptyTitle}>Carrito vacío</Text>
                <Text style={s.emptyText}>Busca un producto arriba para agregarlo</Text>
              </View>
            }
          />
        </View>

        <View style={s.buyerCard}>
          <Text style={s.buyerTitle}>Datos para la boleta (opcional)</Text>
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
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              maxLength={8}
            />
            <TouchableOpacity style={s.lookupButton} onPress={lookupBuyerDni} disabled={dniLoading}>
              <Text style={s.lookupButtonText}>{dniLoading ? 'Buscando…' : 'Buscar DNI'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.buyerNameInput}
            value={buyerName}
            onChangeText={setBuyerName}
            placeholder="Nombre y apellidos del cliente"
            placeholderTextColor="#64748b"
          />
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
              <ActivityIndicator color="#f59e0b" size="small" />
              <Text style={s.loadingText}>Procesando venta...</Text>
            </View>
          ) : (
            <View style={s.payBtns}>
              <TouchableOpacity
                style={[s.payBtn, s.payBtnCash]}
                onPress={() => handleSale('cash')}
                disabled={loading || cart.length === 0 || !cashSession}
                activeOpacity={0.8}
              >
                <Text style={s.payBtnIcon}>💵</Text>
                <Text style={[s.payBtnText, { color: '#34d399' }]}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.payBtn, s.payBtnCard]}
                onPress={() => handleSale('card')}
                disabled={loading || cart.length === 0 || !cashSession}
                activeOpacity={0.8}
              >
                <Text style={s.payBtnIcon}>💳</Text>
                <Text style={[s.payBtnText, { color: '#60a5fa' }]}>Tarjeta</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#050d17' },
  sessionCard: {
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderColor: 'rgba(245,158,11,0.26)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 9 },
  sessionTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  sessionSubtitle: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  sessionStatus: { color: '#fbbf24', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  sessionControls: { flexDirection: 'row', gap: 8 },
  sessionInput: {
    flex: 1,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  sessionButton: { backgroundColor: '#b45309', borderRadius: 9, paddingHorizontal: 13, justifyContent: 'center' },
  sessionButtonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  buyerCard: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.18)',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  buyerTitle: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', marginBottom: 7 },
  buyerRow: { flexDirection: 'row', gap: 7 },
  buyerInput: {
    flex: 1,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  lookupButton: { backgroundColor: '#1d4ed8', borderRadius: 8, justifyContent: 'center', paddingHorizontal: 12 },
  lookupButtonText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  buyerNameInput: {
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    marginTop: 7,
  },
  circle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(245,158,11,0.08)',
    top: -80,
    right: -80,
  },
  circle2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59,130,246,0.08)',
    bottom: 100,
    left: -60,
  },
  circle3: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(16,185,129,0.06)',
    top: '40%',
    right: 20,
  },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  sectionLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  searchSection: { marginBottom: 12 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#f8fafc' },
  clearIcon: { color: '#94a3b8', fontSize: 16, padding: 4 },

  resultsList: {
    backgroundColor: 'rgba(15,23,42,0.96)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    marginBottom: 16,
    maxHeight: 220,
    zIndex: 100,
    shadowColor: '#f59e0b',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 12,
  },
  resultItem: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.08)' },
  resultIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultEmoji: { fontSize: 16 },
  resultName: { fontWeight: '700', color: '#f8fafc', fontSize: 14 },
  resultPrice: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  stockBadge: { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockBadgeLow: { backgroundColor: 'rgba(239,68,68,0.15)' },
  stockText: { color: '#60a5fa', fontSize: 11, fontWeight: '800' },
  stockTextLow: { color: '#f87171' },
  addIcon: { color: '#fbbf24', fontSize: 20, fontWeight: '800', paddingLeft: 4 },

  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: '#f8fafc', letterSpacing: 0.3 },
  cartBadge: {
    backgroundColor: '#f59e0b',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  cartBadgeText: { color: '#111827', fontSize: 12, fontWeight: '900' },

  cartContainer: { flex: 1 },
  cartItem: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.08)',
    shadowColor: '#020617',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  cartIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(245,158,11,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartEmoji: { fontSize: 18 },
  cartItemLeft: { flex: 1 },
  cartName: { fontWeight: '800', color: '#f8fafc', fontSize: 14 },
  cartSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(245,158,11,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
  },
  qtyBtnText: { color: '#fbbf24', fontWeight: '900', fontSize: 14 },
  qtyNum: { color: '#f8fafc', fontWeight: '800', fontSize: 15, minWidth: 20, textAlign: 'center' },
  cartTotal: { fontWeight: '900', color: '#fbbf24', fontSize: 14, minWidth: 60, textAlign: 'right' },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(239,68,68,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  removeBtnText: { color: '#f87171', fontWeight: '800', fontSize: 12 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 52, marginBottom: 12, opacity: 0.4 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center' },

  footer: {
    backgroundColor: 'rgba(15,23,42,0.9)',
    padding: 20,
    borderRadius: 22,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    shadowColor: '#f59e0b',
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  totalItems: { fontSize: 12, color: '#64748b', marginTop: 2 },
  totalAmount: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  loadingText: { color: '#fbbf24', fontWeight: '700', fontSize: 14 },

  payBtns: { flexDirection: 'row', gap: 12 },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  payBtnCash: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)' },
  payBtnCard: { backgroundColor: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.35)' },
  payBtnIcon: { fontSize: 20 },
  payBtnText: { fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
