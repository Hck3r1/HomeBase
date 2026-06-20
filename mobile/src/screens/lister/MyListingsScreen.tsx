import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MyListingCard } from '../../components/lister/MyListingCard';
import { TabHeroHeader } from '../../components/TabHeroHeader';
import { EmptyState } from '../../components/EmptyState';
import { theme } from '../../theme';
import { useMyListings } from '../../hooks/listings';

export function MyListingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isRefetching } = useMyListings();

  const listings = data ?? [];
  const stats = useMemo(
    () => ({
      total: listings.length,
      active: listings.filter((l) => l.status === 'active').length,
      paused: listings.filter((l) => l.status === 'paused').length,
    }),
    [listings],
  );

  const header = (
    <View style={styles.headerBlock}>
      <TabHeroHeader
        icon="grid-outline"
        title="My listings"
        subtitle="Manage properties you've published on HomeBase"
      />

      {listings.length > 0 ? (
        <View style={styles.statsRow}>
          <StatCard label="Active" value={stats.active} accent={theme.colors.primary} />
          <StatCard label="Paused" value={stats.paused} accent="#B7791F" />
          <StatCard label="Total" value={stats.total} accent={theme.colors.ink} />
        </View>
      ) : null}

      <Pressable
        style={({ pressed }) => [styles.createCard, pressed && styles.createCardPressed]}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <View style={styles.createIcon}>
          <Ionicons name="add" size={24} color={theme.colors.white} />
        </View>
        <View style={styles.createCopy}>
          <Text style={styles.createTitle}>Create new listing</Text>
          <Text style={styles.createSubtitle}>Add photos, pricing, and location in minutes</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {isLoading && listings.length === 0 ? (
        <View style={styles.loadingWrap}>
          {header}
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) => (
            <MyListingCard
              listing={item}
              onPress={() => navigation.navigate('EditListing', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="home-outline"
              title="No listings yet"
              text="Publish your first property to start reaching seekers across Nigeria."
              actionLabel="Create listing"
              onAction={() => navigation.navigate('CreateListing')}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + theme.spacing(10) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  loadingWrap: { flex: 1 },
  loader: { marginTop: theme.spacing(6) },
  listContent: { paddingHorizontal: theme.spacing(3) },
  headerBlock: { paddingTop: theme.spacing(2), paddingBottom: theme.spacing(1) },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(1.5),
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  statValue: {
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightBold,
  },
  statLabel: {
    marginTop: 2,
    fontSize: theme.font.sizeXs,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
  },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.card,
  },
  createCardPressed: { opacity: 0.96 },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCopy: { flex: 1 },
  createTitle: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  createSubtitle: {
    marginTop: 2,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
  },
});
