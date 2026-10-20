import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Switch, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { C } from '../../lib/theme';

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

const ROLE_TINTS: Record<Role, { bg: string; text: string }> = {
  admin:   { bg: C.accentLight, text: C.accent },
  cashier: { bg: '#FEF3C7',     text: '#92400E' },
  stocker: { bg: C.greenLight,  text: C.greenDark },
  customer:{ bg: C.bgSubtle,    text: C.textMid },
};

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
      <Text style={s.eyebrow}>USUARIOS</Text>
      <Text style={s.title}>Gestión de usuarios</Text>
      <Text style={s.subtitle}>Solo un administrador puede asignar o cambiar roles.</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const tint = ROLE_TINTS[item.role] ?? ROLE_TINTS.customer;
          return (
            <View style={s.card}>
              <View style={s.avatarBox}>
                <Ionicons name="person-outline" size={17} color={C.textMid} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.full_name || item.email}</Text>
                <Text style={s.email}>{item.email}</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Cambiar rol de ${item.full_name || item.email}`}
                  style={[s.roleBadge, { backgroundColor: tint.bg }]}
                  onPress={() => setEditingUser(item)}
                >
                  <Text style={[s.roleText, { color: tint.text }]}>
                    {ROLES.find((role) => role.value === item.role)?.label ?? item.role}
                  </Text>
                  <Ionicons name="swap-horizontal-outline" size={13} color={tint.text} />
                </TouchableOpacity>
              </View>
              <Switch
                value={item.is_active}
                onValueChange={() => toggleActive(item.id, item.is_active)}
                trackColor={{ false: C.borderStrong, true: C.greenMid }}
                thumbColor={C.white}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Ionicons name="people-outline" size={34} color={C.textLight} />
            <Text style={s.empty}>{loading ? 'Cargando usuarios...' : 'No hay usuarios registrados.'}</Text>
          </View>
        }
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
                {editingUser?.role === role.value && (
                  <Ionicons name="checkmark-circle" size={17} color={C.green} />
                )}
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
  container: { flex: 1, backgroundColor: C.bgPage, padding: 22 },
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { fontSize: 23, fontWeight: '700', color: C.text, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { color: C.textMid, fontSize: 13, marginBottom: 18 },
  card: {
    backgroundColor: C.white, padding: 16, borderRadius: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: C.border,
  },
  avatarBox: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: C.bgSubtle,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  name: { fontWeight: '700', color: C.text, fontSize: 15 },
  email: { color: C.textMid, fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6,
    marginTop: 8, alignSelf: 'flex-start',
  },
  roleText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  emptyBox: { alignItems: 'center', gap: 10, marginTop: 40 },
  empty: { textAlign: 'center', color: C.textMid, fontSize: 14 },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(14,43,41,0.55)' },
  modalCard: { backgroundColor: C.white, borderRadius: 12, padding: 20, maxWidth: 420, width: '100%', alignSelf: 'center', borderWidth: 1, borderColor: C.border },
  modalTitle: { color: C.text, fontSize: 19, fontWeight: '700' },
  modalDescription: { color: C.textMid, fontSize: 13, marginTop: 4, marginBottom: 14 },
  roleOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, marginTop: 8,
  },
  roleOptionSelected: { backgroundColor: C.greenLight, borderColor: C.green },
  roleOptionText: { color: C.textMid, fontSize: 14, fontWeight: '600' },
  roleOptionTextSelected: { color: C.greenDark, fontWeight: '700' },
  cancelButton: { paddingVertical: 12, alignItems: 'center', marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong },
  cancelButtonText: { color: C.textMid, fontSize: 13, fontWeight: '700' },
});
