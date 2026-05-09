import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, FlatList, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, FocusArea, focusAreaLabels } from '../../../lib/supabase';
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

const FOCUS_AREAS = Object.keys(focusAreaLabels) as FocusArea[];

export default function HomeScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [psychologists, setPsychologists] = useState<Psychologist[]>([]);
  const [loadingPsychologists, setLoadingPsychologists] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<FocusArea | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

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

  useEffect(() => {
    if (profile?.role !== 'patient') return;
    setLoadingPsychologists(true);
    supabase
      .from('psychologists')
      .select('id, crp_number, years_of_experience, focus_area, profiles(full_name)')
      .then(({ data }) => {
        if (data) setPsychologists(data as Psychologist[]);
        setLoadingPsychologists(false);
      });
  }, [profile]);

  const filteredPsychologists = useMemo(() => {
    let list = selectedFocusArea
      ? psychologists.filter((p) => p.focus_area === selectedFocusArea)
      : psychologists;
    return [...list].sort((a, b) =>
      sortDesc
        ? b.years_of_experience - a.years_of_experience
        : a.years_of_experience - b.years_of_experience
    );
  }, [psychologists, selectedFocusArea, sortDesc]);

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
          data={filteredPsychologists}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <Text style={styles.listTitle}>Psicólogos disponíveis</Text>

              {/* Filtro: Área de foco */}
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

              {/* Filtro: Ordenar por experiência */}
              <TouchableOpacity style={styles.sortButton} onPress={() => setSortDesc((prev) => !prev)}>
                <Text style={styles.sortText}>
                  Experiência: {sortDesc ? 'Maior → Menor' : 'Menor → Maior'}
                </Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            loadingPsychologists
              ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
              : <Text style={styles.emptyText}>Nenhum psicólogo encontrado.</Text>
          }
          renderItem={({ item }) => (
            <PsychologistCard
              fullName={item.profiles.full_name}
              crpNumber={item.crp_number}
              yearsOfExperience={item.years_of_experience}
              focusArea={item.focus_area}
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
