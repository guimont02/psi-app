import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useRegistration } from '../../context/registration';
import { colors, fontSize, spacing } from '../../constants/theme';

function formatDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDate(value: string) {
  if (value.length !== 10) return false;
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    year <= new Date().getFullYear()
  );
}

export default function RegisterPatientScreen() {
  const router = useRouter();
  const { setRegistrationData } = useRegistration();

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; birthDate?: string; email?: string }>({});

  function handleDateChange(text: string) {
    setBirthDate(formatDate(text));
  }

  function validate() {
    const newErrors: typeof errors = {};
    if (!fullName.trim()) newErrors.fullName = 'Nome completo obrigatório';
    if (!birthDate || !isValidDate(birthDate)) newErrors.birthDate = 'Data inválida (DD/MM/AAAA)';
    if (!email.trim()) newErrors.email = 'Email obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    const [day, month, year] = birthDate.split('/');
    setRegistrationData({
      role: 'patient',
      full_name: fullName.trim(),
      birth_date: `${year}-${month}-${day}`,
      email: email.trim().toLowerCase(),
    });
    router.push('/auth/set-password');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.badge}>💙 Paciente</Text>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para começar</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nome completo"
            placeholder="Seu nome completo"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
            error={errors.fullName}
          />
          <Input
            label="Data de nascimento"
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            value={birthDate}
            onChangeText={handleDateChange}
            error={errors.birthDate}
            maxLength={10}
          />
          <Input
            label="Email"
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />
          <Button title="Continuar" onPress={handleContinue} style={styles.btn} />
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
  header: { marginBottom: spacing.xl },
  badge: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textLight },
  form: { gap: spacing.xs },
  btn: { marginTop: spacing.md },
});
