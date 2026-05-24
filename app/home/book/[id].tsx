import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, FocusArea, focusAreaLabels } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { Button } from '../../../components/Button';
import { colors, fontSize, radius, spacing } from '../../../constants/theme';

const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABEL = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type Slot = { id: string; day_of_week: number; start_time: string };
type Psychologist = {
  crp_number: string;
  focus_area: FocusArea;
  profiles: { full_name: string };
};

function buildNext28Days() {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 28; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function BookScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [psychologist, setPsychologist] = useState<Psychologist | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookedTimes, setBookedTimes] = useState<{ date: string; start_time: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  const days = useMemo(() => buildNext28Days(), []);

  useEffect(() => {
    async function load() {
      const [{ data: psy }, { data: slotData }, { data: booked }] = await Promise.all([
        supabase
          .from('psychologists')
          .select('crp_number, focus_area, profiles(full_name)')
          .eq('id', id)
          .single(),
        supabase
          .from('availability_slots')
          .select('id, day_of_week, start_time')
          .eq('psychologist_id', id),
        supabase
          .from('appointments')
          .select('date, start_time')
          .eq('psychologist_id', id)
          .eq('status', 'scheduled'),
      ]);
      if (psy) setPsychologist(psy as Psychologist);
      if (slotData) setSlots(slotData);
      if (booked) setBookedTimes(booked);
      setLoading(false);
    }
    load();
  }, [id]);

  const availableDays = useMemo(() => {
    const dow = new Set(slots.map((s) => s.day_of_week));
    return new Set(days.filter((d) => dow.has(d.getDay())).map(toDateString));
  }, [days, slots]);

  const timesForDate = useMemo(() => {
    if (!selectedDate) return [];
    const dow = selectedDate.getDay();
    const dateStr = toDateString(selectedDate);
    return slots
      .filter((s) => s.day_of_week === dow)
      .filter((s) => !bookedTimes.some((b) => b.date === dateStr && b.start_time.slice(0, 5) === s.start_time.slice(0, 5)))
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [selectedDate, slots, bookedTimes]);

  async function handleBook() {
    if (!selectedDate || !selectedSlot) return;
    setBooking(true);

    const { data: linkData, error: linkError } = await supabase.functions.invoke('create-meet-link', {
      body: {
        date: toDateString(selectedDate),
        startTime: selectedSlot.start_time,
        title: `Consulta · ${psychologist?.profiles.full_name ?? 'PsiApp'}`,
      },
    });

    if (linkError || !linkData?.meetLink) {
      setBooking(false);
      Alert.alert('Erro', 'Não foi possível gerar o link da videochamada. Tente novamente.');
      return;
    }

    const { error } = await supabase.from('appointments').insert({
      psychologist_id: id,
      patient_id: session!.user.id,
      slot_id: selectedSlot.id,
      date: toDateString(selectedDate),
      start_time: selectedSlot.start_time,
      status: 'scheduled',
      meet_link: linkData.meetLink,
    });
    setBooking(false);
    if (error) {
      Alert.alert('Erro', 'Não foi possível confirmar o agendamento. Tente novamente.');
      return;
    }
    Alert.alert('Agendado!', `Sessão confirmada para ${selectedDate.getDate()}/${selectedDate.getMonth() + 1} às ${selectedSlot.start_time.slice(0, 5)}.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Agendar sessão</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Info do psicólogo */}
        <View style={styles.psyCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{psychologist?.profiles.full_name.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.psyName}>{psychologist?.profiles.full_name}</Text>
            <Text style={styles.psyDetail}>{psychologist?.crp_number} · {focusAreaLabels[psychologist!.focus_area]}</Text>
          </View>
        </View>

        {/* Seleção de data */}
        <Text style={styles.sectionTitle}>Escolha uma data</Text>
        {availableDays.size === 0 ? (
          <Text style={styles.emptyText}>Este psicólogo ainda não possui horários disponíveis.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
            {days.map((d) => {
              const dateStr = toDateString(d);
              const available = availableDays.has(dateStr);
              const selected = selectedDate && toDateString(selectedDate) === dateStr;
              if (!available) return null;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.dateBtn, selected && styles.dateBtnActive]}
                  onPress={() => { setSelectedDate(d); setSelectedSlot(null); }}
                >
                  <Text style={[styles.dateDow, selected && styles.dateTextActive]}>
                    {DAYS_LABEL[d.getDay()]}
                  </Text>
                  <Text style={[styles.dateDay, selected && styles.dateTextActive]}>
                    {d.getDate()}
                  </Text>
                  <Text style={[styles.dateMon, selected && styles.dateTextActive]}>
                    {MONTH_LABEL[d.getMonth()]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Seleção de horário */}
        {selectedDate && (
          <>
            <Text style={styles.sectionTitle}>Escolha um horário</Text>
            {timesForDate.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum horário disponível nesta data.</Text>
            ) : (
              <View style={styles.timesGrid}>
                {timesForDate.map((slot) => {
                  const active = selectedSlot?.id === slot.id;
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.timeBtn, active && styles.timeBtnActive]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[styles.timeText, active && styles.timeTextActive]}>
                        {slot.start_time.slice(0, 5)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* Confirmar */}
        {selectedSlot && (
          <View style={styles.confirmArea}>
            <Text style={styles.confirmText}>
              {selectedDate!.getDate()}/{selectedDate!.getMonth() + 1} às {selectedSlot.start_time.slice(0, 5)} · 50 min
            </Text>
            <Button title="Confirmar agendamento" loading={booking} onPress={handleBook} />
          </View>
        )}
      </ScrollView>
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
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  psyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.surface, fontSize: fontSize.xl, fontWeight: '700' },
  psyName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textDark },
  psyDetail: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  datesRow: { gap: spacing.sm, paddingBottom: spacing.md },
  dateBtn: {
    width: 60,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  dateBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  dateDow: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textLight },
  dateDay: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark, marginVertical: 2 },
  dateMon: { fontSize: fontSize.xs, color: colors.textLight },
  dateTextActive: { color: colors.surface },
  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
  confirmArea: { gap: spacing.md, marginTop: spacing.md },
  confirmText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
  },
  emptyText: { fontSize: fontSize.sm, color: colors.textLight, marginBottom: spacing.md },
});
