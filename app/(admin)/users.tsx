import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Switch, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Role = 'admin' | 'stocker' | 'cashier' | 'customer';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

const ROLES: { value: Role; label: string }[] = [
  { value: 'customer', label: 'Cliente' },
  { value: 'cashier', label: 'Cajero' },
  { value: 'stocker', label: 'Inventario' },
  { value: 'admin', label: 'Administrador' },
];

export default function UsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) {
      Alert.alert('Error al cargar usuarios', error.message);
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  }

  async function toggleActive(userId: string, currentValue: boolean) {
    const { error } = await supabase.from('profiles').update({ is_active: !currentValue }).eq('id', userId);
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchUsers();
  }

  async function changeRole(role: Role) {
    if (!editingUser || editingUser.role === role) {
      setEditingUser(null);
      return;
    }

    setSavingRole(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', editingUser.id);
    setSavingRole(false);

    if (error) {
      Alert.alert('No se pudo cambiar el rol', error.message);
      return;
    }

    setEditingUser(null);
    await fetchUsers();
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Gestión de Usuarios</Text>
      <Text style={s.subtitle}>Solo un administrador puede asignar o cambiar roles.</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.full_name || item.email}</Text>
              <Text style={s.email}>{item.email}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Cambiar rol de ${item.full_name || item.email}`}
                style={[s.roleBadge, { backgroundColor: item.role === 'admin' ? '#dbeafe' : item.role === 'cashier' ? '#fef3c7' : item.role === 'stocker' ? '#d1fae5' : '#ede9fe' }]}
                onPress={() => setEditingUser(item)}
              >
                <Text style={[s.roleText, { color: item.role === 'admin' ? '#1e40af' : item.role === 'cashier' ? '#92400e' : item.role === 'stocker' ? '#065f46' : '#5b21b6' }]}>
                  {ROLES.find((role) => role.value === item.role)?.label ?? item.role} · Cambiar
                </Text>
              </TouchableOpacity>
            </View>
            <Switch value={item.is_active} onValueChange={() => toggleActive(item.id, item.is_active)} />
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>{loading ? 'Cargando usuarios...' : 'No hay usuarios registrados.'}</Text>}
      />
      <Modal
        visible={editingUser !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !savingRole && setEditingUser(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Asignar rol</Text>
            <Text style={s.modalDescription}>{editingUser?.email}</Text>
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.value}
                accessibilityRole="button"
                disabled={savingRole}
                style={[s.roleOption, editingUser?.role === role.value && s.roleOptionSelected]}
                onPress={() => changeRole(role.value)}
              >
                <Text style={[s.roleOptionText, editingUser?.role === role.value && s.roleOptionTextSelected]}>
                  {role.label}{editingUser?.role === role.value ? ' · Actual' : ''}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={savingRole}
              style={s.cancelButton}
              onPress={() => setEditingUser(null)}
            >
              <Text style={s.cancelButtonText}>{savingRole ? 'Guardando...' : 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  subtitle: { color: '#6b7280', fontSize: 13, marginTop: -10, marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontWeight: '700', color: '#1f2937', fontSize: 15 },
  email: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15,23,42,0.55)' },
  modalCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, maxWidth: 420, width: '100%', alignSelf: 'center' },
  modalTitle: { color: '#111827', fontSize: 20, fontWeight: '800' },
  modalDescription: { color: '#6b7280', fontSize: 14, marginTop: 4, marginBottom: 14 },
  roleOption: { paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 8 },
  roleOptionSelected: { backgroundColor: '#eff6ff', borderColor: '#60a5fa' },
  roleOptionText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  roleOptionTextSelected: { color: '#1d4ed8' },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#6b7280', fontSize: 14, fontWeight: '700' },
});
