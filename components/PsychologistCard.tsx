import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { FocusArea, focusAreaLabels } from '../lib/supabase';

type Props = {
  fullName: string;
  crpNumber: string;
  yearsOfExperience: number;
  focusArea: FocusArea;
  onPress?: () => void;
  highlight?: boolean;
  badge?: string;
};

export function PsychologistCard({
  fullName,
  crpNumber,
  yearsOfExperience,
  focusArea,
  onPress,
  highlight,
  badge,
}: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, highlight && styles.cardHighlight]}
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
    >
      <View style={[styles.avatar, highlight && styles.avatarHighlight]}>
        <Text style={styles.avatarText}>{fullName.charAt(0)}</Text>
      </View>
      <View style={styles.info}>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
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
  cardHighlight: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
    borderWidth: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.xs,
  },
  badgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  avatarHighlight: {
    backgroundColor: colors.success,
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
