import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

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

  return (
    <View style={s.container}>
      <Text style={s.title}>Ajuste de Stock</Text>

      {loading ? <ActivityIndicator color="#16a34a" /> : (
        <FlatList
          data={products}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={<Text style={s.hint}>Selecciona un producto para ajustar:</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.card, selectedId === item.id && s.cardSelected]}
              onPress={() => setSelectedId(item.id)}
            >
              <Text style={s.cardName}>{item.name}</Text>
              <Text style={s.cardStock}>Stock: {item.stock}</Text>
            </TouchableOpacity>
          )}
          ListFooterComponent={selectedId ? (
            <View style={s.form}>
              <Text style={s.label}>Cantidad (+/-)</Text>
              <TextInput style={s.input} value={qty} onChangeText={setQty} keyboardType="number-pad" placeholder="+10 o -5" />
              <Text style={s.label}>Motivo</Text>
              <TextInput style={s.input} value={notes} onChangeText={setNotes} placeholder="Razón del ajuste" />
              <TouchableOpacity style={s.btn} onPress={handleAdjust}>
                <Text style={s.btnText}>Aplicar Ajuste</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  hint: { color: '#6b7280', marginBottom: 8, fontSize: 13 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#e5e7eb' },
  cardSelected: { borderColor: '#16a34a', borderWidth: 2, backgroundColor: '#f0fdf4' },
  cardName: { fontWeight: '600', color: '#1f2937', fontSize: 14 },
  cardStock: { fontWeight: 'bold', color: '#6b7280' },
  form: { marginTop: 16, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#d1d5db' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 14, backgroundColor: '#f9fafb' },
  btn: { backgroundColor: '#16a34a', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
