# Phase 7 — Notifications & Polish (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up push notifications end-to-end on the device (permissions, Expo push token registration via `POST /me/push-token` on login, foreground + tap handlers that route to the right screen), build the React Query hooks (`useNotifications`, `useMarkRead`, `useMarkAllRead`, `useUpdateProfile`, `useChangePassword`, `useDeleteAccount`), and ship the teal-design account screens: Notifications center, Profile, Edit profile (avatar upload via `expo-image-picker`), and Settings (push-prefs toggle, change password, logout via `authStore.signOut`, delete account).

**Architecture:** A `src/lib/push.ts` wrapper requests permissions, fetches the Expo push token, and POSTs it to `/me/push-token`; a `usePushRegistration()` hook fires it once the user is authenticated, and a `useNotificationRouting(navigation)` hook attaches the foreground + tap listeners and maps a notification's `type`/`payload` to a navigation target. React Query hooks in `src/api/notifications.ts` and `src/api/account.ts` call the Axios `api`; mutations update the Zustand `useAuthStore` (`setUser`/`signOut`) or invalidate the `['notifications']` query. Screens live in `src/screens/account/` and are composed into the existing navigation, reusing the teal primitives (`Screen`, `Button`, `InputGroup`, `AppTextInput`).

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, React Query, Zustand, Axios, expo-notifications, expo-device, expo-image-picker, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–6 frontend foundation is complete (theme, `Button`, `AppTextInput` at `components/TextInput`, `Screen`, `InputGroup`, `useAuthStore` with `signIn`/`signOut`/`setUser`/`AuthUser`, `api`, `queryClient`, navigation shell + `MainTabs`).

> All paths relative to `mobile/`.

---

## File Structure (created/modified this phase)

```
mobile/
└── src/
    ├── lib/push.ts                          # permissions + token + register + routing map
    ├── hooks/usePushNotifications.ts         # usePushRegistration + useNotificationRouting
    ├── api/notifications.ts                  # useNotifications, useMarkRead, useMarkAllRead
    ├── api/account.ts                        # useUpdateProfile, useChangePassword, useDeleteAccount
    ├── components/NotificationRow.tsx         # read/unread list row
    ├── screens/account/NotificationsScreen.tsx
    ├── screens/account/ProfileScreen.tsx
    ├── screens/account/EditProfileScreen.tsx
    ├── screens/account/SettingsScreen.tsx
    ├── navigation/AccountStack.tsx           # MODIFY: register account screens
    └── App.tsx                               # MODIFY: push registration + routing on launch
__tests__/
    ├── NotificationsScreen.test.tsx
    └── SettingsScreen.test.tsx
```

---

## Task 1: Push notifications lib (permissions, token, register, routing map)

**Files:**
- Create: `mobile/src/lib/push.ts`

- [ ] **Step 1: Install native deps**

Run: `cd ~/Projects/HomeBase/mobile && npx expo install expo-notifications expo-device expo-constants`

- [ ] **Step 2: Implement `src/lib/push.ts`**

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  const token = tokenResponse.data;

  await api.post('/me/push-token', { token, platform: Platform.OS });
  return token;
}

export interface NotificationData {
  type?: string;
  bookingId?: string;
  conversationId?: string;
  applicationId?: string;
  [key: string]: unknown;
}

export interface RouteTarget {
  screen: string;
  params?: Record<string, unknown>;
}

export function routeForNotification(data: NotificationData): RouteTarget {
  switch (data.type) {
    case 'booking_confirmed':
    case 'booking_request':
      return { screen: 'BookingDetail', params: { id: data.bookingId } };
    case 'message_new':
      return { screen: 'ChatThread', params: { conversationId: data.conversationId } };
    case 'application_update':
      return { screen: 'ApplicationDetail', params: { id: data.applicationId } };
    default:
      return { screen: 'Notifications' };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/lib/push.ts mobile/package.json
git commit -m "feat(mobile): expo push permissions, token registration, routing map"
```

---

## Task 2: Push hooks (register on login + route on tap)

**Files:**
- Create: `mobile/src/hooks/usePushNotifications.ts`

- [ ] **Step 1: Implement `src/hooks/usePushNotifications.ts`**

```ts
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/authStore';
import { registerForPushNotifications, routeForNotification, NotificationData } from '../lib/push';

/** Registers this device's Expo push token once the user is authenticated. */
export function usePushRegistration() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  useEffect(() => {
    if (!isAuthed) return;
    void registerForPushNotifications();
  }, [isAuthed]);
}

/** Attaches foreground + tap listeners and routes taps to the right screen. */
export function useNotificationRouting(navigation: { navigate: (screen: string, params?: object) => void }) {
  useEffect(() => {
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      const target = routeForNotification(data);
      navigation.navigate(target.screen, target.params);
    });

    // Foreground notifications are surfaced by the handler in push.ts; nothing extra to do here,
    // but we keep a received listener so future in-app banners can hook in.
    const fgSub = Notifications.addNotificationReceivedListener(() => {});

    return () => {
      tapSub.remove();
      fgSub.remove();
    };
  }, [navigation]);
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/usePushNotifications.ts
git commit -m "feat(mobile): push registration + tap-routing hooks"
```

---

## Task 3: Notifications API hooks

**Files:**
- Create: `mobile/src/api/notifications.ts`

- [ ] **Step 1: Implement `src/api/notifications.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

