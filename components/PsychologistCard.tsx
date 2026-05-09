import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { FocusArea, focusAreaLabels } from '../lib/supabase';

type Props = {
  fullName: string;
  crpNumber: string;
  yearsOfExperience: number;
  focusArea: FocusArea;
  onPress?: () => void;
};

export function PsychologistCard({ fullName, crpNumber, yearsOfExperience, focusArea, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{fullName.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.crp}>{crpNumber}</Text>
        <View style={styles.tags}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{focusAreaLabels[focusArea]}</Text>
          </View>
          <View style={[styles.tag, styles.tagSecondary]}>
            <Text style={styles.tagText}>
              {yearsOfExperience} {yearsOfExperience === 1 ? 'ano' : 'anos'} de exp.
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.surface,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  info: { flex: 1 },
  name: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 2,
  },
  crp: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  tags: { flexDirection: 'row', gap: spacing.xs },
  tag: {
    backgroundColor: colors.primary + '20',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagSecondary: {
    backgroundColor: colors.secondary + '20',
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.textMedium,
    fontWeight: '600',
  },
});
