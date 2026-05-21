import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  supabase,
  MatchedPsychologist,
  matchStrength,
  matchStrengthLabels,
  focusAreaLabels,
  approachLabels,
} from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { Button } from '../../components/Button';
import { colors, fontSize, radius, spacing } from '../../constants/theme';

const STRENGTH_COLORS: Record<'strong' | 'medium' | 'partial', string> = {
  strong: colors.success,
  medium: colors.primary,
  partial: colors.textLight,
};

export default function MatchScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchedPsychologist[]>([]);

  async function loadMatches() {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('match_psychologists', {
      patient_uuid: session.user.id,
    });
    setLoading(false);

    if (error) {
      console.error('[match] erro ao buscar matches:', JSON.stringify(error, null, 2));
      Alert.alert('Erro', `${error.message}\n\ncode: ${error.code ?? '-'}`);
      return;
    }
    setMatches((data ?? []) as MatchedPsychologist[]);
  }

  useEffect(() => {
    loadMatches();
  }, [session]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Seus matches</Text>
          <Text style={styles.subtitle}>
            Os 3 psicólogos mais alinhados com suas respostas. Toque em um para ver a agenda.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : matches.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum psicólogo encontrado.</Text>
        ) : (
          matches.map((m, i) => {
            const strength = matchStrength(m.score);
            return (
              <TouchableOpacity
                key={m.id}
                style={styles.card}
                onPress={() => router.push(`/home/book/${m.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.name}>{m.full_name}</Text>
                    <View
                      style={[styles.strengthBadge, { backgroundColor: STRENGTH_COLORS[strength] + '20' }]}
                    >
                      <Text style={[styles.strengthText, { color: STRENGTH_COLORS[strength] }]}>
                        {matchStrengthLabels[strength]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.crp}>{m.crp_number}</Text>
                  <View style={styles.tags}>
                    <View style={[styles.tag, m.focus_match && styles.tagMatch]}>
                      <Text style={[styles.tagText, m.focus_match && styles.tagTextMatch]}>
                        {focusAreaLabels[m.focus_area]}
                        {m.focus_match ? ' ✓' : ''}
                      </Text>
                    </View>
                    {m.approach ? (
                      <View style={[styles.tag, m.approach_match && styles.tagMatch]}>
                        <Text style={[styles.tagText, m.approach_match && styles.tagTextMatch]}>
                          {approachLabels[m.approach]}
                          {m.approach_match ? ' ✓' : ''}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {m.years_of_experience} {m.years_of_experience === 1 ? 'ano' : 'anos'}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <Button
          title="Refazer match"
          variant="outline"
          onPress={() => router.push('/home/quiz')}
          style={styles.redoBtn}
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
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  rankText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '800' },
  cardBody: { flex: 1 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.textDark, flex: 1 },
  strengthBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
  },
  strengthText: { fontSize: fontSize.xs, fontWeight: '700' },
  crp: { fontSize: fontSize.xs, color: colors.textLight, marginBottom: spacing.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagMatch: { backgroundColor: colors.success + '25' },
  tagText: { fontSize: fontSize.xs, color: colors.textMedium, fontWeight: '600' },
  tagTextMatch: { color: colors.success },
  redoBtn: { marginTop: spacing.lg },
});
