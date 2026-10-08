import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, Switch } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

export default function ProductFormScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuthStore();
  const isEditing = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [stock, setStock] = useState('0');
  const [requiresAge, setRequiresAge] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditing) fetchProduct();
  }, [id]);

  async function fetchProduct() {
    const { data } = await supabase.from('products').select('*').eq('id', id).single();
    if (data) {
      setName(data.name); setDescription(data.description || ''); setPrice(String(data.price));
      setCostPrice(String(data.cost_price || '')); setBarcode(data.barcode || '');
      setStock(String(data.stock)); setRequiresAge(data.requires_age_verification);
    }
  }

  async function handleSave() {
    if (!name || !price) { Alert.alert('Error', 'Nombre y precio son obligatorios'); return; }
    setLoading(true);
    const payload = {
      name, description, price: parseFloat(price), cost_price: costPrice ? parseFloat(costPrice) : null,
      barcode: barcode || null, stock: parseInt(stock) || 0, requires_age_verification: requiresAge,
      updated_by: session?.user?.id,
      ...(isEditing ? {} : { created_by: session?.user?.id }),
    };
    const query = isEditing
      ? supabase.from('products').update(payload).eq('id', id)
      : supabase.from('products').insert(payload);
    const { error } = await query;
    if (error) { Alert.alert('Error', error.message); }
    else { Alert.alert('Éxito', isEditing ? 'Producto actualizado' : 'Producto creado'); router.back(); }
    setLoading(false);
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>{isEditing ? 'Editar' : 'Nuevo'} Producto</Text>

      <Text style={s.label}>Nombre *</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Paracetamol 500mg" />

      <Text style={s.label}>Descripción</Text>
      <TextInput style={[s.input, { height: 80 }]} value={description} onChangeText={setDescription} multiline placeholder="Descripción del producto..." />

      <Text style={s.label}>Precio de Venta *</Text>
      <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" />

      <Text style={s.label}>Precio de Costo</Text>
      <TextInput style={s.input} value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" placeholder="0.00" />

      <Text style={s.label}>Código de Barras</Text>
      <TextInput style={s.input} value={barcode} onChangeText={setBarcode} placeholder="7750000000000" />

      <Text style={s.label}>Stock Inicial</Text>
      <TextInput style={s.input} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="0" />

      <View style={s.switchRow}>
        <Text style={s.label}>Requiere verificación +18</Text>
        <Switch value={requiresAge} onValueChange={setRequiresAge} />
      </View>

      <TouchableOpacity style={[s.btn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Guardando...' : 'Guardar Producto'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  btn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
