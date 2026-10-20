import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C, IconName } from '../lib/theme';
import { collectMetrics, ACCESS_KEY, RISKS, riskLevel, lastReport } from '../lib/healthMonitor';
import type { Finding, Report, Level } from '../lib/healthMonitor';

type Row = { code: string; label: string; level: Level; detail: string; http: number | null; rows: number | null };

const LEVEL_META: Record<Level, { label: string; icon: IconName; color: string; bg: string }> = {
  ok:   { label: 'PASS',   icon: 'checkmark-circle',       color: C.green, bg: C.greenLight },
  bad:  { label: 'FALLO',  icon: 'alert-circle',           color: C.red,   bg: '#FDECEC' },
  warn: { label: 'AVISO',  icon: 'warning',                color: C.amber, bg: '#FEF3E2' },
  skip: { label: 'N/D',    icon: 'remove-circle-outline',  color: C.textLight, bg: C.bgSubtle },
};

export default function EstadoInterno() {
  const { k } = useLocalSearchParams<{ k?: string }>();
  const router = useRouter();
  const authorized = k === ACCESS_KEY;

  const [report, setReport] = useState<Report | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Sin la clave correcta no se muestra nada: redirección silenciosa.
  useEffect(() => {
    if (!authorized) {
      const t = setTimeout(() => router.replace('/(store)'), 50);
      return () => clearTimeout(t);
    }
  }, [authorized, router]);

  const run = async () => {
    setRunning(true);
    try {
      const r = await collectMetrics();
      setReport(r);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (!authorized) return;
    const cached = lastReport();
    if (cached) setReport(cached);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  if (!authorized) {
    return <View style={s.blank}>{null}</View>;
  }

  const findings: Finding[] = report?.findings ?? [];
  const byCode: Record<string, Row> = {};
  findings.forEach((f) => { byCode[f.code] = f; });

  const globalBad = report ? report.summary.issues : 0;

  return (
    <View style={s.page}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.head}>
          <View style={s.headLeft}>
            <Ionicons name="pulse" size={22} color={C.onDark} />
            <View style={{ marginLeft: 10 }}>
              <Text style={s.headTitle}>Estado interno</Text>
              <Text style={s.headSub}>Verificación de riesgos R1–R8</Text>
            </View>
          </View>
          <TouchableOpacity style={s.refresh} onPress={run} disabled={running}>
            {running
              ? <ActivityIndicator size="small" color={C.onDark} />
              : <Ionicons name="refresh" size={18} color={C.onDark} />}
            <Text style={s.refreshText}>{running ? 'Ejecutando…' : 'Ejecutar'}</Text>
          </TouchableOpacity>
        </View>

        {!report ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="large" color={C.green} />
            <Text style={s.loadingText}>Ejecutando comprobaciones…</Text>
          </View>
        ) : (
          <>
            <View style={s.summary}>
              <View style={s.summaryItem}>
                <Text style={s.summaryNum}>{report.summary.checked}</Text>
                <Text style={s.summaryLabel}>Comprobaciones</Text>
              </View>
              <View style={s.summaryDiv} />
              <View style={s.summaryItem}>
                <Text style={[s.summaryNum, globalBad > 0 && { color: C.red }]}>{globalBad}</Text>
                <Text style={s.summaryLabel}>Incidencias</Text>
              </View>
              <View style={s.summaryDiv} />
              <View style={s.summaryItem}>
                <Text style={s.summaryNum}>{new Date(report.finishedAt).toLocaleTimeString()}</Text>
                <Text style={s.summaryLabel}>Última ejecución</Text>
              </View>
            </View>

            {RISKS.map((risk) => {
              const level = riskLevel(findings, risk.codes);
              const meta = LEVEL_META[level];
              const isOpen = expanded === risk.id;
              const rows = risk.codes.map((c) => byCode[c]).filter(Boolean);
              return (
                <View key={risk.id} style={s.card}>
                  <TouchableOpacity
                    style={s.cardHead}
                    activeOpacity={0.7}
                    onPress={() => setExpanded(isOpen ? null : risk.id)}
                  >
                    <View style={[s.badge, { backgroundColor: meta.bg }]}>
                      <Ionicons name={meta.icon} size={16} color={meta.color} />
                      <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <View style={s.cardTitles}>
                      <Text style={s.riskId}>{risk.id}</Text>
                      <Text style={s.riskTitle}>{risk.title}</Text>
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.textLight} />
                  </TouchableOpacity>

                  <Text style={s.goal}>{risk.goal}</Text>

                  {isOpen && (
                    <View style={s.detailBox}>
                      {rows.map((r) => {
                        const m = LEVEL_META[r.level];
                        return (
                          <View key={r.code} style={s.detailRow}>
                            <View style={[s.dot, { backgroundColor: m.color }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.detailLabel}>
                                <Text style={s.detailCode}>{r.code}</Text>  {r.label}
                              </Text>
                              <Text style={s.detailMeta}>
                                {m.label}
                                {r.http != null ? `  ·  HTTP ${r.http}` : ''}
                                {r.rows != null ? `  ·  ${r.rows} filas` : ''}
                              </Text>
                              <Text style={s.detailText}>{r.detail}</Text>
                            </View>
                          </View>
                        );
                      })}
                      {rows.length === 0 && <Text style={s.detailText}>Sin datos para este riesgo.</Text>}
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={s.footer}>
              Vista interna oculta. No aparece en ningún menú. Sólo accesible con la clave correcta.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bgPage },
  blank: { flex: 1, backgroundColor: C.white },
  content: { padding: 20, paddingBottom: 48, maxWidth: 920, width: '100%', alignSelf: 'center' },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.ink, borderRadius: 12, padding: 16, marginBottom: 16,
  },
  headLeft: { flexDirection: 'row', alignItems: 'center' },
  headTitle: { color: C.onDark, fontSize: 16, fontWeight: '700' },
  headSub: { color: C.onDarkMid, fontSize: 12, marginTop: 2 },
  refresh: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  refreshText: { color: C.onDark, fontSize: 13, fontWeight: '600' },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },
  loadingText: { marginTop: 12, color: C.textMid, fontSize: 13 },
  summary: {
    flexDirection: 'row', backgroundColor: C.white, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDiv: { width: 1, backgroundColor: C.border },
  summaryNum: { fontSize: 20, fontWeight: '700', color: C.text },
  summaryLabel: { fontSize: 11, color: C.textLight, marginTop: 2 },
  card: {
    backgroundColor: C.white, borderRadius: 12, borderWidth: 1,
    borderColor: C.border, marginBottom: 10, overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, minWidth: 74, justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardTitles: { flex: 1, marginLeft: 12 },
  riskId: { fontSize: 11, fontWeight: '700', color: C.textLight },
  riskTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginTop: 1 },
  goal: { fontSize: 12, color: C.textMid, paddingHorizontal: 14, paddingBottom: 12, lineHeight: 17 },
  detailBox: {
    borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: C.bgSubtle, padding: 14, gap: 12,
  },
  detailRow: { flexDirection: 'row', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  detailLabel: { fontSize: 13, color: C.text, fontWeight: '600' },
  detailCode: { color: C.green, fontWeight: '700' },
  detailMeta: { fontSize: 11, color: C.textLight, marginTop: 2 },
  detailText: { fontSize: 12, color: C.textMid, marginTop: 3, lineHeight: 17 },
  footer: { fontSize: 11, color: C.textLight, textAlign: 'center', marginTop: 18, lineHeight: 16 },
});
