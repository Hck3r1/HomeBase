import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { ListingCard } from '../../components/ListingCard';
import { ScreenHeader } from '../../components/ScreenHeader';
import { EmptyState } from '../../components/EmptyState';
import { ListViewHeader } from '../../components/listings/ListViewHeader';
import { theme } from '../../theme';
import { useListings } from '../../hooks/listings';
import { useListingFilterKey, useListingFilters } from '../../hooks/useListingFilters';
import { Listing } from '../../types/listing';

export function SearchResultsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const filterKey = useListingFilterKey();
  const [page, setPage] = React.useState(1);
  const [items, setItems] = React.useState<Listing[]>([]);

  React.useEffect(() => {
    setPage(1);
    setItems([]);
  }, [filterKey]);

  const filters = useListingFilters(page, 20);
  const { data, isLoading, isFetching, refetch, isRefetching } = useListings(filters);

  React.useEffect(() => {
    if (!data?.data) return;
    setItems((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
  }, [data, page]);

  const total = data?.total ?? 0;
  const hasMore = items.length < total;

  const handleRefresh = async () => {
    setPage(1);
    setItems([]);
    await refetch();
  };

  const listHeader = (
    <ListViewHeader
      total={total}
      showing={items.length}
      isLoading={isLoading}
      onSearchSubmit={() => {
        setPage(1);
        setItems([]);
      }}
    />
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="List view" subtitle="Browse all matching listings" onBack={() => navigation.goBack()} />

      {isLoading && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <View style={styles.headerPad}>{listHeader}</View>
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<View style={styles.headerPad}>{listHeader}</View>}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <ListingCard
                listing={item}
                onPress={(id) => navigation.navigate('ListingDetail', { id })}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No matches found"
              text="Try a different search term, listing type, or loosen your filters."
              actionLabel="Edit filters"
              onAction={() => navigation.navigate('SearchFilters')}
            />
          }
          ListFooterComponent={
            items.length > 0 ? (
              <View style={styles.footer}>
                {hasMore ? (
                  <Button
                    label={isFetching ? 'Loading more…' : `Load more (${items.length} of ${total})`}
                    variant="secondary"
                    onPress={() => setPage((p) => p + 1)}
                  />
                ) : (
                  <View style={styles.endRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.muted} />
                    <Text style={styles.endText}>You’ve seen all {total} listings</Text>
                  </View>
                )}
              </View>
            ) : null
          }
          refreshing={isRefetching}
          onRefresh={handleRefresh}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + theme.spacing(4) },
            items.length === 0 && styles.emptyList,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  headerPad: { paddingHorizontal: theme.spacing(3) },
  loadingWrap: { flex: 1 },
  loader: { marginTop: theme.spacing(6) },
  listContent: { flexGrow: 1 },
  emptyList: { flexGrow: 1 },
  cardWrap: { paddingHorizontal: theme.spacing(3) },
  footer: {
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(2),
  },
  endRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.spacing(2),
  },
  endText: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
  },
});
