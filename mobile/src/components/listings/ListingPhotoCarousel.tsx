import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

interface Props {
  urls: string[];
  onPress: (index: number) => void;
}

export function ListingPhotoCarousel({ urls, onPress }: Props) {
  const width = Dimensions.get('window').width;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<string>>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  if (!urls.length) {
    return (
      <View style={[styles.placeholder, { width, height: HERO_HEIGHT }]}>
        <Ionicons name="image-outline" size={48} color={theme.colors.muted} />
        <Text style={styles.placeholderText}>No photos yet</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        ref={listRef}
        data={urls}
        keyExtractor={(uri, i) => `${uri}-${i}`}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item, index: i }) => (
          <Pressable onPress={() => onPress(i)} accessibilityRole="button">
            <Image source={{ uri: item }} style={{ width, height: HERO_HEIGHT }} />
          </Pressable>
        )}
      />
      {urls.length > 1 ? (
        <>
          <View style={styles.countBadge}>
            <Ionicons name="images-outline" size={13} color={theme.colors.white} />
            <Text style={styles.countText}>
              {index + 1}/{urls.length}
            </Text>
          </View>
          <View style={[styles.dots, { top: HERO_HEIGHT - theme.spacing(3) }]}>
            {urls.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}
      <View style={[styles.fade, { top: HERO_HEIGHT - 80, height: 80 }]} pointerEvents="none" />
    </View>
  );
}

export const HERO_HEIGHT = 300;

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  countBadge: {
    position: 'absolute',
    bottom: theme.spacing(2.5),
    right: theme.spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
  },
  countText: {
    color: theme.colors.white,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.white,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(250, 251, 250, 0.85)',
  },
});
