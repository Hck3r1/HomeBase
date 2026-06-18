# Phase 0 — Foundation (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable, tested Expo (React Native + TypeScript) app with the HomeBase teal design system, reusable UI primitives, navigation shell (auth stack + main tabs), an API client, and React Query + Zustand wiring.

**Architecture:** Expo managed app. A central `theme` module holds design tokens. Reusable primitives (`Button`, `TextInput`, `Screen`) consume the theme and are unit-tested with React Native Testing Library. Navigation uses React Navigation with a root switch between an Auth stack and a Main bottom-tab navigator (placeholder screens this phase). Server state uses React Query; ephemeral/auth UI state uses Zustand. An Axios instance centralizes API calls and base URL config.

**Tech Stack:** Expo SDK (latest), React Native, TypeScript, React Navigation (native-stack + bottom-tabs), @tanstack/react-query, Zustand, Axios, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal.

> **Monorepo layout:** Frontend lives in `~/Projects/HomeBase/mobile`. All paths below are relative to `mobile/` unless noted.

---

## File Structure (created in this phase)

```
mobile/
├── App.tsx
├── app.json
├── tsconfig.json
├── jest.config.js
├── babel.config.js
├── .env.example
└── src/
    ├── theme/index.ts            # colors, spacing, radii, typography
    ├── components/
    │   ├── Button.tsx
    │   ├── TextInput.tsx
    │   └── Screen.tsx
    ├── lib/
    │   ├── api.ts                # axios instance
    │   └── queryClient.ts        # react-query client
    ├── store/
    │   └── authStore.ts          # zustand auth/session state
    ├── navigation/
    │   ├── RootNavigator.tsx
    │   ├── AuthStack.tsx
    │   └── MainTabs.tsx
    └── screens/
        ├── auth/WelcomeScreen.tsx        # placeholder
        └── main/HomePlaceholderScreen.tsx
__tests__/
    ├── Button.test.tsx
    ├── theme.test.ts
    └── authStore.test.ts
```

---

## Task 1: Create the Expo app

**Files:**
- Create: `mobile/` (Expo scaffold), `mobile/tsconfig.json`

- [ ] **Step 1: Scaffold the Expo TypeScript app**

Run:
```bash
cd ~/Projects/HomeBase
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
```

- [ ] **Step 2: Verify it starts**

Run: `npx expo start --no-dev --offline` (or `npx expo start`)
Expected: Metro bundler starts and prints a QR code without errors. Stop with Ctrl-C.

- [ ] **Step 3: Commit**

```bash
git add mobile && git commit -m "chore(mobile): scaffold Expo TypeScript app"
```

---

## Task 2: Install dependencies

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install navigation + state + http**

Run:
```bash
cd ~/Projects/HomeBase/mobile
npx expo install @react-navigation/native @react-navigation/native-stack \
  @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
npm install @tanstack/react-query zustand axios
```

- [ ] **Step 2: Install test tooling**

Run:
```bash
npm install -D jest jest-expo @testing-library/react-native @types/jest @testing-library/jest-native
```

