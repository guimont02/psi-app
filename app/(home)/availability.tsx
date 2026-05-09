import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { colors, fontSize, radius, spacing } from '../../constants/theme';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TIME_OPTIONS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00',
];

type Slot = { id: string; day_of_week: number; start_time: string };

export default function AvailabilityScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    fetchSlots();
  }, []);

  async function fetchSlots() {
    setLoading(true);
    const { data } = await supabase
      .from('availability_slots')
      .select('id, day_of_week, start_time')
      .eq('psychologist_id', session!.user.id)
      .order('day_of_week')
      .order('start_time');
    if (data) setSlots(data);
    setLoading(false);
  }

  async function toggleSlot(time: string) {
    const existing = slots.find(
      (s) => s.day_of_week === selectedDay && s.start_time.slice(0, 5) === time
    );

    if (existing) {
      const { error } = await supabase
        .from('availability_slots')
        .delete()
        .eq('id', existing.id);
      if (!error) setSlots((prev) => prev.filter((s) => s.id !== existing.id));
    } else {
      const { data, error } = await supabase
        .from('availability_slots')
        .insert({ psychologist_id: session!.user.id, day_of_week: selectedDay, start_time: time })
        .select('id, day_of_week, start_time')
        .single();
      if (!error && data) setSlots((prev) => [...prev, data]);
    }
  }

  const slotsForDay = slots.filter((s) => s.day_of_week === selectedDay);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Minha disponibilidade</Text>
        <View style={{ width: 64 }} />
      </View>

      {/* Seletor de dia */}
      <View style={styles.daysRow}>
        {DAYS.map((label, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.dayBtn, selectedDay === index && styles.dayBtnActive]}
            onPress={() => setSelectedDay(index)}
          >
            <Text style={[styles.dayText, selectedDay === index && styles.dayTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.subtitle}>
        {DAYS[selectedDay]} — toque para ativar ou desativar um horário
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={styles.timesGrid}>
          {TIME_OPTIONS.map((time) => {
            const active = slotsForDay.some((s) => s.start_time.slice(0, 5) === time);
            return (
              <TouchableOpacity
                key={time}
                style={[styles.timeBtn, active && styles.timeBtnActive]}
                onPress={() => toggleSlot(time)}
              >
                <Text style={[styles.timeText, active && styles.timeTextActive]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {slotsForDay.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {slotsForDay.length} {slotsForDay.length === 1 ? 'horário ativo' : 'horários ativos'} neste dia
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600', width: 64 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dayText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMedium },
  dayTextActive: { color: colors.surface },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  timeBtn: {
    width: '22%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  timeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  timeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMedium },
  timeTextActive: { color: colors.surface },
  summary: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.success + '20',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  summaryText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.success },
});
