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
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../lib/theme';

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
      <Text style={s.eyebrow}>CONFIGURACIÓN</Text>
      <Text style={s.title}>Configuración de la farmacia</Text>
      <Text style={s.subtitle}>Administra información de contacto y parámetros de operación.</Text>

      {loading ? <ActivityIndicator color={C.green} style={{ marginTop: 30 }} /> : (
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
                  placeholderTextColor={C.textLight}
                  keyboardType={field.keyboardType ?? 'default'}
                  autoCapitalize={field.key === 'contact_email' ? 'none' : 'sentences'}
                  multiline={field.multiline}
                />
              </View>
            ))}
            <Text style={s.hint}>En el panel de inventario se respeta el valor mayor entre este umbral y el mínimo configurado para cada producto.</Text>
            <TouchableOpacity
              style={[s.saveButton, saving && s.saveButtonDisabled]}
              disabled={saving}
              onPress={saveSettings}
              accessibilityRole="button"
            >
              <Ionicons name="save-outline" size={16} color={C.white} />
              <Text style={s.saveText}>{saving ? 'Guardando…' : 'Guardar configuración'}</Text>
            </TouchableOpacity>
          </View>

          <View style={s.noteCard}>
            <View style={s.noteTitleRow}>
              <Ionicons name="shield-checkmark-outline" size={16} color={C.accent} />
              <Text style={s.noteTitle}>Acceso y seguridad</Text>
            </View>
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
  container: { flex: 1, backgroundColor: C.bgPage },
  content: { padding: 22, paddingBottom: 44, maxWidth: 880, width: '100%', alignSelf: 'center' },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { color: C.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: C.textMid, fontSize: 13, marginTop: 6, marginBottom: 20 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 20 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 16 },
  field: { marginBottom: 14 },
  hint: { color: C.textMid, fontSize: 11, lineHeight: 16, marginTop: -2, marginBottom: 14 },
  label: { color: C.textMid, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: C.borderStrong, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11,
    color: C.text, backgroundColor: C.white, fontSize: 14,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, marginTop: 4,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveText: { color: C.white, fontSize: 13, fontWeight: '700' },
  noteCard: { backgroundColor: C.accentLight, borderWidth: 1, borderColor: '#C9D9EA', borderRadius: 12, padding: 16, marginTop: 16 },
  noteTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  noteTitle: { color: C.accent, fontSize: 13, fontWeight: '700' },
  noteText: { color: C.accent, fontSize: 12, lineHeight: 18, marginTop: 7 },
});
