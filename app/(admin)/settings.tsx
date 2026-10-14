import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

type SettingKey = 'pharmacy_name' | 'address' | 'phone' | 'contact_email' | 'low_stock_threshold';
type SettingsValues = Record<SettingKey, string>;

const DEFAULTS: SettingsValues = {
  pharmacy_name: 'Farmacia Luci',
  address: '',
  phone: '',
  contact_email: '',
  low_stock_threshold: '5',
};

const FIELDS: { key: SettingKey; label: string; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric' }[] = [
  { key: 'pharmacy_name', label: 'Nombre comercial', placeholder: 'Farmacia Luci' },
  { key: 'address', label: 'Dirección', placeholder: 'Dirección de la farmacia', multiline: true },
  { key: 'phone', label: 'Teléfono de contacto', placeholder: '+51 ...', keyboardType: 'phone-pad' },
  { key: 'contact_email', label: 'Correo de contacto', placeholder: 'contacto@farmacia.pe', keyboardType: 'email-address' },
  { key: 'low_stock_threshold', label: 'Umbral global de stock bajo (unidades)', placeholder: '5', keyboardType: 'numeric' },
];

export default function SettingsScreen() {
  const [values, setValues] = useState<SettingsValues>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { session } = useAuthStore();

  useEffect(() => { void loadSettings(); }, []);

  async function loadSettings() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pharmacy_settings')
      .select('setting_key, setting_value');
    if (error) {
      Alert.alert('No se pudo cargar la configuración', error.message);
    } else {
      const next = { ...DEFAULTS };
      for (const row of data ?? []) {
        if (row.setting_key in next) {
          const key = row.setting_key as SettingKey;
          next[key] = String(row.setting_value ?? '');
        }
      }
      setValues(next);
    }
    setLoading(false);
  }

  async function saveSettings() {
    if (!values.pharmacy_name.trim()) {
      Alert.alert('Falta el nombre comercial', 'Ingresa el nombre de la farmacia.');
      return;
    }
    const threshold = Number(values.low_stock_threshold);
    if (!Number.isInteger(threshold) || threshold < 0) {
      Alert.alert('Umbral inválido', 'El stock mínimo debe ser un número entero igual o mayor que cero.');
      return;
    }

    setSaving(true);
    const updates = Object.entries(values).map(([setting_key, value]) => ({
      setting_key,
      setting_value: setting_key === 'low_stock_threshold' ? threshold : value.trim(),
      updated_by: session?.user.id ?? null,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase
      .from('pharmacy_settings')
      .upsert(updates, { onConflict: 'setting_key' });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo guardar la configuración', error.message);
      return;
    }
    Alert.alert('Configuración guardada', 'Los datos de la farmacia se actualizaron correctamente.');
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Configuración de la farmacia</Text>
      <Text style={s.subtitle}>Administra información de contacto y parámetros de operación.</Text>

      {loading ? <ActivityIndicator color="#2563eb" style={{ marginTop: 30 }} /> : (
        <>
          <View style={s.card}>
            <Text style={s.sectionTitle}>Datos comerciales</Text>
            {FIELDS.map((field) => (
              <View key={field.key} style={s.field}>
                <Text style={s.label}>{field.label}</Text>
                <TextInput
                  style={[s.input, field.multiline && s.multiline]}
                  value={values[field.key]}
                  onChangeText={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboardType ?? 'default'}
                  autoCapitalize={field.key === 'contact_email' ? 'none' : 'sentences'}
                  multiline={field.multiline}
                />
              </View>
            ))}
            <Text style={s.hint}>En el panel de inventario se respeta el valor mayor entre este umbral y el mínimo configurado para cada producto.</Text>
            <TouchableOpacity style={s.saveButton} disabled={saving} onPress={saveSettings}>
              <Text style={s.saveText}>{saving ? 'Guardando…' : 'Guardar configuración'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.noteCard}>
            <Text style={s.noteTitle}>Acceso y seguridad</Text>
            <Text style={s.noteText}>
              Los cambios se guardan en Supabase. La edición de roles continúa restringida a administradores; las claves y credenciales del sistema no se muestran en esta pantalla.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 20, paddingBottom: 40 },
  title: { color: '#111827', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#6b7280', fontSize: 13, marginTop: 5, marginBottom: 18 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 18 },
  sectionTitle: { color: '#1f2937', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  field: { marginBottom: 13 },
  hint: { color: '#6b7280', fontSize: 11, lineHeight: 16, marginTop: -4, marginBottom: 10 },
  label: { color: '#4b5563', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', backgroundColor: '#fff', fontSize: 14 },
  multiline: { minHeight: 78, textAlignVertical: 'top' },
  saveButton: { alignSelf: 'flex-start', backgroundColor: '#1d4ed8', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, marginTop: 4 },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  noteCard: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 12, padding: 15, marginTop: 14 },
  noteTitle: { color: '#1e3a8a', fontSize: 13, fontWeight: '800' },
  noteText: { color: '#1e40af', fontSize: 12, lineHeight: 18, marginTop: 5 },
});
