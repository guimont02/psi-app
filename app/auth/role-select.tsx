import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';

export default function RoleSelectScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Voltar</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.title}>Como você vai{'\n'}usar o app?</Text>
        <Text style={styles.subtitle}>Escolha seu perfil para começar</Text>

        <View style={styles.cards}>
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/register-patient')}
          >
            <Text style={styles.cardEmoji}>💙</Text>
            <Text style={styles.cardTitle}>Sou Paciente</Text>
            <Text style={styles.cardDescription}>
              Quero encontrar um psicólogo e agendar sessões de terapia
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.cardPsychologist]}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/register-psychologist')}
          >
            <Text style={styles.cardEmoji}>🩺</Text>
            <Text style={styles.cardTitle}>Sou Psicólogo</Text>
            <Text style={styles.cardDescription}>
              Quero oferecer sessões e conectar com pacientes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  backBtn: { paddingVertical: spacing.md },
  backText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center' },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.xs,
    lineHeight: 36,
  },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, marginBottom: spacing.xl },
  cards: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPsychologist: {
    borderColor: colors.primary,
    backgroundColor: '#EBF4FF',
  },
  cardEmoji: { fontSize: 40, marginBottom: spacing.sm },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    lineHeight: 20,
  },
});
