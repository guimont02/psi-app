import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { Button } from '../../../components/Button';
import { colors, fontSize, radius, spacing } from '../../../constants/theme';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type Appointment = {
  id: string;
  date: string;
  start_time: string;
  psychologist_id: string;
  patient_id: string;
  psychologists: { profiles: { full_name: string } };
  patients: { profiles: { full_name: string } };
};

type SessionNote = {
  id: string;
  content: string;
  updated_at: string;
};

export default function NotesScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const { session } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [note, setNote] = useState<SessionNote | null>(null);
  const [content, setContent] = useState('');
  const [role, setRole] = useState<'patient' | 'psychologist' | null>(null);

  useEffect(() => {
    if (!session || !appointmentId) return;
    loadData();
  }, [appointmentId, session]);

  async function loadData() {
    setLoading(true);

    const [{ data: profileData }, { data: apptData }, { data: noteData }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', session!.user.id).single(),
      supabase
        .from('appointments')
        .select('id, date, start_time, psychologist_id, patient_id, psychologists(profiles(full_name)), patients(profiles(full_name))')
        .eq('id', appointmentId)
        .single(),
      supabase.from('session_notes').select('id, content, updated_at').eq('appointment_id', appointmentId).maybeSingle(),
    ]);

    if (profileData) setRole(profileData.role as 'patient' | 'psychologist');
    if (apptData) setAppointment(apptData as unknown as Appointment);
    if (noteData) {
      setNote(noteData as SessionNote);
      setContent(noteData.content);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!appointment || !session) return;
    if (!content.trim()) {
      Alert.alert('Atenção', 'Escreva algo antes de salvar.');
      return;
    }

    setSaving(true);
    const payload = {
      appointment_id: appointment.id,
      psychologist_id: appointment.psychologist_id,
      patient_id: appointment.patient_id,
      content: content.trim(),
    };

    const { error } = await supabase
      .from('session_notes')
      .upsert(payload, { onConflict: 'appointment_id' });

    setSaving(false);

    if (error) {
      console.error('[notes] erro ao salvar:', JSON.stringify(error, null, 2));
      Alert.alert('Erro', `${error.message}\n\ncode: ${error.code ?? '-'}`);
      return;
    }

    Alert.alert('Salvo!', 'Suas anotações foram salvas.', [
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

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>Consulta não encontrada.</Text>
      </SafeAreaView>
    );
  }

  const isPsychologist = role === 'psychologist';
  const date = new Date(appointment.date + 'T12:00:00');
  const otherPartyName = isPsychologist
    ? appointment.patients.profiles.full_name
    : appointment.psychologists.profiles.full_name;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notas da sessão</Text>
        <View style={{ width: 64 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Cabeçalho da sessão */}
          <View style={styles.sessionHeader}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateDay}>{date.getDate()}</Text>
              <Text style={styles.dateMonth}>{MONTHS[date.getMonth()]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionLabel}>
                {isPsychologist ? 'Paciente' : 'Psicólogo(a)'}
              </Text>
              <Text style={styles.sessionName}>{otherPartyName}</Text>
              <Text style={styles.sessionTime}>{appointment.start_time.slice(0, 5)} · 50 min</Text>
            </View>
          </View>

          {/* Conteúdo */}
          {isPsychologist ? (
            <>
              <Text style={styles.fieldLabel}>Anotações</Text>
              <TextInput
                style={styles.textarea}
                multiline
                placeholder="Registre o que foi falado na sessão, observações, próximos passos..."
                placeholderTextColor={colors.placeholder}
                value={content}
                onChangeText={setContent}
                textAlignVertical="top"
              />
              {note ? (
                <Text style={styles.metaText}>
                  Última atualização: {new Date(note.updated_at).toLocaleString('pt-BR')}
                </Text>
              ) : null}
              <Button
                title={note ? 'Atualizar notas' : 'Salvar notas'}
                loading={saving}
                onPress={handleSave}
                style={{ marginTop: spacing.lg }}
              />
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Anotações do psicólogo</Text>
              {note ? (
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyContent}>{note.content}</Text>
                  <Text style={styles.metaText}>
                    Atualizado em {new Date(note.updated_at).toLocaleString('pt-BR')}
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📓</Text>
                  <Text style={styles.emptyTitle}>Sem anotações ainda</Text>
                  <Text style={styles.emptyText}>
                    O psicólogo ainda não registrou notas desta sessão.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  dateBlock: {
    width: 56,
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  dateDay: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  dateMonth: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  sessionLabel: { fontSize: fontSize.xs, color: colors.textLight, fontWeight: '600' },
  sessionName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textDark, marginTop: 2 },
  sessionTime: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMedium,
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textDark,
    lineHeight: 22,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  readOnlyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  readOnlyContent: {
    fontSize: fontSize.md,
    color: colors.textDark,
    lineHeight: 22,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark, marginBottom: spacing.xs },
  emptyText: { fontSize: fontSize.sm, color: colors.textLight, textAlign: 'center', lineHeight: 20 },
});
