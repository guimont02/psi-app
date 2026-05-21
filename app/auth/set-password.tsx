import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRegistration, PsychologistRegistrationData } from '../../context/registration';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { colors, fontSize, spacing } from '../../constants/theme';

export default function SetPasswordScreen() {
  const router = useRouter();
  const { registrationData, setRegistrationData } = useRegistration();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  function validate() {
    const newErrors: typeof errors = {};
    if (password.length < 8) newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
    if (password !== confirmPassword) newErrors.confirmPassword = 'As senhas não coincidem';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleRegister() {
    if (!registrationData) {
      Alert.alert('Erro', 'Dados de cadastro perdidos. Tente novamente.');
      router.replace('/auth/role-select');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: registrationData.email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Usuário não criado');

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: registrationData.full_name,
        email: registrationData.email,
        role: registrationData.role,
      });

      if (profileError) throw profileError;

      if (registrationData.role === 'psychologist') {
        const psy = registrationData as PsychologistRegistrationData;
        const { error: psyError } = await supabase.from('psychologists').insert({
          id: data.user.id,
          crp_number: psy.crp_number,
          cpf: psy.cpf,
          years_of_experience: parseInt(psy.years_of_experience, 10),
          focus_area: psy.focus_area,
          approach: psy.approach,
        });
        if (psyError) throw psyError;
      } else {
        const { error: patError } = await supabase.from('patients').insert({
          id: data.user.id,
          birth_date: registrationData.birth_date,
        });
        if (patError) throw patError;
      }

      setRegistrationData(null);
    } catch (err: any) {
      setLoading(false);
      console.error('[register] erro completo:', JSON.stringify(err, null, 2));
      console.error('[register] error object:', err);
      Alert.alert(
        'Erro no cadastro',
        `${err.message || 'Tente novamente.'}\n\ncode: ${err.code ?? '-'}\ndetails: ${err.details ?? '-'}\nhint: ${err.hint ?? '-'}`
      );
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>🔒</Text>
          <Text style={styles.title}>Crie sua senha</Text>
          <Text style={styles.subtitle}>
            Escolha uma senha segura com pelo menos 8 caracteres
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Senha"
            placeholder="Mínimo 8 caracteres"
            isPassword
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />
          <Input
            label="Confirmar senha"
            placeholder="Repita sua senha"
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
          />
          <Button
            title="Finalizar cadastro"
            loading={loading}
            onPress={handleRegister}
            style={styles.btn}
          />
        </View>
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
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textLight, textAlign: 'center', lineHeight: 22 },
  form: { gap: spacing.xs },
  btn: { marginTop: spacing.md },
});
