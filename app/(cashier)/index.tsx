import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useRouter } from 'expo-router';

interface PosItem { product_id: string; name: string; price: number; quantity: number; }

export default function CashierPOS() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [cart, setCart] = useState<PosItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { session, signOut } = useAuthStore();
  const router = useRouter();

  async function searchProducts(query: string) {
    setSearch(query);
    if (query.length < 2) { setResults([]); return; }
    const { data } = await supabase.from('products').select('id, name, price, stock, barcode')
      .or(`name.ilike.%${query}%,barcode.eq.${query}`).eq('is_active', true).limit(10);
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
  }

  function removeFromCart(productId: string) {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }

  const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  async function handleSale(paymentMethod: string) {
    if (cart.length === 0) { Alert.alert('Error', 'Agrega productos al carrito'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('confirm-sale', {
        body: { items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })), payment_method: paymentMethod },
      });
      if (error) throw error;
      Alert.alert('✅ Venta Completada', `Total: S/ ${total.toFixed(2)}\nMétodo: ${paymentMethod}`);
      setCart([]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo procesar la venta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={s.wrapper}>
      <View style={s.gradientBg}>
        <View style={s.circle1} />
        <View style={s.circle2} />
      </View>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Punto de Venta</Text>
          <TouchableOpacity style={s.logoutBtnSm} onPress={() => signOut()}>
            <Text style={s.logoutTextSm}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchContainer}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput 
            style={s.searchInput} 
            value={search} 
            onChangeText={searchProducts}
            placeholder="Buscar por nombre o código..." 
            placeholderTextColor="#64748b"
          />
        </View>

        {results.length > 0 && (
          <View style={s.resultsList}>
            {results.map(p => (
              <TouchableOpacity key={p.id} style={s.resultItem} onPress={() => addToCart(p)}>
                <View style={{flex: 1}}>
                  <Text style={s.resultName}>{p.name}</Text>
                  <Text style={s.resultPrice}>S/ {Number(p.price).toFixed(2)}</Text>
                </View>
                <View style={s.stockBadge}>
                  <Text style={s.stockText}>Stock: {p.stock}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Cart */}
        <View style={s.cartHeaderRow}>
          <Text style={s.sectionTitle}>Carrito</Text>
          <Text style={s.itemCount}>{cart.length} items</Text>
        </View>
        
        <View style={s.cartContainer}>
          <FlatList
            data={cart}
            keyExtractor={(i) => i.product_id}
            renderItem={({ item }) => (
              <View style={s.cartItem}>
                <View style={s.cartItemLeft}>
                  <Text style={s.cartName}>{item.name}</Text>
                  <Text style={s.cartSub}>S/ {item.price.toFixed(2)} × {item.quantity}</Text>
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
                <Text style={s.empty}>Escanea o busca un producto</Text>
              </View>
            }
          />
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total a Pagar</Text>
            <Text style={s.totalAmount}>S/ {total.toFixed(2)}</Text>
          </View>
          <View style={s.payBtns}>
            <TouchableOpacity style={[s.payBtn, { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: 'rgba(16,185,129,0.4)' }]} onPress={() => handleSale('cash')} disabled={loading}>
              <Text style={[s.payBtnText, { color: '#34d399' }]}>💵 Efectivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.payBtn, { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: 'rgba(59,130,246,0.4)' }]} onPress={() => handleSale('card')} disabled={loading}>
              <Text style={[s.payBtnText, { color: '#60a5fa' }]}>💳 Tarjeta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  gradientBg: { ...StyleSheet.absoluteFillObject },
  circle1: { position: 'absolute', width: 350, height: 350, borderRadius: 175, backgroundColor: 'rgba(59,130,246,0.1)', top: -100, right: -100 },
  circle2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(16,185,129,0.08)', bottom: 50, left: -80 },
  container: { flex: 1, padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#f1f5f9', letterSpacing: 0.5 },
  logoutBtnSm: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutTextSm: { color: '#fca5a5', fontWeight: '700', fontSize: 13 },

  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(15,23,42,0.6)', 
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', 
    borderRadius: 14, paddingHorizontal: 16, marginBottom: 16 
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#f1f5f9' },
  
  resultsList: { 
    backgroundColor: 'rgba(30,41,59,0.95)', 
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(148,163,184,0.2)', 
    marginBottom: 20, maxHeight: 200, zIndex: 10
  },
  resultItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.1)', flexDirection: 'row', alignItems: 'center' },
  resultName: { fontWeight: '600', color: '#f1f5f9', fontSize: 15 },
  resultPrice: { color: '#94a3b8', fontSize: 13, marginTop: 4 },
  stockBadge: { backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  stockText: { color: '#60a5fa', fontSize: 12, fontWeight: '700' },

  cartHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  itemCount: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  
  cartContainer: { flex: 1 },
  cartItem: { 
    backgroundColor: 'rgba(30,41,59,0.6)', 
    padding: 16, borderRadius: 14, marginBottom: 8, 
    flexDirection: 'row', alignItems: 'center', 
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.1)' 
  },
  cartItemLeft: { flex: 1 },
  cartName: { fontWeight: '700', color: '#f1f5f9', fontSize: 15, marginBottom: 4 },
  cartSub: { color: '#94a3b8', fontSize: 13 },
  cartTotal: { fontWeight: '800', color: '#38bdf8', fontSize: 16, marginRight: 16 },
  removeBtn: { backgroundColor: 'rgba(239,68,68,0.1)', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#f87171', fontWeight: '800', fontSize: 14 },
  
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16, opacity: 0.5 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 16, fontWeight: '500' },
  
  footer: { 
    backgroundColor: 'rgba(15,23,42,0.8)', 
    padding: 20, borderRadius: 20, marginTop: 16,
    borderWidth: 1, borderColor: 'rgba(148,163,184,0.15)'
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 15, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalAmount: { fontSize: 28, fontWeight: '800', color: '#f1f5f9' },
  payBtns: { flexDirection: 'row', gap: 12 },
  payBtn: { flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  payBtnText: { fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
