import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/Button';
import { TabHeroHeader } from '../../components/TabHeroHeader';
import { useAuthStore } from '../../store/authStore';
import { navigateHomeStack } from '../../navigation/homeStackNavigation';
import { theme } from '../../theme';

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const isLister = user?.role === 'lister';

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + theme.spacing(2), paddingBottom: insets.bottom + theme.spacing(10) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TabHeroHeader icon="person" title="Profile" subtitle="Your account and preferences" />

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{user?.name ?? 'Guest'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons
              name={isLister ? 'business-outline' : 'search-outline'}
              size={12}
              color={theme.colors.primary}
            />
            <Text style={styles.roleText}>
              {isLister ? `Lister · ${user?.listerType ?? 'host'}` : 'Seeker'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.menu}>
        {isLister ? (
          <MenuRow
            icon="grid-outline"
            label="My listings"
            hint="Manage your properties"
            onPress={() => navigation.navigate('Listings')}
          />
        ) : null}
        <MenuRow
          icon="chatbubbles-outline"
          label="Messages"
          hint="Conversations about listings"
          onPress={() => navigateHomeStack(navigation, 'Conversations')}
        />
        <MenuRow
          icon="notifications-outline"
          label="Notifications"
          hint="Alerts and updates"
          onPress={() => navigateHomeStack(navigation, 'Notifications')}
        />
        <MenuRow
          icon="help-circle-outline"
          label="Help & support"
          hint="FAQs and contact"
          onPress={() => Alert.alert('Coming soon')}
          last
        />
      </View>

      <Button label="Sign out" variant="secondary" onPress={handleSignOut} style={styles.signOut} />
    </ScrollView>
  );
}

function MenuRow({
  icon,
  label,
  hint,
  onPress,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  hint?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && styles.menuRowPressed]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        {hint ? <Text style={styles.menuHint}>{hint}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.surface },
  content: { paddingHorizontal: theme.spacing(3) },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(2),
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    padding: theme.spacing(2.5),
    marginBottom: theme.spacing(3),
    ...theme.shadow.card,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: theme.colors.white, fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold },
  info: { flex: 1 },
  name: { fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  email: { color: theme.colors.muted, marginTop: 4, fontSize: theme.font.sizeSm },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 10,
    backgroundColor: theme.colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: theme.radii.pill,
  },
  roleText: {
    color: theme.colors.primary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    textTransform: 'capitalize',
  },
  sectionLabel: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing(1),
  },
  menu: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.xl,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.line },
  menuRowPressed: { backgroundColor: theme.colors.surface },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCopy: { flex: 1 },
  menuLabel: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  menuHint: { marginTop: 2, fontSize: theme.font.sizeXs, color: theme.colors.muted },
  signOut: { marginTop: theme.spacing(4) },
});
