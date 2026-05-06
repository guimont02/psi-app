import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { colors, fontSize, spacing } from '../constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoEmoji}>🧠</Text>
        </View>
        <Text style={styles.title}>PsiApp</Text>
        <Text style={styles.subtitle}>
          Conectando você ao{'\n'}cuidado que merece
        </Text>
      </View>

      <View style={styles.actions}>
        <Button title="Entrar" onPress={() => router.push('/auth/login')} style={styles.btn} />
        <Button title="Criar conta" variant="outline" onPress={() => router.push('/auth/role-select')} style={styles.btn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoEmoji: { fontSize: 48 },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.textDark, letterSpacing: -1 },
  subtitle: { fontSize: fontSize.lg, color: colors.textLight, textAlign: 'center', lineHeight: 28 },
  actions: { gap: spacing.md },
  btn: { width: '100%' },
});
