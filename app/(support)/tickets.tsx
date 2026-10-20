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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { C, IconName } from '../../lib/theme';

type TicketStatus = 'open' | 'in_progress' | 'resolved';
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
  resolved_at: string | null;
}

interface Profile { id: string; full_name: string | null; email: string | null; role: string | null; }

/** Los 3 pasos de la barra de progreso. */
const STEPS: { value: TicketStatus; label: string; icon: IconName }[] = [
  { value: 'open',        label: 'Inicio',      icon: 'flag-outline' },
  { value: 'in_progress', label: 'En proceso',  icon: 'hourglass-outline' },
  { value: 'resolved',    label: 'Finalizado',  icon: 'checkmark-circle-outline' },
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

const PRIORITY_TINTS: Record<TicketPriority, { bg: string; text: string }> = {
  low:    { bg: C.bgSubtle,    text: C.textMid },
  normal: { bg: C.accentLight, text: C.accent },
  high:   { bg: '#FEF3C7',     text: '#92400E' },
  urgent: { bg: '#FEE2E2',     text: '#991B1B' },
};

/** Etiqueta de área según el rol de quien crea el ticket. */
const AREA_BY_ROLE: Record<string, { label: string; icon: IconName }> = {
  admin:    { label: 'Administración', icon: 'shield-checkmark-outline' },
  cashier:  { label: 'Caja',           icon: 'cart-outline' },
  stocker:  { label: 'Inventario',     icon: 'cube-outline' },
  customer: { label: 'Cliente',        icon: 'person-outline' },
};

const AREA_TINTS: Record<string, { bg: string; text: string }> = {
  admin:    { bg: C.accentLight, text: C.accent },
  cashier:  { bg: C.greenLight,  text: C.greenDark },
  stocker:  { bg: '#FEF3C7',     text: '#92400E' },
  customer: { bg: C.bgSubtle,    text: C.textMid },
};

function stepIndex(status: TicketStatus) { return STEPS.findIndex((step) => step.value === status); }

export default function TicketsScreen() {
  const { session, role } = useAuthStore();
  const router = useRouter();
  const isAdmin = role === 'admin';

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('other');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editPriority, setEditPriority] = useState<TicketPriority>('normal');
  const [editResolution, setEditResolution] = useState('');

  useEffect(() => { void loadTickets(); }, [role]);

  const goBackToPanel = () => {
    if (role === 'admin') router.replace('/(admin)');
    else if (role === 'stocker') router.replace('/(stocker)');
    else if (role === 'cashier') router.replace('/(cashier)');
    else router.replace('/(store)');
  };

  const myArea = AREA_BY_ROLE[role ?? 'customer'] ?? AREA_BY_ROLE.customer;

  async function loadTickets() {
    setLoading(true);
    const FIELDS = 'id, created_by, assigned_to, subject, description, category, priority, status, resolution, created_at';
    // Se usa `any` deliberadamente: el select cambia según exista o no resolved_at.
    let query: any = await supabase
      .from('support_tickets')
      .select(`${FIELDS}, resolved_at`)
      .order('created_at', { ascending: false })
      .limit(200);

    // La columna resolved_at llega con la migración 010. Si aún no está aplicada,
    // reintentamos sin ella para no romper la pantalla.
    if (query.error && /resolved_at/i.test(query.error.message)) {
      query = await supabase
        .from('support_tickets')
        .select(FIELDS)
        .order('created_at', { ascending: false })
        .limit(200);
    }

    if (query.error) {
      Alert.alert('No se pudieron cargar los tickets', query.error.message);
      setTickets([]);
      setLoading(false);
      return;
    }
    const loaded = (query.data ?? []) as Ticket[];
    setTickets(loaded);
    const ids = Array.from(new Set(loaded.map((ticket) => ticket.created_by)));
    if (ids.length) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', ids);
      const map: Record<string, Profile> = {};
      for (const profile of (profileData ?? []) as Profile[]) map[profile.id] = profile;
      setProfiles(map);
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
    Alert.alert('Ticket enviado', 'El administrador ya puede revisar tu solicitud.');
    await loadTickets();
  }

  function openEditor(ticket: Ticket) {
    setSelectedTicket(ticket);
    setEditPriority(ticket.priority);
    setEditResolution(ticket.resolution ?? '');
  }

  /** Mueve el ticket al paso indicado de la barra de progreso. */
  async function setStep(ticket: Ticket, status: TicketStatus) {
    if (!isAdmin) return;
    const previous = ticket.status;
    if (previous === status) return;

    // Optimista: reflejamos el cambio de inmediato en la lista.
    setTickets((current) => current.map((item) => (
      item.id === ticket.id
        ? { ...item, status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }
        : item
    )));
    if (selectedTicket?.id === ticket.id) {
      setSelectedTicket({ ...selectedTicket, status, resolved_at: status === 'resolved' ? new Date().toISOString() : null });
    }

    const updatePayload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    // resolved_at solo existe tras la migración 010.
    updatePayload.resolved_at = status === 'resolved' ? new Date().toISOString() : null;

    let result = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', ticket.id);

    if (result.error && /resolved_at/i.test(result.error.message)) {
      const fallback: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      result = await supabase.from('support_tickets').update(fallback).eq('id', ticket.id);
    }

    if (result.error) {
      // Revertimos si falló.
      setTickets((current) => current.map((item) => (
        item.id === ticket.id ? { ...item, status: previous } : item
      )));
      Alert.alert('No se pudo actualizar el estado', result.error.message);
      return;
    }
    await loadTickets();
  }

  async function saveDetails() {
    if (!selectedTicket || !isAdmin) return;
    if (selectedTicket.status === 'resolved' && editResolution.trim().length < 5) {
      Alert.alert('Falta la resolución', 'Escribe al menos 5 caracteres para el ticket finalizado.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({
        priority: editPriority,
        resolution: editResolution.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTicket.id);
    setSaving(false);
    if (error) {
      Alert.alert('No se pudo guardar', error.message);
      return;
    }
    setSelectedTicket(null);
    await loadTickets();
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.heading}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={goBackToPanel}
          accessibilityRole="button"
          accessibilityLabel="Volver a mi panel"
        >
          <Ionicons name="arrow-back" size={16} color={C.textMid} />
          <Text style={s.backText}>Volver a mi panel</Text>
        </TouchableOpacity>
        <View style={s.headingCopy}>
          <Text style={s.eyebrow}>SOPORTE</Text>
          <Text style={s.title}>{isAdmin ? 'Mesa de ayuda' : 'Reportar incidencia'}</Text>
          <Text style={s.subtitle}>
            {isAdmin
              ? 'Revisa los tickets de todas las áreas y avanza su progreso: Inicio, En proceso y Finalizado.'
              : `Envía una incidencia de tu área (${myArea.label}) y sigue su estado.`}
          </Text>
        </View>
      </View>

      {!isAdmin && (
        <View style={s.formCard}>
          <View style={s.formHeader}>
            <Text style={s.sectionTitle}>Crear ticket</Text>
            <View style={[s.areaBadge, { backgroundColor: myArea ? (AREA_TINTS[role ?? 'customer']?.bg ?? C.bgSubtle) : C.bgSubtle }]}>
              <Ionicons name={myArea.icon} size={12} color={AREA_TINTS[role ?? 'customer']?.text ?? C.textMid} />
              <Text style={[s.areaText, { color: AREA_TINTS[role ?? 'customer']?.text ?? C.textMid }]}>Área: {myArea.label}</Text>
            </View>
          </View>
          <TextInput
            style={s.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Asunto"
            placeholderTextColor={C.textLight}
            maxLength={120}
          />
          <Text style={s.label}>Categoría</Text>
          <View style={s.chips}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity key={item.value} style={[s.chip, category === item.value && s.chipSelected]} onPress={() => setCategory(item.value)} accessibilityRole="button">
                <Text style={[s.chipText, category === item.value && s.chipTextSelected]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[s.input, s.descriptionInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe el problema o lo que necesitas (mínimo 10 caracteres)"
            placeholderTextColor={C.textLight}
            multiline
            maxLength={4000}
            textAlignVertical="top"
          />
          <TouchableOpacity style={s.submitButton} disabled={saving} onPress={createTicket} accessibilityRole="button">
            <Ionicons name="send-outline" size={15} color={C.white} />
            <Text style={s.submitText}>{saving ? 'Enviando…' : 'Enviar ticket'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.listHeader}>
        <Text style={s.sectionTitle}>{isAdmin ? 'Todos los tickets' : 'Mis tickets'}</Text>
        <TouchableOpacity style={s.refreshButton} onPress={loadTickets} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={14} color={C.textMid} />
          <Text style={s.refresh}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={C.green} style={{ marginTop: 24 }} />
      ) : tickets.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="chatbubbles-outline" size={34} color={C.textLight} />
          <Text style={s.empty}>No hay tickets para mostrar.</Text>
        </View>
      ) : tickets.map((ticket) => {
        const priority = PRIORITY_TINTS[ticket.priority] ?? PRIORITY_TINTS.normal;
        const requester = profiles[ticket.created_by];
        const area = AREA_BY_ROLE[requester?.role ?? 'customer'] ?? AREA_BY_ROLE.customer;
        const areaTint = AREA_TINTS[requester?.role ?? 'customer'] ?? AREA_TINTS.customer;
        const currentIndex = stepIndex(ticket.status);
        const isDone = ticket.status === 'resolved';

        return (
          <View key={ticket.id} style={s.ticketCard}>
            <View style={s.ticketTop}>
              <Text style={s.ticketSubject}>{ticket.subject}</Text>
              <View style={[s.areaBadge, { backgroundColor: areaTint.bg }]}>
                <Ionicons name={area.icon} size={11} color={areaTint.text} />
                <Text style={[s.areaText, { color: areaTint.text }]}>{area.label}</Text>
              </View>
            </View>

            {isAdmin && (
              <Text style={s.requester}>Solicitante: {requester?.full_name || requester?.email || ticket.created_by.slice(0, 8)}</Text>
            )}
            <Text style={s.ticketDescription}>{ticket.description}</Text>

            {/* Barra de progreso: Inicio → En proceso → Finalizado */}
            <View style={s.progressWrap}>
              <View style={s.progressRow}>
                {STEPS.map((step, index) => {
                  const reached = index <= currentIndex;
                  const isCurrent = index === currentIndex;
                  const canTap = isAdmin;
                  return (
                    <View key={step.value} style={s.progressStep}>
                      <TouchableOpacity
                        style={[
                          s.progressNode,
                          reached && s.progressNodeReached,
                          isCurrent && s.progressNodeCurrent,
                        ]}
                        onPress={canTap ? () => setStep(ticket, step.value) : undefined}
                        disabled={!canTap}
                        accessibilityRole={canTap ? 'button' : undefined}
                        accessibilityLabel={`${step.label}${canTap ? ' (cambiar estado)' : ''}`}
                        activeOpacity={canTap ? 0.7 : 1}
                      >
                        <Ionicons
                          name={reached ? step.icon : 'ellipse-outline'}
                          size={13}
                          color={reached ? C.white : C.textLight}
                        />
                      </TouchableOpacity>
                      {index < STEPS.length - 1 && (
                        <View style={[s.progressBar, index < currentIndex && s.progressBarFilled]} />
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={s.progressLabels}>
                {STEPS.map((step, index) => (
                  <Text key={step.value} style={[s.progressLabel, index <= currentIndex && s.progressLabelActive]}>
                    {step.label}
                  </Text>
                ))}
              </View>
            </View>

            <View style={s.ticketBottom}>
              <View style={s.metaRow}>
                <Text style={s.ticketMeta}>{CATEGORIES.find((item) => item.value === ticket.category)?.label}</Text>
                <View style={[s.priorityBadge, { backgroundColor: priority.bg }]}>
                  <Text style={[s.priorityText, { color: priority.text }]}>
                    {PRIORITIES.find((item) => item.value === ticket.priority)?.label}
                  </Text>
                </View>
              </View>
              <Text style={s.ticketMeta}>{new Date(ticket.created_at).toLocaleDateString('es-PE')}</Text>
            </View>

            {ticket.resolution && (
              <View style={[s.resolutionBox, isDone && s.resolutionBoxDone]}>
                <Ionicons name={isDone ? 'checkmark-circle-outline' : 'chatbox-ellipses-outline'} size={13} color={C.greenDark} />
                <Text style={s.resolution}>{ticket.resolution}</Text>
              </View>
            )}

            {isAdmin && (
              <TouchableOpacity style={s.manageButton} onPress={() => openEditor(ticket)} accessibilityRole="button">
                <Ionicons name="create-outline" size={14} color={C.greenDark} />
                <Text style={s.manageText}>Prioridad y respuesta</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Editor del admin: prioridad + respuesta */}
      <Modal visible={selectedTicket !== null} transparent animationType="fade" onRequestClose={() => setSelectedTicket(null)}>
        <View style={s.backdrop}>
          <View style={s.editor}>
            <Text style={s.editorTitle}>Administrar ticket</Text>
            <Text style={s.editorSubject}>{selectedTicket?.subject}</Text>

            <Text style={s.label}>Progreso</Text>
            <View style={s.editorSteps}>
              {STEPS.map((step, index) => {
                const currentIndex = selectedTicket ? stepIndex(selectedTicket.status) : 0;
                const reached = index <= currentIndex;
                return (
                  <TouchableOpacity
                    key={step.value}
                    style={[s.editorStep, reached && s.editorStepReached]}
                    onPress={() => selectedTicket && setStep(selectedTicket, step.value)}
                    accessibilityRole="button"
                  >
                    <Ionicons name={reached ? step.icon : 'ellipse-outline'} size={13} color={reached ? C.white : C.textLight} />
                    <Text style={[s.editorStepText, reached && s.editorStepTextReached]}>{step.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.label}>Prioridad</Text>
            <View style={s.chips}>
              {PRIORITIES.map((item) => (
                <TouchableOpacity key={item.value} style={[s.chip, editPriority === item.value && s.chipSelected]} onPress={() => setEditPriority(item.value)} accessibilityRole="button">
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
              placeholderTextColor={C.textLight}
              multiline
              maxLength={2000}
            />
            <View style={s.editorActions}>
              <TouchableOpacity style={s.cancelButton} onPress={() => setSelectedTicket(null)} disabled={saving} accessibilityRole="button">
                <Text style={s.cancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveButton} onPress={saveDetails} disabled={saving} accessibilityRole="button">
                <Text style={s.saveText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bgPage },
  content: { padding: 22, paddingBottom: 44, maxWidth: 980, width: '100%', alignSelf: 'center' },

  heading: { marginBottom: 20 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  backText: { color: C.textMid, fontSize: 12, fontWeight: '700' },
  headingCopy: {},
  eyebrow: { color: C.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.6, marginBottom: 6 },
  title: { color: C.text, fontSize: 23, fontWeight: '700', letterSpacing: -0.4 },
  subtitle: { color: C.textMid, fontSize: 13, marginTop: 6, lineHeight: 19 },

  formCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 18, marginBottom: 20 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  areaBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  areaText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  input: {
    borderWidth: 1, borderColor: C.borderStrong, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, color: C.text, marginTop: 10, fontSize: 13,
  },
  descriptionInput: { minHeight: 90, textAlignVertical: 'top' },
  label: { color: C.textMid, fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 7, letterSpacing: 0.3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { backgroundColor: C.bgSubtle, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 7 },
  chipSelected: { backgroundColor: C.greenLight, borderColor: C.green },
  chipText: { color: C.textMid, fontSize: 11, fontWeight: '600' },
  chipTextSelected: { color: C.greenDark, fontWeight: '700' },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 11,
    alignSelf: 'flex-start', marginTop: 14,
  },
  submitText: { color: C.white, fontSize: 13, fontWeight: '700' },

  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  refreshButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
  },
  refresh: { color: C.textMid, fontSize: 12, fontWeight: '700' },

  emptyBox: { alignItems: 'center', gap: 10, marginTop: 40 },
  empty: { color: C.textMid, textAlign: 'center', fontSize: 13 },

  ticketCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, marginBottom: 10 },
  ticketTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  ticketSubject: { flex: 1, color: C.text, fontSize: 14, fontWeight: '700' },
  requester: { color: C.accent, fontSize: 11, fontWeight: '600', marginTop: 7 },
  ticketDescription: { color: C.textMid, fontSize: 12, lineHeight: 18, marginTop: 8 },

  progressWrap: { marginTop: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressNode: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.bgSubtle, borderWidth: 1, borderColor: C.border,
  },
  progressNodeReached: { backgroundColor: C.green, borderColor: C.green },
  progressNodeCurrent: { borderWidth: 2, borderColor: C.greenDark },
  progressBar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: C.border, marginHorizontal: 4 },
  progressBarFilled: { backgroundColor: C.green },
  progressLabels: { flexDirection: 'row', marginTop: 6 },
  progressLabel: { flex: 1, color: C.textLight, fontSize: 10, fontWeight: '600' },
  progressLabelActive: { color: C.greenDark, fontWeight: '700' },

  ticketBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketMeta: { color: C.textLight, fontSize: 11 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  resolutionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    marginTop: 10, padding: 10, borderRadius: 8,
    backgroundColor: C.bgSubtle,
  },
  resolutionBoxDone: { backgroundColor: C.greenLight },
  resolution: { flex: 1, color: C.greenDark, fontSize: 11, lineHeight: 17 },

  manageButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.greenLight, borderWidth: 1, borderColor: C.green,
  },
  manageText: { color: C.greenDark, fontSize: 11, fontWeight: '700' },

  backdrop: { flex: 1, backgroundColor: 'rgba(14,43,41,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  editor: { backgroundColor: C.white, borderRadius: 12, padding: 20, width: '100%', maxWidth: 520, borderWidth: 1, borderColor: C.border },
  editorTitle: { color: C.text, fontSize: 19, fontWeight: '700' },
  editorSubject: { color: C.textMid, fontSize: 13, marginTop: 5 },
  editorSteps: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  editorStep: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.bgSubtle, borderWidth: 1, borderColor: C.border,
  },
  editorStepReached: { backgroundColor: C.green, borderColor: C.green },
  editorStepText: { color: C.textMid, fontSize: 11, fontWeight: '600' },
  editorStepTextReached: { color: C.white, fontWeight: '700' },
  editorActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 9, marginTop: 18 },
  cancelButton: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 8, borderWidth: 1, borderColor: C.borderStrong },
  cancelText: { color: C.textMid, fontSize: 12, fontWeight: '700' },
  saveButton: { backgroundColor: C.green, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 8 },
  saveText: { color: C.white, fontSize: 12, fontWeight: '700' },
});
