import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useRegistration } from '../../context/registration';
import { FocusArea, focusAreaLabels } from '../../lib/supabase';
import { colors, fontSize, radius, spacing } from '../../constants/theme';

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

const FOCUS_AREAS = Object.entries(focusAreaLabels) as [FocusArea, string][];

export default function RegisterPsychologistScreen() {
  const router = useRouter();
  const { setRegistrationData } = useRegistration();

  const [fullName, setFullName] = useState('');
  const [crpNumber, setCrpNumber] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [focusArea, setFocusArea] = useState<FocusArea | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Nome completo obrigatório';
    if (!crpNumber.trim()) newErrors.crpNumber = 'CRP obrigatório';
    if (cpf.replace(/\D/g, '').length !== 11) newErrors.cpf = 'CPF deve ter 11 dígitos';
    if (!email.trim()) newErrors.email = 'Email obrigatório';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email inválido';
    const years = parseInt(yearsOfExperience, 10);
    if (!yearsOfExperience || isNaN(years) || years < 0 || years > 60)
      newErrors.yearsOfExperience = 'Informe os anos de experiência (0–60)';
    if (!focusArea) newErrors.focusArea = 'Selecione uma área de atuação';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleContinue() {
    if (!validate()) return;
    setRegistrationData({
      role: 'psychologist',
      full_name: fullName.trim(),
      crp_number: crpNumber.trim(),
      cpf: cpf.replace(/\D/g, ''),
      email: email.trim().toLowerCase(),
      years_of_experience: yearsOfExperience,
      focus_area: focusArea!,
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
          <Text style={styles.badge}>🩺 Psicólogo</Text>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados profissionais</Text>
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
            label="Número do CRP"
            placeholder="Ex: 06/12345"
            autoCapitalize="none"
            value={crpNumber}
            onChangeText={setCrpNumber}
            error={errors.crpNumber}
          />
          <Input
            label="CPF"
            placeholder="000.000.000-00"
            keyboardType="numeric"
            value={cpf}
            onChangeText={(t) => setCpf(formatCPF(t))}
            error={errors.cpf}
            maxLength={14}
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
          <Input
            label="Anos de experiência"
            placeholder="Ex: 5"
            keyboardType="numeric"
            value={yearsOfExperience}
            onChangeText={setYearsOfExperience}
            error={errors.yearsOfExperience}
            maxLength={2}
          />

          <View style={styles.focusSection}>
            <Text style={styles.focusLabel}>Área de atuação</Text>
            <View style={styles.focusGrid}>
              {FOCUS_AREAS.map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, focusArea === key && styles.chipSelected]}
                  onPress={() => setFocusArea(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, focusArea === key && styles.chipTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.focusArea ? <Text style={styles.errorText}>{errors.focusArea}</Text> : null}
          </View>

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
  badge: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700', marginBottom: spacing.xs },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textDark, marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, color: colors.textLight },
  form: { gap: spacing.xs },
  focusSection: { marginBottom: spacing.md },
  focusLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMedium, marginBottom: spacing.sm },
  focusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: { fontSize: fontSize.sm, color: colors.textMedium, fontWeight: '500' },
  chipTextSelected: { color: colors.surface, fontWeight: '700' },
  errorText: { fontSize: 12, color: colors.error, marginTop: spacing.xs },
  btn: { marginTop: spacing.md },
});