- [ ] **Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore(mobile): install navigation, state, http, and test deps"
```

---

## Task 3: Jest configuration

**Files:**
- Create: `mobile/jest.config.js`
- Modify: `mobile/package.json` (test script)

- [ ] **Step 1: Write `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-svg))',
  ],
};
```

- [ ] **Step 2: Add the test script to `package.json`**

Add to `"scripts"`:
```json
{ "test": "jest" }
```

- [ ] **Step 3: Add a trivial smoke test**

`mobile/__tests__/smoke.test.ts`:
```ts
describe('jest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add mobile/jest.config.js mobile/package.json mobile/__tests__/smoke.test.ts
git commit -m "test(mobile): configure jest-expo harness"
```

---

## Task 4: Design system theme

**Files:**
- Create: `mobile/src/theme/index.ts`
- Test: `mobile/__tests__/theme.test.ts`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/theme.test.ts`:
```ts
import { theme } from '../src/theme';

describe('theme', () => {
  it('exposes the HomeBase teal primary', () => {
    expect(theme.colors.primary).toBe('#3B7A6F');
  });

  it('exposes a pill radius and base spacing', () => {
    expect(theme.radii.pill).toBeGreaterThanOrEqual(24);
    expect(theme.spacing(2)).toBe(16);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- theme`
Expected: FAIL — cannot find module `../src/theme`.

- [ ] **Step 3: Write minimal implementation**

`mobile/src/theme/index.ts`:
```ts
export const theme = {
  colors: {
    primary: '#3B7A6F',
    primaryDark: '#2F6359',
    ink: '#15201D',
    muted: '#8A938F',
    line: '#E6EAE8',
    card: '#F3F5F4',
    chip: '#EAF1EF',
    white: '#FFFFFF',
    danger: '#C0392B',
  },
  radii: { sm: 8, md: 14, lg: 16, pill: 30 },
  spacing: (n: number) => n * 8,
  font: {
    sizeXs: 11,
    sizeSm: 13,
    sizeMd: 15,
    sizeLg: 19,
    sizeXl: 25,
    weightRegular: '400' as const,
    weightSemibold: '600' as const,
    weightBold: '700' as const,
  },
} as const;

export type Theme = typeof theme;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- theme`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/theme/index.ts mobile/__tests__/theme.test.ts
git commit -m "feat(mobile): teal design-system theme tokens"
```

---

## Task 5: Button primitive (pill)

**Files:**
- Create: `mobile/src/components/Button.tsx`
- Test: `mobile/__tests__/Button.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/Button.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../src/components/Button';

describe('Button', () => {
  it('renders its label', () => {
    const { getByText } = render(<Button label="Sign up" onPress={() => {}} />);
    expect(getByText('Sign up')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap" onPress={onPress} />);
    fireEvent.press(getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Off" onPress={onPress} disabled />);
    fireEvent.press(getByText('Off'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Button`
Expected: FAIL — cannot find module `../src/components/Button`.

- [ ] **Step 3: Write minimal implementation**

`mobile/src/components/Button.tsx`:
```tsx
import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme';

type Variant = 'primary' | 'secondary';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, !isPrimary && styles.labelSecondary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 15, borderRadius: theme.radii.pill, alignItems: 'center' },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.line },
  disabled: { opacity: 0.5 },
  label: { color: theme.colors.white, fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold },
  labelSecondary: { color: theme.colors.ink },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Button`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/Button.tsx mobile/__tests__/Button.test.tsx
git commit -m "feat(mobile): pill Button primitive"
```

---

## Task 6: TextInput + Screen primitives

**Files:**
- Create: `mobile/src/components/TextInput.tsx`
- Create: `mobile/src/components/Screen.tsx`
- Test: `mobile/__tests__/TextInput.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/TextInput.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppTextInput } from '../src/components/TextInput';

describe('AppTextInput', () => {
  it('shows placeholder and emits text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <AppTextInput placeholder="Email" value="" onChangeText={onChangeText} />,
    );
    const field = getByPlaceholderText('Email');
    fireEvent.changeText(field, 'a@b.com');
    expect(onChangeText).toHaveBeenCalledWith('a@b.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- TextInput`
Expected: FAIL — cannot find module `../src/components/TextInput`.

- [ ] **Step 3: Write `TextInput.tsx`**

```tsx
import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';
import { theme } from '../theme';

export function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={theme.colors.muted}
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: theme.font.sizeSm,
    color: theme.colors.ink,
  },
});
```

- [ ] **Step 4: Write `Screen.tsx`**

```tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.white },
  body: { flex: 1, paddingHorizontal: theme.spacing(3) },
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- TextInput`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/TextInput.tsx mobile/src/components/Screen.tsx mobile/__tests__/TextInput.test.tsx
git commit -m "feat(mobile): TextInput + Screen primitives"
```

---

## Task 7: Auth store (Zustand)

**Files:**
- Create: `mobile/src/store/authStore.ts`
- Test: `mobile/__tests__/authStore.test.ts`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/authStore.test.ts`:
```ts
import { useAuthStore } from '../src/store/authStore';

describe('authStore', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('starts signed out', () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
  });

  it('stores tokens on signIn', () => {
    useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r' });
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });

  it('clears tokens on signOut', () => {
    useAuthStore.getState().signIn({ accessToken: 'a', refreshToken: 'r' });
    useAuthStore.getState().signOut();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- authStore`
Expected: FAIL — cannot find module `../src/store/authStore`.

- [ ] **Step 3: Write minimal implementation**

`mobile/src/store/authStore.ts`:
```ts
import { create } from 'zustand';

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  signIn: (tokens: Tokens) => void;
  signOut: () => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  signIn: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
  signOut: () => set({ accessToken: null, refreshToken: null }),
  clear: () => set({ accessToken: null, refreshToken: null }),
  isAuthenticated: () => get().accessToken !== null,
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- authStore`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/store/authStore.ts mobile/__tests__/authStore.test.ts
git commit -m "feat(mobile): zustand auth/session store"
```

---

## Task 8: API client + React Query client

**Files:**
- Create: `mobile/src/lib/api.ts`
- Create: `mobile/src/lib/queryClient.ts`
- Create: `mobile/.env.example`

- [ ] **Step 1: Write `.env.example`**

```
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

- [ ] **Step 2: Write the Axios instance**

`mobile/src/lib/api.ts`:
```ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

- [ ] **Step 3: Write the React Query client**

`mobile/src/lib/queryClient.ts`:
```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/lib/api.ts mobile/src/lib/queryClient.ts mobile/.env.example
git commit -m "feat(mobile): axios api client + react-query client"
```

---

## Task 9: Navigation shell + placeholder screens

**Files:**
- Create: `mobile/src/screens/auth/WelcomeScreen.tsx`
- Create: `mobile/src/screens/main/HomePlaceholderScreen.tsx`
- Create: `mobile/src/navigation/AuthStack.tsx`
- Create: `mobile/src/navigation/MainTabs.tsx`
- Create: `mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Write the Welcome placeholder screen**

`mobile/src/screens/auth/WelcomeScreen.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export function WelcomeScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(6) }}>
        HomeBase
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(3) }}>Rent · Buy · Stay</Text>
      <Button label="Continue (dev)" onPress={() => signIn({ accessToken: 'dev', refreshToken: 'dev' })} />
    </Screen>
  );
}
```

- [ ] **Step 2: Write the Home placeholder screen**

`mobile/src/screens/main/HomePlaceholderScreen.tsx`:
```tsx
import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export function HomePlaceholderScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginTop: theme.spacing(6) }}>
        Home (placeholder)
      </Text>
      <Button label="Sign out" variant="secondary" onPress={signOut} style={{ marginTop: theme.spacing(2) }} />
    </Screen>
  );
}
```

- [ ] **Step 3: Write the Auth stack**

`mobile/src/navigation/AuthStack.tsx`:
```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';

const Stack = createNativeStackNavigator();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 4: Write the Main tabs**

`mobile/src/navigation/MainTabs.tsx`:
```tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomePlaceholderScreen } from '../screens/main/HomePlaceholderScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

export function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: theme.colors.primary }}>
      <Tab.Screen name="Home" component={HomePlaceholderScreen} />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 5: Write the Root navigator**

`mobile/src/navigation/RootNavigator.tsx`:
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return (
    <NavigationContainer>{isAuthenticated ? <MainTabs /> : <AuthStack />}</NavigationContainer>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens mobile/src/navigation
git commit -m "feat(mobile): navigation shell with auth/main split + placeholders"
```

---

## Task 10: Wire providers into App.tsx

**Files:**
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Replace `App.tsx`**

```tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests PASS (smoke, theme, Button, TextInput, authStore).

- [ ] **Step 3: Manual smoke check**

Run: `npx expo start` and open in Expo Go / simulator.
Expected: Welcome screen → tap "Continue (dev)" → Home placeholder → "Sign out" returns to Welcome.

- [ ] **Step 4: Commit**

```bash
git add mobile/App.tsx && git commit -m "feat(mobile): wire providers + root navigator into App"
```

---

## Self-Review (against spec §4 Frontend, §11 Design System)

- **Expo + TypeScript app:** Task 1. ✓
- **React Navigation (stack + tabs):** Tasks 2, 9. ✓
- **React Query + Zustand:** Tasks 2, 7, 8, 10. ✓
- **Axios API client with auth header:** Task 8. ✓
- **Teal design system tokens + primitives:** Tasks 4, 5, 6. ✓
- **Test harness (jest-expo + RNTL):** Tasks 3, 5, 6, 7. ✓
- **Deferred (correct for later phases):** maps (Phase 2), Paystack RN (Phase 4), expo-notifications (Phase 7), secure token persistence via expo-secure-store (Phase 1 with real auth), real auth/onboarding screens (Phase 1).

**Type consistency:** `theme`, `Button`, `AppTextInput`, `Screen`, `useAuthStore` (with `signIn`/`signOut`/`isAuthenticated`/`clear`), `api`, `queryClient`, `RootNavigator`/`AuthStack`/`MainTabs` are defined once and referenced consistently. The dev-only `signIn({accessToken,refreshToken})` shape matches the store's `Tokens` type.

**No placeholders:** every code step contains complete, runnable code. (The "placeholder screens" are intentional, fully-implemented stand-ins replaced by real screens in Phase 1+.)
