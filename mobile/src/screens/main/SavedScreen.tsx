import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListingCard } from '../../components/ListingCard';
import { TabHeroHeader } from '../../components/TabHeroHeader';
import { EmptyState } from '../../components/EmptyState';
import { theme } from '../../theme';
import { useSavedStore } from '../../store/savedStore';
import { useSavedListings } from '../../hooks/listings';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';

export function SavedScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const ids = useSavedStore((s) => s.ids);
  const hydrated = useSavedStore((s) => s.hydrated);
  const queries = useSavedListings(ids);

  const listings = useMemo(
    () =>
      queries
        .map((q) => q.data)
        .filter((l): l is NonNullable<typeof l> => l != null),
    [queries],
  );
  const isLoading = !hydrated || queries.some((q) => q.isLoading);

  const openDetail = (id: string) => {
    navigateHomeStack(navigation, 'ListingDetail', { id });
  };

  const header = (
    <View style={styles.header}>
      <TabHeroHeader
        icon="heart"
        title="Saved"
        subtitle="Listings you've bookmarked for later"
      />
      {listings.length > 0 ? (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{listings.length} saved</Text>
        </View>
      ) : null}
    </View>
  );

  if (!hydrated || (isLoading && listings.length === 0)) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.content}>{header}</View>
        <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => <ListingCard listing={item} onPress={openDetail} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + theme.spacing(10) },
          listings.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="No saved listings yet"
            text="Tap the heart on any listing to save it here for quick access."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { paddingHorizontal: theme.spacing(3) },
  header: { paddingHorizontal: theme.spacing(3), paddingTop: theme.spacing(2) },
  countPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    marginBottom: theme.spacing(1),
  },
  countText: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
  },
  listContent: { paddingHorizontal: theme.spacing(3) },
  emptyList: { flexGrow: 1 },
  loader: { marginTop: theme.spacing(6) },
});
