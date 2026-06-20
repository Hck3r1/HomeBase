import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../SearchBar';
import { SegmentedTypePills } from '../SegmentedTypePills';
import { SelectChip } from '../SelectChip';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';
import { formatNaira } from '../../lib/format';

type Sort = 'recent' | 'price_asc' | 'price_desc';

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];

interface Props {
  total: number;
  showing: number;
  isLoading: boolean;
  onSearchSubmit: (query: string) => void;
}

export function ListViewHeader({ total, showing, isLoading, onSearchSubmit }: Props) {
  const navigation = useNavigation<any>();
  const type = useFilterStore((s) => s.type);
  const setType = useFilterStore((s) => s.setType);
  const q = useFilterStore((s) => s.q);
  const sort = useFilterStore((s) => s.sort);
  const setSort = useFilterStore((s) => s.setSort);
  const minPrice = useFilterStore((s) => s.minPrice);
  const maxPrice = useFilterStore((s) => s.maxPrice);
  const bedrooms = useFilterStore((s) => s.bedrooms);
  const amenities = useFilterStore((s) => s.amenities);
  const setQuery = useFilterStore((s) => s.setQuery);
  const setPriceRange = useFilterStore((s) => s.setPriceRange);
  const setBedrooms = useFilterStore((s) => s.setBedrooms);
  const toggleAmenity = useFilterStore((s) => s.toggleAmenity);

  const [text, setText] = React.useState(q ?? '');

  React.useEffect(() => {
    setText(q ?? '');
  }, [q]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (minPrice != null) {
      chips.push({
        key: 'min',
        label: `From ${formatNaira(minPrice)}`,
        onClear: () => setPriceRange(undefined, maxPrice),
      });
    }
    if (maxPrice != null) {
      chips.push({
        key: 'max',
        label: `Up to ${formatNaira(maxPrice)}`,
        onClear: () => setPriceRange(minPrice, undefined),
      });
    }
    if (bedrooms != null) {
      chips.push({
        key: 'beds',
        label: `${bedrooms}+ beds`,
        onClear: () => setBedrooms(undefined),
      });
    }
    amenities.forEach((a) => {
      chips.push({
        key: a,
        label: a,
        onClear: () => toggleAmenity(a),
      });
    });
    return chips;
  }, [minPrice, maxPrice, bedrooms, amenities, setPriceRange, setBedrooms, toggleAmenity]);

  const openMap = () => {
    const parent = navigation.getParent();
    if (parent) parent.navigate('Map');
  };

  const submitSearch = () => {
    const next = text.trim();
    setQuery(next || undefined);
    onSearchSubmit(next);
  };

  const typeLabel =
    type === 'rent' ? 'For rent' : type === 'sale' ? 'For sale' : 'Short-stay';

  return (
    <View style={styles.wrap}>
      <SearchBar
        value={text}
        onChangeText={setText}
        onSubmit={submitSearch}
        onFilterPress={() => navigation.navigate('SearchFilters')}
        placeholder="Search city, area, or title"
      />

      <SegmentedTypePills value={type} onChange={setType} style={styles.pills} />

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View>
            <Text style={styles.summaryCount}>
              {isLoading && total === 0 ? '—' : total}
            </Text>
            <Text style={styles.summaryLabel}>
              {total === 1 ? 'listing found' : 'listings found'}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
        </View>
        {showing > 0 && showing < total ? (
          <Text style={styles.showing}>Showing {showing} of {total}</Text>
        ) : q ? (
          <Text style={styles.showing} numberOfLines={1}>
            Results for “{q}”
          </Text>
        ) : null}
      </View>

      {activeFilters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {activeFilters.map((chip) => (
            <Pressable key={chip.key} style={styles.filterChip} onPress={chip.onClear}>
              <Text style={styles.filterChipText}>{chip.label}</Text>
              <Ionicons name="close-circle" size={16} color={theme.colors.primary} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <SelectChip
            key={opt.value}
            label={opt.label}
            active={sort === opt.value}
            onPress={() => setSort(opt.value)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          onPress={openMap}
        >
          <Ionicons name="map-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.actionText}>Map view</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
          onPress={() => navigation.navigate('SearchFilters')}
        >
          <Ionicons name="options-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.actionText}>All filters</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: theme.spacing(1) },
  pills: { marginTop: theme.spacing(2) },
  summaryCard: {
    marginTop: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2),
    ...theme.shadow.card,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryCount: {
    fontSize: theme.font.size2xl,
    fontWeight: theme.font.weightBold,
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    marginTop: 2,
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
  },
  typeBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radii.pill,
  },
  typeBadgeText: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
  },
  showing: {
    marginTop: theme.spacing(1.5),
    fontSize: theme.font.sizeSm,
    color: theme.colors.muted,
  },
  filterRow: {
    gap: theme.spacing(1),
    paddingTop: theme.spacing(1.5),
    paddingRight: theme.spacing(1),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: theme.radii.pill,
  },
  filterChipText: {
    fontSize: theme.font.sizeSm,
    color: theme.colors.primary,
    fontWeight: theme.font.weightSemibold,
    textTransform: 'capitalize',
  },
  sortRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2),
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.line,
    ...theme.shadow.sm,
  },
  actionPressed: { opacity: 0.94 },
  actionText: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.primary,
  },
});
