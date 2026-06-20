import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

const { width } = Dimensions.get('window');

export function PhotoGalleryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { urls, initialIndex } = route.params as { urls: string[]; initialIndex?: number };
  const [index, setIndex] = useState(initialIndex ?? 0);
  const listRef = useRef<FlatList>(null);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={urls}
        horizontal
        pagingEnabled
        initialScrollIndex={initialIndex ?? 0}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(item, i) => `${item}-${i}`}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(next);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.image} resizeMode="contain" />
        )}
        showsHorizontalScrollIndicator={false}
      />

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={theme.colors.white} />
        </Pressable>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {index + 1} / {urls.length}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  image: { width, height: '100%' },
  topBar: {
    position: 'absolute',
    left: theme.spacing(3),
    right: theme.spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: theme.radii.pill,
  },
  counterText: {
    color: theme.colors.white,
    fontWeight: theme.font.weightSemibold,
    fontSize: theme.font.sizeSm,
  },
});