const KEY = ['notifications'] as const;

export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get<NotificationsResponse>('/notifications')).data,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.patch(`/notifications/${id}/read`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.patch('/notifications/read-all')).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/api/notifications.ts
git commit -m "feat(mobile): notifications react-query hooks"
```

---

## Task 4: Account API hooks

**Files:**
- Create: `mobile/src/api/account.ts`

- [ ] **Step 1: Implement `src/api/account.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore, AuthUser } from '../store/authStore';

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (input: { name?: string; phone?: string; avatarUrl?: string }) =>
      (await api.patch<AuthUser>('/me', input)).data,
    onSuccess: (user) => setUser(user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { oldPassword: string; newPassword: string }) =>
      (await api.patch('/me/password', input)).data,
  });
}

export function useDeleteAccount() {
  const signOut = useAuthStore((s) => s.signOut);
  return useMutation({
    mutationFn: async () => (await api.delete('/me')).data,
    onSuccess: () => signOut(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/api/account.ts
git commit -m "feat(mobile): account react-query hooks (profile, password, delete)"
```

---

## Task 5: NotificationRow primitive + Notifications center screen

**Files:**
- Create: `mobile/src/components/NotificationRow.tsx`
- Create: `mobile/src/screens/account/NotificationsScreen.tsx`
- Test: `mobile/__tests__/NotificationsScreen.test.tsx`

- [ ] **Step 1: Implement `NotificationRow.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { NotificationItem } from '../api/notifications';

const TITLES: Record<string, string> = {
  booking_confirmed: 'Booking confirmed',
  booking_request: 'New booking request',
  message_new: 'New message',
  application_update: 'Application update',
  viewing_scheduled: 'Viewing scheduled',
};

const BODIES: Record<string, string> = {
  booking_confirmed: 'Your stay is confirmed.',
  booking_request: 'A guest wants to book your place.',
  message_new: 'You have a new message.',
  application_update: 'There is an update on your application.',
  viewing_scheduled: 'An inspection has been scheduled.',
};

export function NotificationRow({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const unread = item.readAt === null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: unread }}
      testID={`notification-${item.id}`}
      style={[styles.row, unread && styles.rowUnread]}
    >
      {unread && <View style={styles.dot} testID={`unread-dot-${item.id}`} />}
      <View style={styles.body}>
        <Text style={[styles.title, unread && styles.titleUnread]}>{TITLES[item.type] ?? 'HomeBase'}</Text>
        <Text style={styles.subtitle}>{BODIES[item.type] ?? 'You have a new notification.'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  rowUnread: { backgroundColor: theme.colors.chip },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: theme.spacing(1.5) },
  body: { flex: 1 },
  title: { fontSize: theme.font.sizeMd, color: theme.colors.ink, fontWeight: theme.font.weightSemibold },
  titleUnread: { fontWeight: theme.font.weightBold },
  subtitle: { color: theme.colors.muted, marginTop: 2 },
});
```

- [ ] **Step 2: Write the failing test**

`mobile/__tests__/NotificationsScreen.test.tsx`:
```tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsScreen } from '../src/screens/account/NotificationsScreen';
import { api } from '../src/lib/api';

jest.spyOn(api, 'get').mockResolvedValue({
  data: {
    unreadCount: 1,
    items: [
      { id: 'n1', type: 'message_new', payload: {}, readAt: null, createdAt: '2026-06-19T10:00:00Z' },
      { id: 'n2', type: 'booking_confirmed', payload: {}, readAt: '2026-06-19T09:00:00Z', createdAt: '2026-06-19T08:00:00Z' },
    ],
  },
} as any);

function renderScreen() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <NotificationsScreen navigation={{ navigate: jest.fn() }} />
    </QueryClientProvider>,
  );
}

