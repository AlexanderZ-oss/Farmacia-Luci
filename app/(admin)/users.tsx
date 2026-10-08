import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data) setUsers(data);
    setLoading(false);
  }

  async function toggleActive(userId: string, currentValue: boolean) {
    const { error } = await supabase.from('profiles').update({ is_active: !currentValue }).eq('id', userId);
    if (error) { Alert.alert('Error', error.message); return; }
    fetchUsers();
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>Gestión de Usuarios</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.full_name || item.email}</Text>
              <Text style={s.email}>{item.email}</Text>
              <View style={[s.roleBadge, { backgroundColor: item.role === 'admin' ? '#dbeafe' : item.role === 'cashier' ? '#fef3c7' : '#d1fae5' }]}>
                <Text style={[s.roleText, { color: item.role === 'admin' ? '#1e40af' : item.role === 'cashier' ? '#92400e' : '#065f46' }]}>{item.role}</Text>
              </View>
            </View>
            <Switch value={item.is_active} onValueChange={() => toggleActive(item.id, item.is_active)} />
          </View>
        )}
        ListEmptyComponent={<Text style={s.empty}>No hay usuarios registrados.</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontWeight: '700', color: '#1f2937', fontSize: 15 },
  email: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 6, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
});
