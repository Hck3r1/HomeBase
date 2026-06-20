import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SearchBar } from '../../components/SearchBar';
import { SegmentedTypePills } from '../../components/SegmentedTypePills';
import { ListingCard } from '../../components/ListingCard';
import { HomeBaseMark } from '../../components/HomeBaseMark';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { useListings } from '../../hooks/listings';
import { useListingFilters } from '../../hooks/useListingFilters';
import { useAuthStore } from '../../store/authStore';

export function HomeFeedScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const userName = useAuthStore((s) => s.user?.name);
  const firstName = userName?.split(' ')[0] ?? 'there';

  const type = useFilterStore((s) => s.type);
  const setType = useFilterStore((s) => s.setType);
  const setQuery = useFilterStore((s) => s.setQuery);
  const q = useFilterStore((s) => s.q);
  const [text, setText] = React.useState(q ?? '');

  const filters = useListingFilters();
  const { data, isLoading, refetch, isRefetching } = useListings(filters);

  const submitSearch = () => {
    setQuery(text.trim() || undefined);
    navigation.navigate('SearchResults');
  };

  const openMap = () => {
    const parent = navigation.getParent();
    if (parent) parent.navigate('Map');
    else navigation.navigate('MapView');
  };

  const total = data?.total ?? 0;

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.brandRow}>
        <View style={styles.logoWrap}>
          <HomeBaseMark size={28} color={theme.colors.primary} />
        </View>
        <View style={styles.brandText}>
          <Text style={styles.greeting}>Hello, {firstName}</Text>
          <Text style={styles.subGreeting}>Find your next home in Nigeria</Text>
        </View>
      </View>

      <SearchBar
        value={text}
        onChangeText={setText}
        onSubmit={submitSearch}
        onFilterPress={() => navigation.navigate('SearchFilters')}
        style={styles.search}
      />

      <SegmentedTypePills value={type} onChange={setType} />

      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {isLoading ? 'Loading…' : `${total} ${total === 1 ? 'listing' : 'listings'}`}
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable style={styles.iconAction} onPress={openMap} accessibilityRole="button">
            <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.iconActionText}>Map</Text>
          </Pressable>
          <Pressable
            style={styles.iconAction}
            onPress={() => navigation.navigate('SearchResults')}
            accessibilityRole="button"
          >
            <Ionicons name="list-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.iconActionText}>List</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {isLoading && !data ? (
        <View style={styles.loaderWrap}>
          {header}
          <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
        </View>
      ) : (
        <FlatList
          data={data?.data ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={(id) => navigation.navigate('ListingDetail', { id })}
            />
          )}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="home-outline" size={40} color={theme.colors.muted} />
              <Text style={styles.emptyTitle}>No listings found</Text>
              <Text style={styles.empty}>Try a different type or adjust your filters.</Text>
            </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  loaderWrap: { flex: 1, paddingHorizontal: theme.spacing(3) },
  loader: { marginTop: theme.spacing(6) },
  listContent: { paddingHorizontal: theme.spacing(3) },
  headerBlock: { paddingTop: theme.spacing(1), paddingBottom: theme.spacing(2) },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), marginBottom: theme.spacing(2.5) },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { flex: 1 },
  greeting: {
    fontSize: theme.font.sizeXl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  subGreeting: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    marginTop: 2,
  },
  search: { marginBottom: theme.spacing(2) },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing(2),
  },
  count: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.ink,
  },
  toolbarActions: { flexDirection: 'row', gap: theme.spacing(1) },
  iconAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  iconActionText: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
  },
  emptyWrap: { alignItems: 'center', paddingTop: theme.spacing(8), gap: theme.spacing(1) },
  emptyTitle: {
    fontSize: theme.font.sizeMd,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
  },
  empty: { textAlign: 'center', color: theme.colors.muted, maxWidth: 260 },
});