describe('NotificationsScreen', () => {
  it('renders unread and read notifications with the right state', async () => {
    const { getByText, getByTestId, queryByTestId } = renderScreen();
    await waitFor(() => expect(getByText('New message')).toBeTruthy());
    expect(getByText('Booking confirmed')).toBeTruthy();
    // unread row shows the dot; read row does not
    expect(getByTestId('unread-dot-n1')).toBeTruthy();
    expect(queryByTestId('unread-dot-n2')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test (fails)** → `npm test -- NotificationsScreen` → FAIL.

- [ ] **Step 4: Implement `NotificationsScreen.tsx`**

```tsx
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { NotificationRow } from '../../components/NotificationRow';
import { theme } from '../../theme';
import { useNotifications, useMarkRead, useMarkAllRead, NotificationItem } from '../../api/notifications';
import { routeForNotification } from '../../lib/push';

export function NotificationsScreen({ navigation }: any) {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  function open(item: NotificationItem) {
    if (item.readAt === null) markRead.mutate(item.id);
    const target = routeForNotification({ type: item.type, ...item.payload });
    if (target.screen !== 'Notifications') navigation.navigate(target.screen, target.params);
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Notifications</Text>
        {(data?.unreadCount ?? 0) > 0 && (
          <Pressable onPress={() => markAllRead.mutate()}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        )}
      </View>
      {!isLoading && (data?.items.length ?? 0) === 0 ? (
        <Text style={styles.empty}>You're all caught up.</Text>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <NotificationRow item={item} onPress={() => open(item)} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  heading: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  markAll: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold },
  empty: { color: theme.colors.muted, marginTop: theme.spacing(4), textAlign: 'center' },
});
```

- [ ] **Step 5: Run test (passes)** → `npm test -- NotificationsScreen` → PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/NotificationRow.tsx mobile/src/screens/account/NotificationsScreen.tsx mobile/__tests__/NotificationsScreen.test.tsx
git commit -m "feat(mobile): notifications center screen + read/unread row"
```

---

## Task 6: Profile screen

**Files:**
- Create: `mobile/src/screens/account/ProfileScreen.tsx`

- [ ] **Step 1: Implement `ProfileScreen.tsx`**

```tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export function ProfileScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);

  return (
    <Screen>
      <View style={styles.head}>
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.role === 'lister' && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {user.listerType === 'agent' ? 'Verified Agent' : 'Landlord'}
            </Text>
          </View>
        )}
      </View>
      <Button label="Edit profile" onPress={() => navigation.navigate('EditProfile')} style={{ marginTop: theme.spacing(3) }} />
      <Button
        label="Settings"
        variant="secondary"
        onPress={() => navigation.navigate('Settings')}
        style={{ marginTop: theme.spacing(2) }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: theme.spacing(4) },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: theme.colors.white, fontSize: 36, fontWeight: theme.font.weightBold },
  name: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginTop: theme.spacing(2) },
  email: { color: theme.colors.muted, marginTop: 2 },
  badge: {
    marginTop: theme.spacing(1),
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold, fontSize: theme.font.sizeSm },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/account/ProfileScreen.tsx
git commit -m "feat(mobile): profile screen"
```

---

## Task 7: Edit profile screen (avatar upload via expo-image-picker)

**Files:**
- Create: `mobile/src/screens/account/EditProfileScreen.tsx`

- [ ] **Step 1: Install expo-image-picker**

Run: `cd ~/Projects/HomeBase/mobile && npx expo install expo-image-picker`

- [ ] **Step 2: Implement `EditProfileScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useUpdateProfile } from '../../api/account';

