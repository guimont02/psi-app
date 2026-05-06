import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from 'expo-router';
import { CommonActions } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';
import { Button } from '../../components/Button';
import { colors, fontSize, radius, spacing } from '../../constants/theme';

type Profile = {
  full_name: string;
  role: 'patient' | 'psychologist';
};

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const [profile, setProfile] = useState<Profile | null>(null);

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

  async function handleSignOut() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.dispatch(
            CommonActions.reset({ index: 0, routes: [{ name: 'index' }] })
          );
        },
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

      <View style={styles.content}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderEmoji}>🚧</Text>
          <Text style={styles.placeholderTitle}>Em construção</Text>
          <Text style={styles.placeholderText}>
            {isPatient
              ? 'Em breve você poderá encontrar e agendar sessões com psicólogos.'
              : 'Em breve você poderá gerenciar sua agenda e atender pacientes.'}
          </Text>
        </View>
      </View>
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
  placeholderText: { fontSize: fontSize.md, color: colors.textLight, textAlign: 'center', lineHeight: 22 },
});
