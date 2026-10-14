import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
type TicketCategory = 'order' | 'payment' | 'inventory' | 'account' | 'technical' | 'other';

interface Ticket {
  id: string;
  created_by: string;
  assigned_to: string | null;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  resolution: string | null;
  created_at: string;
}

interface Profile { id: string; full_name: string | null; email: string | null; }

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En atención' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];
const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];
const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'order', label: 'Pedido' },
  { value: 'payment', label: 'Pago' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'account', label: 'Cuenta' },
  { value: 'technical', label: 'Técnico' },
  { value: 'other', label: 'Otro' },
];

export default function TicketsScreen() {
  const { session, role } = useAuthStore();
  const isAdmin = role === 'admin';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editStatus, setEditStatus] = useState<TicketStatus>('open');
  const [editPriority, setEditPriority] = useState<TicketPriority>('normal');
  const [editResolution, setEditResolution] = useState('');

  useEffect(() => { void loadTickets(); }, [role]);

  async function loadTickets() {
    setLoading(true);
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, created_by, assigned_to, subject, description, category, priority, status, resolution, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      Alert.alert('No se pudieron cargar los tickets', error.message);
      setTickets([]);
      setLoading(false);
      return;
    }
    const loaded = (data ?? []) as Ticket[];
    setTickets(loaded);
    const ids = Array.from(new Set(loaded.map((ticket) => ticket.created_by)));
    if (ids.length) {
      const { data: profileData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      if (profilesError) {
        Alert.alert('No se pudieron cargar los nombres de los solicitantes', profilesError.message);
      } else {
        const nameMap: Record<string, string> = {};
        for (const profile of (profileData ?? []) as Profile[]) {
          nameMap[profile.id] = profile.full_name || profile.email || profile.id.slice(0, 8);
        }
        setProfiles(nameMap);
      }
    }
    setLoading(false);
  }

  async function createTicket() {
    if (!session?.user.id) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para enviar un ticket.');
      return;
    }
    if (subject.trim().length < 4 || description.trim().length < 10) {
      Alert.alert('Completa el ticket', 'El asunto debe tener al menos 4 caracteres y la descripción 10.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('support_tickets').insert({
      created_by: session.user.id,
      subject: subject.trim(),
      description: description.trim(),
      category,
    });
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo crear el ticket', error.message);
      return;
    }
    setSubject('');
    setDescription('');
    Alert.alert('Ticket enviado', 'El equipo administrativo ya puede revisar tu solicitud.');
    await loadTickets();
  }

  function openEditor(ticket: Ticket) {
    setSelectedTicket(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setEditResolution(ticket.resolution ?? '');
  }

  async function saveTicket() {
    if (!selectedTicket || !isAdmin) return;
    if (editStatus === 'resolved' && editResolution.trim().length < 5) {
      Alert.alert('Falta la resolución', 'Escribe al menos 5 caracteres para marcar como resuelto.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: editStatus,
        priority: editPriority,
        resolution: editResolution.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTicket.id);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo actualizar el ticket', error.message);
      return;
    }
    setSelectedTicket(null);
    await loadTickets();
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>{isAdmin ? 'Mesa de ayuda' : 'Ayuda y soporte'}</Text>
      <Text style={s.subtitle}>
        {isAdmin ? 'Revisa solicitudes de clientes y personal; actualiza prioridad y resolución.' : 'Envía una solicitud y consulta el estado de tus tickets.'}
      </Text>

      {!isAdmin && (
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>Crear ticket</Text>
          <TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Asunto" maxLength={120} />
          <Text style={s.label}>Categoría</Text>
          <View style={s.chips}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity key={item.value} style={[s.chip, category === item.value && s.chipSelected]} onPress={() => setCategory(item.value)}>
                <Text style={[s.chipText, category === item.value && s.chipTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[s.input, s.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe el problema o lo que necesitas (mínimo 10 caracteres)"
            multiline
            maxLength={4000}
            textAlignVertical="top"
          />
          <TouchableOpacity style={s.submitButton} disabled={saving} onPress={createTicket}>
            <Text style={s.submitText}>{saving ? 'Enviando…' : 'Enviar ticket'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.listHeader}>
        <Text style={s.sectionTitle}>{isAdmin ? 'Todos los tickets' : 'Mis tickets'}</Text>
        <TouchableOpacity onPress={loadTickets}><Text style={s.refresh}>Actualizar</Text></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator color="#2563eb" style={{ marginTop: 24 }} /> : tickets.length === 0 ? (
        <Text style={s.empty}>No hay tickets para mostrar.</Text>
      ) : tickets.map((ticket) => (
        <TouchableOpacity key={ticket.id} style={s.ticketCard} onPress={() => isAdmin && openEditor(ticket)} activeOpacity={isAdmin ? 0.8 : 1}>
          <View style={s.ticketTop}>
            <Text style={s.ticketSubject}>{ticket.subject}</Text>
            <Text style={[s.status, ticket.status === 'resolved' || ticket.status === 'closed' ? s.statusDone : s.statusOpen]}>
              {STATUSES.find((item) => item.value === ticket.status)?.label}
            </Text>
          </View>
          {isAdmin && <Text style={s.requester}>Solicitante: {profiles[ticket.created_by] || ticket.created_by.slice(0, 8)}</Text>}
          <Text style={s.ticketDescription}>{ticket.description}</Text>
          <View style={s.ticketBottom}>
            <Text style={s.ticketMeta}>{CATEGORIES.find((item) => item.value === ticket.category)?.label} · Prioridad {PRIORITIES.find((item) => item.value === ticket.priority)?.label}</Text>
            <Text style={s.ticketMeta}>{new Date(ticket.created_at).toLocaleDateString('es-PE')}</Text>
          </View>
          {ticket.resolution && <Text style={s.resolution}>Resolución: {ticket.resolution}</Text>}
        </TouchableOpacity>
      ))}

      <Modal visible={selectedTicket !== null} transparent animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
        <View style={s.backdrop}>
          <View style={s.editor}>
            <Text style={s.editorTitle}>Administrar ticket</Text>
            <Text style={s.editorSubject}>{selectedTicket?.subject}</Text>
            <Text style={s.label}>Estado</Text>
            <View style={s.chips}>
              {STATUSES.map((item) => (
                <TouchableOpacity key={item.value} style={[s.chip, editStatus === item.value && s.chipSelected]} onPress={() => setEditStatus(item.value)}>
                  <Text style={[s.chipText, editStatus === item.value && s.chipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Prioridad</Text>
            <View style={s.chips}>
              {PRIORITIES.map((item) => (
                <TouchableOpacity key={item.value} style={[s.chip, editPriority === item.value && s.chipSelected]} onPress={() => setEditPriority(item.value)}>
                  <Text style={[s.chipText, editPriority === item.value && s.chipTextSelected]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Respuesta / resolución</Text>
            <TextInput
              style={[s.input, s.descriptionInput]}
              value={editResolution}
              onChangeText={setEditResolution}
              placeholder="Escribe la respuesta para el solicitante"
              multiline
              maxLength={2000}
            />
            <View style={s.editorActions}>
              <TouchableOpacity style={s.cancelButton} onPress={() => setSelectedTicket(null)} disabled={saving}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.submitButton} onPress={saveTicket} disabled={saving}>
                <Text style={s.submitText}>{saving ? 'Guardando…' : 'Guardar cambios'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 18, paddingBottom: 40 },
  title: { color: '#111827', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#6b7280', fontSize: 13, marginTop: 5, marginBottom: 17 },
  formCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 13, padding: 16, marginBottom: 18 },
  sectionTitle: { color: '#1f2937', fontSize: 16, fontWeight: '800' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, color: '#111827', marginTop: 10, fontSize: 13 },
  descriptionInput: { minHeight: 90, textAlignVertical: 'top' },
  label: { color: '#4b5563', fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 },
  chipSelected: { backgroundColor: '#dbeafe', borderColor: '#60a5fa' },
  chipText: { color: '#4b5563', fontSize: 11, fontWeight: '700' },
  chipTextSelected: { color: '#1d4ed8' },
  submitButton: { backgroundColor: '#1d4ed8', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 12 },
  submitText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  refresh: { color: '#2563eb', fontSize: 12, fontWeight: '700' },
  empty: { color: '#9ca3af', textAlign: 'center', paddingVertical: 20 },
  ticketCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, marginBottom: 9 },
  ticketTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  ticketSubject: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '800' },
  status: { fontSize: 10, fontWeight: '800' },
  statusDone: { color: '#047857' },
  statusOpen: { color: '#b45309' },
  requester: { color: '#2563eb', fontSize: 11, marginTop: 6 },
  ticketDescription: { color: '#4b5563', fontSize: 12, lineHeight: 18, marginTop: 8 },
  ticketBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 11 },
  ticketMeta: { color: '#6b7280', fontSize: 10 },
  resolution: { color: '#065f46', fontSize: 11, marginTop: 8, padding: 8, backgroundColor: '#ecfdf5', borderRadius: 7 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  editor: { backgroundColor: '#fff', borderRadius: 15, padding: 18, width: '100%', maxWidth: 500 },
  editorTitle: { color: '#111827', fontSize: 19, fontWeight: '900' },
  editorSubject: { color: '#4b5563', fontSize: 13, marginTop: 5 },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9 },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  cancelText: { color: '#6b7280', fontSize: 12, fontWeight: '800' },
});