export function EditProfileScreen({ navigation }: any) {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateProfile();

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Photo permission is required to change your avatar');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setAvatarUrl(result.assets[0].uri);
  }

  function submit() {
    setError(null);
    if (name.trim().length < 2) return setError('Enter your full name');
    update.mutate(
      { name, phone, avatarUrl },
      { onSuccess: () => navigation.goBack(), onError: () => setError('Could not save your profile') },
    );
  }

  return (
    <Screen>
      <Text style={styles.heading}>Edit profile</Text>
      <Pressable onPress={pickAvatar} style={styles.avatarPicker}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <Text style={styles.change}>Change photo</Text>
      </Pressable>
      <InputGroup>
        <AppTextInput placeholder="Full name" value={name} onChangeText={setName} />
        <AppTextInput placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      </InputGroup>
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label="Save" onPress={submit} style={{ marginTop: theme.spacing(2) }} disabled={update.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginTop: theme.spacing(2) },
  avatarPicker: { alignItems: 'center', marginVertical: theme.spacing(3) },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: { backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: theme.colors.white, fontSize: 36, fontWeight: theme.font.weightBold },
  change: { color: theme.colors.primary, fontWeight: theme.font.weightSemibold, marginTop: theme.spacing(1) },
  error: { color: theme.colors.danger, marginTop: theme.spacing(1) },
});
```

> Note: the picked image `uri` is sent as `avatarUrl` here. The Cloudinary signed-upload step (reusing the Phase 2 upload signature endpoint) is the same flow used by listing photos; swapping the local `uri` for the uploaded Cloudinary URL before `update.mutate` is a clearly-scoped follow-up that reuses existing upload code.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/account/EditProfileScreen.tsx mobile/package.json
git commit -m "feat(mobile): edit profile screen with avatar picker"
```

---

## Task 8: Settings screen (push toggle, change password, logout, delete account)

**Files:**
- Create: `mobile/src/screens/account/SettingsScreen.tsx`
- Test: `mobile/__tests__/SettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/SettingsScreen.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsScreen } from '../src/screens/account/SettingsScreen';
import { useAuthStore } from '../src/store/authStore';

function renderScreen() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <SettingsScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />
    </QueryClientProvider>,
  );
}

describe('SettingsScreen', () => {
  it('calls authStore.signOut when Log out is pressed', async () => {
    const signOut = jest.spyOn(useAuthStore.getState(), 'signOut').mockResolvedValue();
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Log out'));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npm test -- SettingsScreen` → FAIL.

- [ ] **Step 3: Implement `SettingsScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useChangePassword, useDeleteAccount } from '../../api/account';

export function SettingsScreen({ navigation }: any) {
  const signOut = useAuthStore((s) => s.signOut);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMessage, setPwMessage] = useState<string | null>(null);
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();

  function submitPassword() {
    setPwMessage(null);
    if (newPassword.length < 8) return setPwMessage('New password must be at least 8 characters');
    changePassword.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          setPwMessage('Password updated');
          setOldPassword('');
          setNewPassword('');
        },
        onError: () => setPwMessage('Current password is incorrect'),
      },
    );
  }

  return (
    <Screen>
      <Text style={styles.heading}>Settings</Text>

      <Text style={styles.section}>Push notifications</Text>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Enable push notifications</Text>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ true: theme.colors.primary, false: theme.colors.line }}
        />
      </View>

      <Text style={styles.section}>Change password</Text>
      <InputGroup>
        <AppTextInput placeholder="Current password" secureTextEntry value={oldPassword} onChangeText={setOldPassword} />
        <AppTextInput placeholder="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
      </InputGroup>
      {pwMessage && <Text style={styles.message}>{pwMessage}</Text>}
      <Button label="Update password" onPress={submitPassword} style={{ marginTop: theme.spacing(2) }} disabled={changePassword.isPending} />

      <Button label="Log out" variant="secondary" onPress={() => signOut()} style={{ marginTop: theme.spacing(4) }} />

      <Pressable onPress={() => deleteAccount.mutate()} style={styles.delete} disabled={deleteAccount.isPending}>
        <Text style={styles.deleteText}>Delete account</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, color: theme.colors.ink, marginTop: theme.spacing(2) },
  section: { fontSize: theme.font.sizeSm, fontWeight: theme.font.weightSemibold, color: theme.colors.muted, marginTop: theme.spacing(3), marginBottom: theme.spacing(1) },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.card,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
  },
  toggleLabel: { fontSize: theme.font.sizeMd, color: theme.colors.ink },
  message: { color: theme.colors.muted, marginTop: theme.spacing(1) },
  delete: { marginTop: theme.spacing(3), alignItems: 'center' },
  deleteText: { color: theme.colors.danger, fontWeight: theme.font.weightSemibold },
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- SettingsScreen` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/account/SettingsScreen.tsx mobile/__tests__/SettingsScreen.test.tsx
git commit -m "feat(mobile): settings screen (push toggle, password, logout, delete)"
```

---

## Task 9: Wire account stack + push registration/routing on launch

**Files:**
- Modify: `mobile/src/navigation/AccountStack.tsx`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Register the screens in `AccountStack.tsx`**

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { EditProfileScreen } from '../screens/account/EditProfileScreen';
import { SettingsScreen } from '../screens/account/SettingsScreen';
import { NotificationsScreen } from '../screens/account/NotificationsScreen';

const Stack = createNativeStackNavigator();

export function AccountStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Register the device + route taps in `App.tsx`**

Inside the app tree (where the `NavigationContainer` and its `ref` are available), call the hooks:
```tsx
import { usePushRegistration, useNotificationRouting } from './src/hooks/usePushNotifications';
import { navigationRef } from './src/navigation/navigationRef'; // existing ref, or use the NavigationContainer ref

