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

// A devolutiva vive em outra tabela porque o RLS do Postgres é por linha:
// se o paciente pudesse ler a linha da nota clínica, leria todos os campos.
type SharedNote = {
  id: string;
  content: string;
  published_at: string | null;
  updated_at: string;
};

type TranscriptStatus = 'pending' | 'recording' | 'processing' | 'completed' | 'failed';

type SessionTranscript = {
  status: TranscriptStatus;
  summary: string | null;
  transcript: string | null;
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
  const [transcript, setTranscript] = useState<SessionTranscript | null>(null);
  const [sharedNote, setSharedNote] = useState<SharedNote | null>(null);
  const [sharedContent, setSharedContent] = useState('');
  const [savingShared, setSavingShared] = useState(false);

  useEffect(() => {
    if (!session || !appointmentId) return;
    loadData();
  }, [appointmentId, session]);

  async function loadData() {
    setLoading(true);

    // As policies decidem o que cada papel enxerga: a nota clínica volta
    // vazia para o paciente, e a devolutiva só chega a ele se publicada.
    const [
      { data: profileData },
      { data: apptData },
      { data: noteData },
      { data: transcriptData },
      { data: sharedData },
    ] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', session!.user.id).single(),
      supabase
        .from('appointments')
        .select('id, date, start_time, psychologist_id, patient_id, psychologists(profiles(full_name)), patients(profiles(full_name))')
        .eq('id', appointmentId)
        .single(),
      supabase.from('session_notes').select('id, content, updated_at').eq('appointment_id', appointmentId).maybeSingle(),
      supabase.from('session_transcripts').select('status, summary, transcript').eq('appointment_id', appointmentId).maybeSingle(),
      supabase
        .from('session_shared_notes')
        .select('id, content, published_at, updated_at')
        .eq('appointment_id', appointmentId)
        .maybeSingle(),
    ]);

    if (profileData) setRole(profileData.role as 'patient' | 'psychologist');
    if (apptData) setAppointment(apptData as unknown as Appointment);
    if (noteData) {
      setNote(noteData as SessionNote);
      setContent(noteData.content);
    }
    if (transcriptData) setTranscript(transcriptData as SessionTranscript);
    if (sharedData) {
      setSharedNote(sharedData as SharedNote);
      setSharedContent(sharedData.content);
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

  // publish = null mantém o estado atual (salvar sem mudar visibilidade).
  async function saveShared(publish: boolean | null) {
    if (!appointment || !session) return;
    if (!sharedContent.trim()) {
      Alert.alert('Atenção', 'Escreva a devolutiva antes de salvar.');
      return;
    }

    const wasPublished = sharedNote?.published_at != null;
    const publishedAt =
      publish === null
        ? (sharedNote?.published_at ?? null)
        : publish
          ? new Date().toISOString()
          : null;

    setSavingShared(true);
    const { data, error } = await supabase
      .from('session_shared_notes')
      .upsert(
        {
          appointment_id: appointment.id,
          psychologist_id: appointment.psychologist_id,
          patient_id: appointment.patient_id,
          content: sharedContent.trim(),
          published_at: publishedAt,
        },
        { onConflict: 'appointment_id' }
      )
      .select('id, content, published_at, updated_at')
      .single();
    setSavingShared(false);

    if (error) {
      Alert.alert('Erro', 'Não foi possível salvar a devolutiva. Tente novamente.');
      return;
    }

    setSharedNote(data as SharedNote);
    if (publish === true) {
      Alert.alert('Publicada', 'O paciente já pode ler esta devolutiva no caderno dele.');
    } else if (publish === false) {
      Alert.alert('Despublicada', 'O paciente não vê mais esta devolutiva.');
    } else {
      Alert.alert('Salvo', wasPublished ? 'As alterações já estão visíveis para o paciente.' : 'Rascunho salvo. O paciente ainda não vê nada.');
    }
  }

  function applySummary() {
    if (!transcript?.summary) return;
    setContent((prev) => (prev.trim() ? `${prev}\n\n${transcript.summary}` : transcript.summary!));
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
              <Text style={styles.fieldLabel}>🔒 Minhas anotações</Text>
              <Text style={styles.fieldHint}>Só você vê. O paciente não tem acesso a este texto.</Text>
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

              {/* Devolutiva — o texto que o paciente lê */}
              <View style={styles.sharedBox}>
                <Text style={styles.sharedTitle}>📖 Para o paciente</Text>
                <Text style={styles.sharedHint}>
                  {sharedNote?.published_at
                    ? 'Publicada — o paciente lê este texto. Alterações salvas ficam visíveis na hora.'
                    : 'Escreva a devolutiva da sessão. O paciente só vê depois que você publicar.'}
                </Text>

                <TextInput
                  style={styles.sharedTextarea}
                  multiline
                  placeholder="O que vocês trabalharam, o que ele pode observar até a próxima sessão..."
                  placeholderTextColor={colors.placeholder}
                  value={sharedContent}
                  onChangeText={setSharedContent}
                  textAlignVertical="top"
                />

                {sharedNote?.published_at ? (
                  <>
                    <Text style={styles.metaText}>
                      Publicada em {new Date(sharedNote.published_at).toLocaleString('pt-BR')}
                    </Text>
                    <Button
                      title="Salvar alterações"
                      loading={savingShared}
                      onPress={() => saveShared(null)}
                      style={{ marginTop: spacing.md }}
                    />
                    <TouchableOpacity
                      style={styles.unpublishBtn}
                      disabled={savingShared}
                      onPress={() => saveShared(false)}
                    >
                      <Text style={styles.unpublishBtnText}>Despublicar</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {sharedNote ? (
                      <Text style={styles.metaText}>
                        Rascunho salvo em {new Date(sharedNote.updated_at).toLocaleString('pt-BR')}
                      </Text>
                    ) : null}
                    <Button
                      title="Publicar para o paciente"
                      loading={savingShared}
                      onPress={() => saveShared(true)}
                      style={{ marginTop: spacing.md }}
                    />
                    <TouchableOpacity
                      style={styles.draftBtn}
                      disabled={savingShared}
                      onPress={() => saveShared(null)}
                    >
                      <Text style={styles.draftBtnText}>Salvar rascunho</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {transcript ? (
                <View style={styles.aiBox}>
                  <Text style={styles.aiTitle}>🎙️ Transcrição automática</Text>
                  {transcript.status === 'recording' ? (
                    <Text style={styles.aiInfo}>Transcrição em andamento durante a sessão…</Text>
                  ) : transcript.status === 'processing' ? (
                    <Text style={styles.aiInfo}>Gerando resumo com IA…</Text>
                  ) : transcript.status === 'failed' ? (
                    <Text style={styles.aiInfo}>Não foi possível gerar a transcrição desta sessão.</Text>
                  ) : transcript.status === 'completed' && transcript.summary ? (
                    <>
                      <Text style={styles.aiContent}>{transcript.summary}</Text>
                      <TouchableOpacity style={styles.applyBtn} onPress={applySummary}>
                        <Text style={styles.applyBtnText}>Usar resumo na nota</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={styles.aiInfo}>Aguardando transcrição.</Text>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Da sua sessão</Text>
              {sharedNote ? (
                <View style={styles.readOnlyBox}>
                  <Text style={styles.readOnlyContent}>{sharedNote.content}</Text>
                  <Text style={styles.metaText}>
                    Escrito por {appointment.psychologists.profiles.full_name} ·{' '}
                    {new Date(sharedNote.updated_at).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📓</Text>
                  <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
                  <Text style={styles.emptyText}>
                    Seu psicólogo ainda não compartilhou um registro desta sessão.
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
  fieldHint: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.sm,
  },
  // A devolutiva ganha moldura colorida para não ser confundida com a
  // caixa privada acima — escrever na caixa errada é o pior erro possível.
  sharedBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.secondary + '0D',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.secondary + '55',
    padding: spacing.md,
  },
  sharedTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.secondary,
  },
  sharedHint: {
    fontSize: fontSize.xs,
    color: colors.textMedium,
    marginTop: 2,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  sharedTextarea: {
    minHeight: 160,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textDark,
    lineHeight: 22,
  },
  draftBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  draftBtnText: {
    color: colors.textMedium,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  unpublishBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  unpublishBtnText: {
    color: colors.error,
    fontSize: fontSize.sm,
    fontWeight: '700',
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
  aiBox: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary + '0D',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: spacing.md,
  },
  aiTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  aiInfo: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
  aiContent: {
    fontSize: fontSize.md,
    color: colors.textDark,
    lineHeight: 22,
  },
  applyBtn: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  applyBtnText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontWeight: '700',
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
