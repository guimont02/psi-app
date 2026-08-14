import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { colors, fontSize, radius, spacing } from '../../../constants/theme';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type NotebookEntry = {
  id: string;
  content: string;
  updated_at: string;
  appointment_id: string;
  appointments: {
    date: string;
    start_time: string;
    psychologists: { profiles: { full_name: string } };
  };
};

export default function NotebookScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<NotebookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    load();
  }, [session]);

  async function load() {
    setLoading(true);
    // Só devolutivas publicadas chegam aqui — a policy filtra o resto.
    const { data, error } = await supabase
      .from('session_shared_notes')
      .select('id, content, updated_at, appointment_id, appointments(date, start_time, psychologists(profiles(full_name)))')
      .eq('patient_id', session!.user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[notebook] erro:', JSON.stringify(error, null, 2));
    }
    setEntries((data ?? []) as unknown as NotebookEntry[]);
    setLoading(false);
  }

  function renderItem({ item }: { item: NotebookEntry }) {
    const date = new Date(item.appointments.date + 'T12:00:00');
    const excerpt = item.content.length > 140 ? item.content.slice(0, 140) + '...' : item.content;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/home/notes/${item.appointment_id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateBlock}>
            <Text style={styles.dateDay}>{date.getDate()}</Text>
            <Text style={styles.dateMonth}>{MONTHS[date.getMonth()]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.psyName}>{item.appointments.psychologists.profiles.full_name}</Text>
            <Text style={styles.cardTime}>
              {item.appointments.start_time.slice(0, 5)} · {date.getFullYear()}
            </Text>
          </View>
        </View>
        <Text style={styles.excerpt}>{excerpt}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meu caderno</Text>
        <Text style={styles.subtitle}>Registros das suas sessões</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📓</Text>
              <Text style={styles.emptyTitle}>Caderno vazio</Text>
              <Text style={styles.emptyText}>
                Os registros das suas sessões aparecerão aqui assim que seu psicólogo compartilhá-los.
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
  subtitle: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dateBlock: {
    width: 44,
    alignItems: 'center',
    backgroundColor: colors.secondary + '15',
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
  },
  dateDay: { fontSize: fontSize.xl, fontWeight: '800', color: colors.secondary },
  dateMonth: { fontSize: fontSize.xs, fontWeight: '600', color: colors.secondary },
  psyName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textDark },
  cardTime: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  excerpt: { fontSize: fontSize.sm, color: colors.textMedium, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textDark, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.md, color: colors.textLight, textAlign: 'center', lineHeight: 22 },
});