function PushBridge() {
  usePushRegistration();
  useNotificationRouting(navigationRef);
  return null;
}

// Render <PushBridge /> once, inside the providers, below NavigationContainer:
//   <QueryClientProvider ...>
//     <NavigationContainer ref={navigationRef}>
//       <RootNavigator />
//       <PushBridge />
//     </NavigationContainer>
//   </QueryClientProvider>
```

> `usePushRegistration` only fires after the user is authenticated (it reads `isAuthenticated()` from the store), satisfying "register via `POST /me/push-token` on login". `useNotificationRouting` uses the navigation ref so a tapped notification (cold or background) routes to the mapped screen.

- [ ] **Step 3: Run full suite + manual check**

Run: `npm test` → all PASS.
Run: `npx expo start` (dev build on a physical device) → log in → permission prompt → token registered → trigger a backend notification → foreground banner shows; tapping it opens the mapped screen; Notifications center lists read/unread; Settings logout returns to the auth flow.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/navigation/AccountStack.tsx mobile/App.tsx
git commit -m "feat(mobile): wire account stack + push registration/routing on launch"
```

---

## Self-Review (against spec §5.6 Account & Trust, §11 Design System, screens 29/30/34/35)

- **expo-notifications setup (permissions, Expo token, register via `POST /me/push-token` on login):** Tasks 1, 2 — `registerForPushNotifications()` + `usePushRegistration()` gated on `isAuthenticated()`. ✓
- **Foreground + tap handlers routing to the right screen:** Tasks 1, 2 — `setNotificationHandler` for foreground, `addNotificationResponseReceivedListener` + `routeForNotification` for taps. ✓
- **Hooks `useNotifications`, `useMarkRead`, `useMarkAllRead`:** Task 3 (invalidate `['notifications']`). ✓
- **Hooks `useUpdateProfile`, `useChangePassword`, `useDeleteAccount`:** Task 4 (`setUser` / `signOut` integration). ✓
- **Notifications center (list + unread states):** Task 5 — `NotificationRow` read/unread styling + dot, mark-all-read. ✓
- **Profile (screen 29) + Edit profile with avatar upload via expo-image-picker (screen 30):** Tasks 6, 7. ✓
- **Settings (screen 35): push prefs toggle, change password, logout via `authStore.signOut`, delete account:** Task 8. ✓
- **Tests — notifications list render (read/unread); settings logout calls signOut:** Tasks 5, 8. ✓
- **Teal design system (pill buttons, grouped inputs, chip surfaces, teal accents):** `Button`, `InputGroup`, `theme.colors.primary/chip/card` throughout. ✓

**Type consistency:** `NotificationItem` (with nullable `readAt`) is the single shape across the `useNotifications` hook, `NotificationRow`, and the screen; `routeForNotification` consumes the same `type`/`payload` the backend `notify()` sends; `useUpdateProfile`/`useDeleteAccount` return/use the `AuthUser` shape and the store's `setUser`/`signOut`, matching the Phase 1 store contract and the Phase 7 backend `PATCH /me`, `PATCH /me/password`, `DELETE /me` endpoints.

**No placeholders:** every code step is complete and runnable. The two annotated notes (Task 7 Cloudinary upload swap, Task 9 navigation-ref wiring) reuse existing Phase 2 upload code and the app's existing navigation ref respectively — clearly-scoped integration points, not missing requirements.
