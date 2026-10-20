import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

export default function StockScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const { session } = useAuthStore();

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    const { data } = await supabase.from('products').select('id, name, stock').order('name');
    setProducts(data || []);
    setLoading(false);
  }

  async function handleAdjust() {
    if (!selectedId || !qty) { Alert.alert('Error', 'Selecciona un producto y cantidad'); return; }
    const change = parseInt(qty);
    if (isNaN(change) || change === 0) { Alert.alert('Error', 'Cantidad inválida'); return; }

    const { error: moveError } = await supabase.from('stock_movements').insert({
      product_id: selectedId, quantity_change: change, movement_type: 'adjustment', notes, created_by: session?.user?.id,
    });
    if (moveError) { Alert.alert('Error', moveError.message); return; }

    const product = products.find(p => p.id === selectedId);
    await supabase.from('products').update({ stock: (product?.stock || 0) + change }).eq('id', selectedId);

    Alert.alert('Éxito', 'Stock ajustado correctamente');
    setSelectedId(null); setQty(''); setNotes('');
    fetchProducts();
  }

  const selected = products.find(p => p.id === selectedId);

  return (
    <View style={s.container}>
      <Text style={s.eyebrow}>MOVIMIENTOS</Text>
      <Text style={s.title}>Ajuste de stock</Text>
      <Text style={s.subtitle}>Selecciona un producto y registra el ingreso o salida de unidades.</Text>

      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 28 }}
          ListHeaderComponent={<Text style={s.hint}>Productos disponibles</Text>}
          renderItem={({ item }) => {
            const isSelected = selectedId === item.id;
            return (
              <TouchableOpacity
                style={[s.card, isSelected && s.cardSelected]}
                onPress={() => setSelectedId(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Seleccionar ${item.name}`}
              >
                <View style={[s.checkBox, isSelected && s.checkBoxOn]}>
                  {isSelected && <Ionicons name="checkmark" size={13} color={C.white} />}
                </View>
                <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
                <View style={[s.stockBadge, item.stock < 5 && s.stockBadgeLow]}>
                  <Text style={[s.cardStock, item.stock < 5 && s.cardStockLow]}>Stock {item.stock}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={selected ? (
            <View style={s.form}>
              <View style={s.formHeader}>
                <Ionicons name="swap-vertical-outline" size={17} color={C.greenDark} />
                <Text style={s.formTitle}>{selected.name}</Text>
              </View>
              <Text style={s.label}>Cantidad (+ ingreso / − salida)</Text>
              <TextInput
                style={s.input}
                value={qty}
                onChangeText={setQty}
                keyboardType="number-pad"
                placeholder="+10 o -5"
                placeholderTextColor={C.textLight}
              />
              <Text style={s.label}>Motivo</Text>
              <TextInput
                style={s.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Razón del ajuste"
                placeholderTextColor={C.textLight}
              />
              <TouchableOpacity style={s.btn} onPress={handleAdjust} accessibilityRole="button">
                <Ionicons name="checkmark-circle-outline" size={17} color={C.white} />
                <Text style={s.btnText}>Aplicar ajuste</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage, padding: 22, maxWidth: 880, width: '100%', alignSelf: 'center' },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { fontSize: 23, fontWeight: '700', color: C.text, letterSpacing: -0.4 },
  subtitle: { color: C.textMid, fontSize: 13, marginTop: 6, marginBottom: 18 },
  hint: { color: C.textMid, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginBottom: 10 },
  card: {
    backgroundColor: C.white, padding: 14, borderRadius: 10, marginBottom: 7,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.border,
  },
  cardSelected: { borderColor: C.green, backgroundColor: C.greenLight },
  checkBox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 1, borderColor: C.borderStrong,
    backgroundColor: C.white,
    justifyContent: 'center', alignItems: 'center',
  },
  checkBoxOn: { backgroundColor: C.green, borderColor: C.green },
  cardName: { flex: 1, fontWeight: '600', color: C.text, fontSize: 14 },
  stockBadge: { backgroundColor: C.accentLight, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6 },
  stockBadgeLow: { backgroundColor: '#FEF3C7' },
  cardStock: { fontWeight: '700', color: C.accent, fontSize: 12 },
  cardStockLow: { color: '#92400E' },
  form: {
    marginTop: 18, backgroundColor: C.white, padding: 18, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  formTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.text },
  label: { fontSize: 12, fontWeight: '600', color: C.textMid, marginBottom: 7, letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: C.borderStrong, paddingHorizontal: 12, paddingVertical: 11,
    borderRadius: 8, fontSize: 14, marginBottom: 14, backgroundColor: C.white, color: C.text,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.green, paddingVertical: 14, borderRadius: 8,
  },
  btnText: { color: C.white, fontWeight: '700', fontSize: 14 },
});
