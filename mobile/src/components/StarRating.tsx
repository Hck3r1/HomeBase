import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

export const STAR_COLOR = '#F4B400';

export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};

export function ratingLabel(value: number): string {
  return RATING_LABELS[value] ?? '';
}

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  showLabel?: boolean;
  centered?: boolean;
  style?: ViewStyle;
}

export function StarRating({
  value,
  onChange,
  size = 32,
  readonly,
  showLabel,
  centered,
  style,
}: StarRatingProps) {
  const interactive = !readonly && Boolean(onChange);

  return (
    <View style={[centered && styles.centered, style]}>
      <View style={[styles.row, centered && styles.rowCentered]}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= value;
          const active = interactive && star === value;
          const icon = filled ? 'star' : 'star-outline';
          const color = filled ? STAR_COLOR : theme.colors.line;
          const starNode = (
            <View style={[styles.starTap, active && styles.starTapActive]}>
              <Ionicons name={icon} size={size} color={color} />
            </View>
          );

          if (!interactive) {
            return <View key={star}>{starNode}</View>;
          }

          return (
            <Pressable
              key={star}
              onPress={() => onChange!(star)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Rate ${star} out of 5`}
            >
              {starNode}
            </Pressable>
          );
        })}
      </View>
      {showLabel && value > 0 ? (
        <Text style={[styles.label, centered && styles.labelCentered]}>{ratingLabel(value)}</Text>
      ) : null}
    </View>
  );
}

interface RatingBadgeProps {
  average: number | null;
  count: number;
  compact?: boolean;
}

export function RatingBadge({ average, count, compact }: RatingBadgeProps) {
  if (!count || average == null) {
    if (compact) return null;
    return (
      <View style={styles.newBadge}>
        <Ionicons name="star-outline" size={12} color={theme.colors.muted} />
        <Text style={styles.newText}>New listing</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <Ionicons name="star" size={compact ? 12 : 14} color={STAR_COLOR} />
      <Text style={[styles.badgeScore, compact && styles.badgeScoreCompact]}>{average.toFixed(1)}</Text>
      <Text style={styles.badgeCount}>({count})</Text>
    </View>
  );
}

/** @deprecated use RatingBadge */
export const RatingPill = RatingBadge;

interface RatingSummaryCardProps {
  average: number | null;
  count: number;
  title?: string;
}

export function RatingSummaryCard({ average, count, title = 'Overall rating' }: RatingSummaryCardProps) {
  if (!count || average == null) {
    return (
      <View style={styles.summaryCard}>
        <View style={styles.summaryEmptyIcon}>
          <Ionicons name="star-outline" size={28} color={theme.colors.muted} />
        </View>
        <Text style={styles.summaryEmptyTitle}>No ratings yet</Text>
        <Text style={styles.summaryEmptyBody}>Be the first to leave a review after your inspection.</Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>{title}</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryScore}>{average.toFixed(1)}</Text>
        <View style={styles.summaryMeta}>
          <StarRating value={Math.round(average)} readonly size={18} />
          <Text style={styles.summaryCount}>
            {count} review{count === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowCentered: { justifyContent: 'center' },
  starTap: {
    padding: 4,
    borderRadius: theme.radii.pill,
  },
  starTapActive: {
    backgroundColor: theme.colors.starLight,
  },
  label: {
    marginTop: theme.spacing(1),
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
  },
  labelCentered: { textAlign: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.starLight,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.pill,
  },
  badgeCompact: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeScore: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  badgeScoreCompact: { fontSize: theme.font.sizeXs },
  badgeCount: {
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.pill,
  },
  newText: { fontSize: theme.font.sizeXs, color: theme.colors.muted, fontWeight: theme.font.weightSemibold },
  summaryCard: {
    width: '100%',
    backgroundColor: theme.colors.starLight,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(244, 180, 0, 0.2)',
    padding: theme.spacing(2),
    marginTop: theme.spacing(1.5),
  },
  summaryTitle: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing(1),
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  summaryScore: {
    fontSize: 40,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -1,
    lineHeight: 44,
  },
  summaryMeta: { gap: 4 },
  summaryCount: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
  },
  summaryEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing(1),
  },
  summaryEmptyTitle: {
    textAlign: 'center',
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  summaryEmptyBody: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    lineHeight: 20,
  },
});
