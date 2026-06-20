import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { SegmentedTypePills } from '../../components/SegmentedTypePills';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FieldLabel } from '../../components/FieldLabel';
import { SelectChip } from '../../components/SelectChip';
import { FormSection } from '../../components/lister/FormSection';
import { theme } from '../../theme';
import { useFilterStore } from '../../store/filterStore';

const AMENITIES = ['wifi', 'parking', 'ac', 'pool', 'water', 'security', 'furnished'];

export function SearchFiltersSheet() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const store = useFilterStore();
  const [minText, setMinText] = React.useState(
    store.minPrice ? String(Math.round(store.minPrice / 100)) : '',
  );
  const [maxText, setMaxText] = React.useState(
    store.maxPrice ? String(Math.round(store.maxPrice / 100)) : '',
  );

  const apply = () => {
    store.setPriceRange(
      minText ? Number(minText) * 100 : undefined,
      maxText ? Number(maxText) * 100 : undefined,
    );
    navigation.goBack();
    navigation.navigate('SearchResults');
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Filters" onBack={() => navigation.goBack()} subtitle="Refine your search" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <FormSection title="Listing type">
          <SegmentedTypePills value={store.type} onChange={store.setType} />
        </FormSection>

        <FormSection title="Price range" subtitle="Enter amounts in Naira">
          <View style={styles.row}>
            <View style={styles.half}>
              <FieldLabel>Minimum</FieldLabel>
              <View style={styles.inputBox}>
                <AppTextInput
                  placeholder="Min ₦"
                  keyboardType="numeric"
                  value={minText}
                  onChangeText={setMinText}
                />
              </View>
            </View>
            <View style={styles.half}>
              <FieldLabel>Maximum</FieldLabel>
              <View style={styles.inputBox}>
                <AppTextInput
                  placeholder="Max ₦"
                  keyboardType="numeric"
                  value={maxText}
                  onChangeText={setMaxText}
                />
              </View>
            </View>
          </View>
        </FormSection>

        <FormSection title="Bedrooms" subtitle="Minimum number of bedrooms">
          <View style={styles.chips}>
            {[1, 2, 3, 4].map((n) => (
              <SelectChip
                key={n}
                label={`${n}+`}
                active={store.bedrooms === n}
                onPress={() => store.setBedrooms(store.bedrooms === n ? undefined : n)}
              />
            ))}
          </View>
        </FormSection>

        <FormSection title="Amenities">
          <View style={styles.chips}>
            {AMENITIES.map((a) => (
              <SelectChip
                key={a}
                label={a}
                active={store.amenities.includes(a)}
                onPress={() => store.toggleAmenity(a)}
              />
            ))}
          </View>
        </FormSection>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing(2) }]}>
        <Button label="Reset" variant="secondary" onPress={store.reset} style={styles.footerBtn} />
        <Button label="Show results" onPress={apply} style={styles.footerBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: {
    paddingHorizontal: theme.spacing(3),
    paddingBottom: theme.spacing(2),
  },
  row: { flexDirection: 'row', gap: theme.spacing(1.5) },
  half: { flex: 1 },
  inputBox: {
    marginTop: theme.spacing(0.5),
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    ...theme.shadow.sm,
  },
  footerBtn: { flex: 1 },
});
