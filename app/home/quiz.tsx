import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  supabase,
  FocusArea,
  focusAreaLabels,
  ExperiencePreference,
  experiencePreferenceLabels,
  approachQuizOptions,
} from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { Button } from '../../components/Button';
import { colors, fontSize, radius, spacing } from '../../constants/theme';

const FOCUS_AREAS = Object.entries(focusAreaLabels) as [FocusArea, string][];
const EXPERIENCE_OPTIONS = Object.entries(experiencePreferenceLabels) as [ExperiencePreference, string][];

export default function QuizScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);
  const [approachOptionKey, setApproachOptionKey] = useState<string | null>(null);
  const [experiencePref, setExperiencePref] = useState<ExperiencePreference | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!focusArea || !approachOptionKey || !experiencePref) {
      Alert.alert('Atenção', 'Responda todas as perguntas para continuar.');
      return;
    }
    if (!session) return;

    const option = approachQuizOptions.find((o) => o.key === approachOptionKey);
    if (!option) return;

    setLoading(true);
    const { error } = await supabase
      .from('patients')
      .update({
        preferred_focus_area: focusArea,
        preferred_approaches: option.approaches,
        experience_preference: experiencePref,
      })
      .eq('id', session.user.id);

    setLoading(false);

    if (error) {
      console.error('[quiz] erro ao salvar preferências:', JSON.stringify(error, null, 2));
      Alert.alert('Erro', `${error.message}\n\ncode: ${error.code ?? '-'}`);
      return;
    }

    router.replace('/home/match');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>🎯</Text>
          <Text style={styles.title}>Vamos encontrar seu match</Text>
          <Text style={styles.subtitle}>
            Responda 3 perguntas rápidas e indicaremos os 3 psicólogos mais alinhados com você.
          </Text>
        </View>

        {/* Pergunta 1: focus_area */}
        <View style={styles.question}>
          <Text style={styles.questionLabel}>1. O que mais te traz aqui hoje?</Text>
          <View style={styles.optionsList}>
            {FOCUS_AREAS.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.option, focusArea === key && styles.optionSelected]}
                onPress={() => setFocusArea(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, focusArea === key && styles.optionTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pergunta 2: approach */}
        <View style={styles.question}>
          <Text style={styles.questionLabel}>2. Como você imagina seu processo de terapia?</Text>
          <View style={styles.optionsList}>
            {approachQuizOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.option, approachOptionKey === option.key && styles.optionSelected]}
                onPress={() => setApproachOptionKey(option.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionText,
                    approachOptionKey === option.key && styles.optionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Pergunta 3: experience */}
        <View style={styles.question}>
          <Text style={styles.questionLabel}>3. Sobre a experiência do profissional:</Text>
          <View style={styles.optionsList}>
            {EXPERIENCE_OPTIONS.map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.option, experiencePref === key && styles.optionSelected]}
                onPress={() => setExperiencePref(key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.optionText, experiencePref === key && styles.optionTextSelected]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button
          title="Ver meus matches"
          loading={loading}
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backBtn: { paddingVertical: spacing.md },
  backText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  header: { marginBottom: spacing.xl, alignItems: 'center' },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  question: { marginBottom: spacing.xl },
  questionLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  optionsList: { gap: spacing.sm },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionText: { fontSize: fontSize.md, color: colors.textMedium, fontWeight: '500' },
  optionTextSelected: { color: colors.primary, fontWeight: '700' },
  submitBtn: { marginTop: spacing.md },
});
