import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, FocusArea, focusAreaLabels, MatchedPsychologist } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';
import { Button } from '../../../components/Button';
import { PsychologistCard } from '../../../components/PsychologistCard';
import { colors, fontSize, radius, spacing } from '../../../constants/theme';

type Profile = {
  full_name: string;
  role: 'patient' | 'psychologist';
};

type Psychologist = {
  id: string;
  crp_number: string;
  years_of_experience: number;
  focus_area: FocusArea;
  profiles: { full_name: string };
};

// Linha exibida na lista de pacientes — pode vir do RPC de match OU do fetch completo.
type ListItem = {
  id: string;
  full_name: string;
  crp_number: string;
  years_of_experience: number;
  focus_area: FocusArea;
  isPrimary: boolean;
};

const FOCUS_AREAS = Object.keys(focusAreaLabels) as FocusArea[];

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusArea | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const [hasPreferences, setHasPreferences] = useState<boolean | null>(null);
  const [bookedPsychologistId, setBookedPsychologistId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchedPsychologist[]>([]);
  const [allPsychologists, setAllPsychologists] = useState<Psychologist[]>([]);

  // Carrega perfil
  useEffect(() => {
    setProfile(null);
    if (!session) return;
    supabase
      .from('profiles')
      .select('full_name, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [session]);

  // Carrega: tem preferências? agendou com alguém?
  useEffect(() => {
    if (profile?.role !== 'patient' || !session) return;

    supabase
      .from('patients')
      .select('preferred_focus_area')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setHasPreferences(!!data?.preferred_focus_area));

    supabase
      .from('appointments')
      .select('psychologist_id, created_at')
      .eq('patient_id', session.user.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => setBookedPsychologistId(data?.[0]?.psychologist_id ?? null));
  }, [profile, session]);

  // Carrega lista: matches (se já respondeu) ou lista completa
  useEffect(() => {
    if (profile?.role !== 'patient' || !session || hasPreferences === null) return;
    setLoadingList(true);

    if (hasPreferences) {
      supabase
        .rpc('match_psychologists', { patient_uuid: session.user.id })
        .then(({ data, error }) => {
          if (error) {
            console.error('[home] erro ao buscar matches:', JSON.stringify(error, null, 2));
          }
          setMatches((data ?? []) as MatchedPsychologist[]);
          setLoadingList(false);
        });
    } else {
      supabase
        .from('psychologists')
        .select('id, crp_number, years_of_experience, focus_area, profiles(full_name)')
        .then(({ data }) => {
          setAllPsychologists((data ?? []) as Psychologist[]);
          setLoadingList(false);
        });
    }
  }, [profile, session, hasPreferences]);

  // Monta a lista final aplicando filtros/ordenação e destacando o agendado
  const listItems: ListItem[] = useMemo(() => {
    if (hasPreferences) {
      // Matches: psicólogo agendado vem primeiro e marcado como primary
      const items: ListItem[] = matches.map((m) => ({
        id: m.id,
        full_name: m.full_name,
        crp_number: m.crp_number,
        years_of_experience: m.years_of_experience,
        focus_area: m.focus_area,
        isPrimary: m.id === bookedPsychologistId,
      }));
      return items.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
    }
    // Sem preferências: lista completa com filtros existentes
    const filtered = selectedFocusArea
      ? allPsychologists.filter((p) => p.focus_area === selectedFocusArea)
      : allPsychologists;
    return [...filtered]
      .sort((a, b) =>
        sortDesc
          ? b.years_of_experience - a.years_of_experience
          : a.years_of_experience - b.years_of_experience
      )
      .map((p) => ({
        id: p.id,
        full_name: p.profiles.full_name,
        crp_number: p.crp_number,
        years_of_experience: p.years_of_experience,
        focus_area: p.focus_area,
        isPrimary: false,
      }));
  }, [hasPreferences, matches, allPsychologists, bookedPsychologistId, selectedFocusArea, sortDesc]);

  // 3 estados do banner
  const bannerCopy = useMemo(() => {
    if (!hasPreferences) {
      return {
        title: 'Encontre seu psicólogo ideal',
        subtitle: 'Responda 3 perguntas e receba 3 recomendações personalizadas',
        target: '/home/quiz' as const,
      };
    }
    if (bookedPsychologistId) {
      return {
        title: 'Você já encontrou seu psicólogo ideal',
        subtitle: 'Quer refazer ou mudar para uma experiência nova?',
        target: '/home/quiz' as const,
      };
    }
    return {
      title: 'Ver meus matches',
      subtitle: 'Reveja os 3 psicólogos mais alinhados com você',
      target: '/home/match' as const,
    };
  }, [hasPreferences, bookedPsychologistId]);

  async function handleSignOut() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  const isPatient = profile?.role === 'patient';
  const showFilters = isPatient && !hasPreferences;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {profile?.full_name?.split(' ')[0] ?? '...'} 👋</Text>
          <Text style={styles.role}>{isPatient ? '💙 Paciente' : '🩺 Psicólogo'}</Text>
        </View>
        <Button title="Sair" variant="ghost" onPress={handleSignOut} />
      </View>

      {isPatient ? (
        <FlatList
          data={listItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {/* Banner do match (3 estados) */}
              <TouchableOpacity
                style={styles.matchBanner}
                onPress={() => router.push(bannerCopy.target)}
                activeOpacity={0.85}
              >
                <Text style={styles.matchBannerEmoji}>🎯</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.matchBannerTitle}>{bannerCopy.title}</Text>
                  <Text style={styles.matchBannerSubtitle}>{bannerCopy.subtitle}</Text>
                </View>
                <Text style={styles.matchBannerArrow}>→</Text>
              </TouchableOpacity>

              <Text style={styles.listTitle}>
                {hasPreferences ? 'Seus matches' : 'Psicólogos disponíveis'}
              </Text>

              {showFilters ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipsScroll}
                    contentContainerStyle={styles.chipsContent}
                  >
                    <TouchableOpacity
                      style={[styles.chip, selectedFocusArea === null && styles.chipActive]}
                      onPress={() => setSelectedFocusArea(null)}
                    >
                      <Text style={[styles.chipText, selectedFocusArea === null && styles.chipTextActive]}>
                        Todos
                      </Text>
                    </TouchableOpacity>
                    {FOCUS_AREAS.map((area) => (
                      <TouchableOpacity
                        key={area}
                        style={[styles.chip, selectedFocusArea === area && styles.chipActive]}
                        onPress={() => setSelectedFocusArea(selectedFocusArea === area ? null : area)}
                      >
                        <Text style={[styles.chipText, selectedFocusArea === area && styles.chipTextActive]}>
                          {focusAreaLabels[area]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <TouchableOpacity style={styles.sortButton} onPress={() => setSortDesc((prev) => !prev)}>
                    <Text style={styles.sortText}>
                      Experiência: {sortDesc ? 'Maior → Menor' : 'Menor → Maior'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            loadingList
              ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
              : <Text style={styles.emptyText}>Nenhum psicólogo encontrado.</Text>
          }
          renderItem={({ item }) => (
            <PsychologistCard
              fullName={item.full_name}
              crpNumber={item.crp_number}
              yearsOfExperience={item.years_of_experience}
              focusArea={item.focus_area}
              highlight={item.isPrimary}
              badge={item.isPrimary ? 'SEU PSICÓLOGO' : undefined}
              onPress={() => router.push(`/home/book/${item.id}`)}
            />
          )}
        />
      ) : (
        <View style={styles.content}>
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>🗓️</Text>
            <Text style={styles.placeholderTitle}>Sua agenda</Text>
            <Text style={styles.placeholderText}>
              Configure os horários em que você está disponível para atender.
            </Text>
            <TouchableOpacity
              style={styles.availabilityBtn}
              onPress={() => router.push('/home/availability')}
            >
              <Text style={styles.availabilityBtnText}>Gerenciar disponibilidade</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greeting: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textDark },
  role: { fontSize: fontSize.sm, color: colors.textLight, marginTop: 2 },
  list: { padding: spacing.lg },
  matchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  matchBannerEmoji: { fontSize: 32 },
  matchBannerTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.surface,
    marginBottom: 2,
  },
  matchBannerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.surface,
    opacity: 0.9,
    lineHeight: 16,
  },
  matchBannerArrow: { fontSize: fontSize.xl, color: colors.surface, fontWeight: '700' },
  listTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.md,
  },
  chipsScroll: { marginBottom: spacing.sm },
  chipsContent: { gap: spacing.xs, paddingRight: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMedium,
  },
  chipTextActive: {
    color: colors.surface,
  },
  sortButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.secondary,
    backgroundColor: colors.secondary + '15',
  },
  sortText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.secondary,
  },
  emptyText: { fontSize: fontSize.md, color: colors.textLight, textAlign: 'center', marginTop: spacing.xl },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  placeholder: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholderEmoji: { fontSize: 56, marginBottom: spacing.md },
  placeholderTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textDark, marginBottom: spacing.sm },
  placeholderText: { fontSize: fontSize.md, color: colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg },
  availabilityBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  availabilityBtnText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.md },
});
