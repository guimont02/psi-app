import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { colors, fontSize, radius, spacing } from '../../../constants/theme';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const STATUS_CONFIG = {
  scheduled: { label: 'Agendada', color: colors.primary },
  completed: { label: 'Concluída', color: colors.success },
  cancelled: { label: 'Cancelada', color: colors.error },
} as const;

type Status = keyof typeof STATUS_CONFIG;

type PatientAppointment = {
  id: string;
  date: string;
  start_time: string;
  status: Status;
  psychologists: {
    focus_area: string;
    profiles: { full_name: string };
  };
};

type PsychologistAppointment = {
  id: string;
  date: string;
  start_time: string;
  status: Status;
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function AppointmentsScreen() {
  const { session } = useAuth();
  const [role, setRole] = useState<'patient' | 'psychologist' | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[] | PsychologistAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) setRole(data.role);
      });
  }, [session]);

  useEffect(() => {
    if (!role) return;
    fetchAppointments();
  }, [role]);

  async function fetchAppointments() {
    setLoading(true);
    if (role === 'patient') {
      const { data } = await supabase
        .from('appointments')
        .select('id, date, start_time, status, psychologists(focus_area, profiles(full_name))')
        .eq('patient_id', session!.user.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (data) setAppointments(data as PatientAppointment[]);
    } else {
      const { data } = await supabase
        .from('appointments')
        .select('id, date, start_time, status')
        .eq('psychologist_id', session!.user.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      if (data) setAppointments(data as PsychologistAppointment[]);
    }
    setLoading(false);
  }

  function renderPatientItem({ item }: { item: PatientAppointment }) {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.scheduled;
    return (
      <View style={styles.card}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{new Date(item.date + 'T12:00:00').getDate()}</Text>
          <Text style={styles.dateMonth}>{MONTHS[new Date(item.date + 'T12:00:00').getMonth()]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.psychologists.profiles.full_name}</Text>
          <Text style={styles.cardTime}>{item.start_time.slice(0, 5)} · 50 min</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    );
  }

  function renderPsychologistItem({ item }: { item: PsychologistAppointment }) {
    const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.scheduled;
    return (
      <View style={styles.card}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{new Date(item.date + 'T12:00:00').getDate()}</Text>
          <Text style={styles.dateMonth}>{MONTHS[new Date(item.date + 'T12:00:00').getMonth()]}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>Consulta</Text>
          <Text style={styles.cardTime}>{item.start_time.slice(0, 5)} · 50 min</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas consultas</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={appointments as any[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={role === 'patient' ? renderPatientItem : renderPsychologistItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📅</Text>
              <Text style={styles.emptyTitle}>Nenhuma consulta</Text>
              <Text style={styles.emptyText}>
                {role === 'patient'
                  ? 'Agende uma sessão com um psicólogo na aba Início.'
                  : 'Suas consultas agendadas aparecerão aqui.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  dateBlock: {
    width: 44,
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
  },
  dateDay: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  dateMonth: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  cardInfo: { flex: 1 },
  cardName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textDark },
  cardTime: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: '700' },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textDark, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.textLight, textAlign: 'center', lineHeight: 22 },
});
