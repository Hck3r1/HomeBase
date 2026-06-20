import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme';
import { ListingStatus } from '../../types/listing';

const STATUS_STYLE: Record<ListingStatus, { bg: string; text: string; label: string }> = {
  active: { bg: theme.colors.primaryLight, text: theme.colors.primary, label: 'Active' },
  paused: { bg: '#FFF4E5', text: '#B7791F', label: 'Paused' },
  draft: { bg: theme.colors.card, text: theme.colors.muted, label: 'Draft' },
  rented: { bg: theme.colors.card, text: theme.colors.ink, label: 'Rented' },
  sold: { bg: theme.colors.card, text: theme.colors.ink, label: 'Sold' },
};

interface Props {
  status: ListingStatus;
}

export function ListingStatusBadge({ status }: Props) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
  },
  text: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
});
