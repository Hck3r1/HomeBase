# Phase 1 — Auth & Accounts (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the onboarding & authentication experience — splash, walkthrough, sign up, log in, forgot/reset password, role select — wired to the Phase 1 backend, with secure token persistence and React Query auth hooks, all in the teal design system.

**Architecture:** A `secureStorage` wrapper persists tokens with expo-secure-store; the Zustand `useAuthStore` rehydrates on launch. React Query mutation hooks (`useRegister`, `useLogin`, etc.) call the Axios `api` and push tokens into the store. Screens live in `src/screens/auth/` and are composed in `AuthStack`. Shared form pieces (`InputGroup`, `SocialButtons`) are reusable primitives.

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, React Query, Zustand, Axios, expo-secure-store, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phase 0 frontend foundation is complete (theme, `Button`, `AppTextInput`, `Screen`, `useAuthStore`, `api`, `queryClient`, navigation shell).

> All paths relative to `mobile/`.

---

## File Structure (created/modified this phase)

```
mobile/
└── src/
    ├── lib/secureStorage.ts            # expo-secure-store wrapper
    ├── store/authStore.ts              # MODIFY: persist + hydrate + user
    ├── api/auth.ts                     # auth endpoint hooks (react-query)
    ├── components/InputGroup.tsx       # grouped bordered input card
    ├── components/SocialButtons.tsx
    ├── screens/auth/SplashScreen.tsx
    ├── screens/auth/WalkthroughScreen.tsx
    ├── screens/auth/SignUpScreen.tsx
    ├── screens/auth/LogInScreen.tsx
    ├── screens/auth/ForgotPasswordScreen.tsx
    ├── screens/auth/ResetPasswordScreen.tsx
    ├── screens/auth/RoleSelectScreen.tsx
    └── navigation/AuthStack.tsx        # MODIFY: register all auth screens
__tests__/
    ├── authStore.persist.test.ts
    ├── useLogin.test.tsx
    ├── SignUpScreen.test.tsx
    └── RoleSelectScreen.test.tsx
```

---

## Task 1: Secure token storage + store hydration

**Files:**
- Create: `mobile/src/lib/secureStorage.ts`
- Modify: `mobile/src/store/authStore.ts`
- Test: `mobile/__tests__/authStore.persist.test.ts`

- [ ] **Step 1: Install expo-secure-store**

Run: `cd ~/Projects/HomeBase/mobile && npx expo install expo-secure-store`

- [ ] **Step 2: Write the failing test (mock secure-store)**

`mobile/__tests__/authStore.persist.test.ts`:
```ts
const store: Record<string, string> = {};
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => void (store[k] = v)),
  getItemAsync: jest.fn(async (k: string) => store[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => void delete store[k]),
}));

import { useAuthStore } from '../src/store/authStore';

describe('authStore persistence', () => {
  beforeEach(async () => {
    await useAuthStore.getState().signOut();
  });

  it('persists tokens on signIn and hydrates them', async () => {
    await useAuthStore.getState().signIn({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: '1', name: 'A', email: 'a@x.com', role: 'seeker', listerType: null },
    });
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    await useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().accessToken).toBe('a');
    expect(useAuthStore.getState().user?.email).toBe('a@x.com');
  });
});
```

- [ ] **Step 3: Run test (fails)** → `npm test -- authStore.persist` → FAIL.

- [ ] **Step 4: Implement `secureStorage.ts`**

```ts
import * as SecureStore from 'expo-secure-store';

export const secureStorage = {
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  get: (key: string) => SecureStore.getItemAsync(key),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};
```

- [ ] **Step 5: Replace `authStore.ts`**

```ts
import { create } from 'zustand';
import { secureStorage } from '../lib/secureStorage';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'seeker' | 'lister';
  listerType: 'agent' | 'landlord' | null;
}

interface SignInPayload {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  signIn: (p: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: AuthUser) => void;
  hydrate: () => Promise<void>;
  isAuthenticated: () => boolean;
}

const KEYS = { access: 'hb_access', refresh: 'hb_refresh', user: 'hb_user' };

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  hydrated: false,
  signIn: async ({ accessToken, refreshToken, user }) => {
    set({ accessToken, refreshToken, user });
    await secureStorage.set(KEYS.access, accessToken);
    await secureStorage.set(KEYS.refresh, refreshToken);
    await secureStorage.set(KEYS.user, JSON.stringify(user));
  },
  signOut: async () => {
    set({ accessToken: null, refreshToken: null, user: null });
    await secureStorage.remove(KEYS.access);
    await secureStorage.remove(KEYS.refresh);
    await secureStorage.remove(KEYS.user);
  },
  setUser: (user) => {
    set({ user });
    void secureStorage.set(KEYS.user, JSON.stringify(user));
  },
  hydrate: async () => {
    const [accessToken, refreshToken, rawUser] = await Promise.all([
      secureStorage.get(KEYS.access),
      secureStorage.get(KEYS.refresh),
      secureStorage.get(KEYS.user),
    ]);
    set({
      accessToken,
      refreshToken,
      user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null,
      hydrated: true,
    });
  },
  isAuthenticated: () => get().accessToken !== null,
}));
```

- [ ] **Step 6: Run test (passes)** → `npm test -- authStore.persist` → PASS.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/lib/secureStorage.ts mobile/src/store/authStore.ts mobile/__tests__/authStore.persist.test.ts
git commit -m "feat(mobile): secure token persistence + store hydration"
```

---

## Task 2: Auth API hooks

**Files:**
- Create: `mobile/src/api/auth.ts`
- Test: `mobile/__tests__/useLogin.test.tsx`

- [ ] **Step 1: Write the failing test (mock api)**

`mobile/__tests__/useLogin.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin } from '../src/api/auth';
import { api } from '../src/lib/api';
import { useAuthStore } from '../src/store/authStore';

jest.spyOn(api, 'post').mockResolvedValue({
  data: { accessToken: 'a', refreshToken: 'r', user: { id: '1', name: 'A', email: 'a@x.com', role: 'seeker', listerType: null } },
} as any);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useLogin', () => {
  it('signs the user in on success', async () => {
    const { result } = renderHook(() => useLogin(), { wrapper });
    result.current.mutate({ email: 'a@x.com', password: 'password1' });
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('a'));
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npm test -- useLogin` → FAIL.

- [ ] **Step 3: Implement `src/api/auth.ts`**

```ts
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore, AuthUser } from '../store/authStore';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function useRegister() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string }) =>
      (await api.post<AuthResponse>('/auth/register', input)).data,
    onSuccess: (data) => signIn(data),
  });
}

export function useLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) =>
      (await api.post<AuthResponse>('/auth/login', input)).data,
    onSuccess: (data) => signIn(data),
  });
}

export function useSocialLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  return useMutation({
    mutationFn: async (input: { provider: 'google' | 'facebook' | 'x'; token: string }) =>
      (await api.post<AuthResponse>('/auth/social', input)).data,
    onSuccess: (data) => signIn(data),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: { email: string }) => (await api.post('/auth/forgot-password', input)).data,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; password: string }) =>
      (await api.post('/auth/reset-password', input)).data,
  });
}
```

- [ ] **Step 4: Run test (passes)** → `npm test -- useLogin` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/api/auth.ts mobile/__tests__/useLogin.test.tsx
git commit -m "feat(mobile): react-query auth hooks"
```

---

## Task 3: InputGroup + SocialButtons primitives

**Files:**
- Create: `mobile/src/components/InputGroup.tsx`
- Create: `mobile/src/components/SocialButtons.tsx`
- Test: `mobile/__tests__/InputGroup.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { InputGroup } from '../src/components/InputGroup';
import { AppTextInput } from '../src/components/TextInput';

describe('InputGroup', () => {
  it('renders its children', () => {
    const { getByPlaceholderText } = render(
      <InputGroup>
        <AppTextInput placeholder="Email" />
      </InputGroup>,
    );
    expect(getByPlaceholderText('Email')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `InputGroup.tsx`**

```tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function InputGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={styles.group}>
      {items.map((child, i) => (
        <View key={i} style={[styles.row, i < items.length - 1 && styles.divider]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, overflow: 'hidden' },
  row: {},
  divider: { borderBottomWidth: 1, borderBottomColor: theme.colors.line },
});
```

- [ ] **Step 4: Implement `SocialButtons.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
  onProvider: (p: 'google' | 'facebook' | 'x') => void;
}

const PROVIDERS: { id: 'google' | 'facebook' | 'x'; label: string }[] = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'facebook', label: 'Continue with Facebook' },
  { id: 'x', label: 'Continue with X' },
];

export function SocialButtons({ onProvider }: Props) {
  return (
    <View>
      {PROVIDERS.map((p) => (
        <Pressable key={p.id} style={styles.btn} onPress={() => onProvider(p.id)}>
          <Text style={styles.label}>{p.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.pill,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 11,
  },
  label: { color: theme.colors.ink, fontWeight: theme.font.weightSemibold, fontSize: theme.font.sizeSm },
});
```

- [ ] **Step 5: Run test (passes)** → `npm test -- InputGroup` → PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/InputGroup.tsx mobile/src/components/SocialButtons.tsx mobile/__tests__/InputGroup.test.tsx
git commit -m "feat(mobile): InputGroup + SocialButtons primitives"
```

---

## Task 4: Splash + Walkthrough screens

**Files:**
- Create: `mobile/src/screens/auth/SplashScreen.tsx`
- Create: `mobile/src/screens/auth/WalkthroughScreen.tsx`

- [ ] **Step 1: Implement `SplashScreen.tsx`**

```tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { useAuthStore } from '../../store/authStore';

export function SplashScreen({ navigation }: any) {
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthed = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => navigation.replace(isAuthed ? 'Main' : 'Walkthrough'), 600);
    return () => clearTimeout(t);
  }, [hydrated, isAuthed, navigation]);

  return (
    <View style={styles.root}>
      <Text style={styles.name}>HomeBase</Text>
      <Text style={styles.tag}>Rent · Buy · Stay</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  name: { color: theme.colors.white, fontSize: 28, fontWeight: theme.font.weightBold },
  tag: { color: theme.colors.white, opacity: 0.85, marginTop: 6 },
});
```

- [ ] **Step 2: Implement `WalkthroughScreen.tsx`**

```tsx
import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';

export function WalkthroughScreen({ navigation }: any) {
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(8) }}>
        Find your next home
      </Text>
      <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1), marginBottom: theme.spacing(4) }}>
        Rent long-term, buy a property, or book a short stay — all in one place.
      </Text>
      <Button label="Get started" onPress={() => navigation.navigate('SignUp')} />
      <Button label="I already have an account" variant="secondary" style={{ marginTop: theme.spacing(2) }} onPress={() => navigation.navigate('LogIn')} />
    </Screen>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/auth/SplashScreen.tsx mobile/src/screens/auth/WalkthroughScreen.tsx
git commit -m "feat(mobile): splash + walkthrough screens"
```

---

## Task 5: Sign Up screen

**Files:**
- Create: `mobile/src/screens/auth/SignUpScreen.tsx`
- Test: `mobile/__tests__/SignUpScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignUpScreen } from '../src/screens/auth/SignUpScreen';
import { api } from '../src/lib/api';

jest.spyOn(api, 'post').mockResolvedValue({
  data: { accessToken: 'a', refreshToken: 'r', user: { id: '1', name: 'A', email: 'a@x.com', role: 'seeker', listerType: null } },
} as any);

function renderScreen() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <SignUpScreen navigation={{ navigate: jest.fn(), replace: jest.fn() }} />
    </QueryClientProvider>,
  );
}

describe('SignUpScreen', () => {
  it('shows a validation error for short password', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Full name'), 'Moyo');
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@x.com');
    fireEvent.changeText(getByPlaceholderText('Password'), '123');
    fireEvent.press(getByText('Sign up'));
    await waitFor(() => expect(getByText('Password must be at least 8 characters')).toBeTruthy());
  });

  it('submits when valid', async () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Full name'), 'Moyo');
    fireEvent.changeText(getByPlaceholderText('Email'), 'a@x.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password1');
    fireEvent.press(getByText('Sign up'));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ email: 'a@x.com' })));
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `SignUpScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { SocialButtons } from '../../components/SocialButtons';
import { theme } from '../../theme';
import { useRegister, useSocialLogin } from '../../api/auth';

export function SignUpScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();
  const social = useSocialLogin();

  function submit() {
    setError(null);
    if (name.trim().length < 2) return setError('Enter your full name');
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    register.mutate({ name, email, password });
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Create an account
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>
        Already have an account?{' '}
        <Text style={{ color: theme.colors.primary, fontWeight: theme.font.weightBold }} onPress={() => navigation.navigate('LogIn')}>
          Log in
        </Text>
      </Text>
      <InputGroup>
        <AppTextInput placeholder="Full name" value={name} onChangeText={setName} />
        <AppTextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AppTextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      </InputGroup>
      {error && <Text style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>{error}</Text>}
      <Button label="Sign up" onPress={submit} style={{ marginTop: theme.spacing(2) }} disabled={register.isPending} />
      <View style={{ marginVertical: theme.spacing(2) }}>
        <Text style={{ textAlign: 'center', color: theme.colors.muted }}>Or</Text>
      </View>
      <SocialButtons onProvider={(provider) => social.mutate({ provider, token: 'TODO_NATIVE_TOKEN' })} />
    </Screen>
  );
}
```

> Note: the social `token` placeholder is wired to the native provider SDK token in a later integration task; the call path and endpoint are correct now.

- [ ] **Step 4: Run test (passes)** → `npm test -- SignUpScreen` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/auth/SignUpScreen.tsx mobile/__tests__/SignUpScreen.test.tsx
git commit -m "feat(mobile): sign up screen with validation"
```

---

## Task 6: Log In + Forgot + Reset screens

**Files:**
- Create: `mobile/src/screens/auth/LogInScreen.tsx`
- Create: `mobile/src/screens/auth/ForgotPasswordScreen.tsx`
- Create: `mobile/src/screens/auth/ResetPasswordScreen.tsx`

- [ ] **Step 1: Implement `LogInScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useLogin } from '../../api/auth';

export function LogInScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useLogin();

  function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email');
    if (!password) return setError('Enter your password');
    login.mutate({ email, password }, { onError: () => setError('Invalid email or password') });
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Welcome back
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>Log in to continue</Text>
      <InputGroup>
        <AppTextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AppTextInput placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      </InputGroup>
      {error && <Text style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>{error}</Text>}
      <Text
        style={{ color: theme.colors.primary, marginTop: theme.spacing(1), fontWeight: theme.font.weightSemibold }}
        onPress={() => navigation.navigate('ForgotPassword')}
      >
        Forgot password?
      </Text>
      <Button label="Log in" onPress={submit} style={{ marginTop: theme.spacing(2) }} disabled={login.isPending} />
    </Screen>
  );
}
```

- [ ] **Step 2: Implement `ForgotPasswordScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useForgotPassword } from '../../api/auth';

export function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const forgot = useForgotPassword();

  function submit() {
    forgot.mutate({ email }, { onSuccess: () => setSent(true) });
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Reset password
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>
        {sent ? 'If that email exists, a reset link is on its way.' : 'Enter your email to receive a reset link.'}
      </Text>
      {!sent && (
        <>
          <InputGroup>
            <AppTextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          </InputGroup>
          <Button label="Send reset link" onPress={submit} style={{ marginTop: theme.spacing(2) }} disabled={forgot.isPending} />
        </>
      )}
      {sent && <Button label="Enter reset code" onPress={() => navigation.navigate('ResetPassword')} style={{ marginTop: theme.spacing(2) }} />}
    </Screen>
  );
}
```

- [ ] **Step 3: Implement `ResetPasswordScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useResetPassword } from '../../api/auth';

export function ResetPasswordScreen({ navigation }: any) {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const reset = useResetPassword();

  function submit() {
    setError(null);
    if (password.length < 8) return setError('Password must be at least 8 characters');
    reset.mutate(
      { token, password },
      { onSuccess: () => navigation.navigate('LogIn'), onError: () => setError('Invalid or expired code') },
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Set a new password
      </Text>
      <InputGroup>
        <AppTextInput placeholder="Reset code" value={token} onChangeText={setToken} autoCapitalize="none" />
        <AppTextInput placeholder="New password" secureTextEntry value={password} onChangeText={setPassword} />
      </InputGroup>
      {error && <Text style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>{error}</Text>}
      <Button label="Update password" onPress={submit} style={{ marginTop: theme.spacing(2) }} disabled={reset.isPending} />
    </Screen>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/auth/LogInScreen.tsx mobile/src/screens/auth/ForgotPasswordScreen.tsx mobile/src/screens/auth/ResetPasswordScreen.tsx
git commit -m "feat(mobile): login, forgot, reset screens"
```

---

## Task 7: Role select screen

**Files:**
- Create: `mobile/src/screens/auth/RoleSelectScreen.tsx`
- Test: `mobile/__tests__/RoleSelectScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleSelectScreen } from '../src/screens/auth/RoleSelectScreen';
import { api } from '../src/lib/api';

jest.spyOn(api, 'patch').mockResolvedValue({
  data: { id: '1', name: 'A', email: 'a@x.com', role: 'lister', listerType: 'agent' },
} as any);

function renderScreen(navigation: any) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <RoleSelectScreen navigation={navigation} />
    </QueryClientProvider>,
  );
}

describe('RoleSelectScreen', () => {
  it('upgrades to agent lister', async () => {
    const navigation = { replace: jest.fn() };
    const { getByText } = renderScreen(navigation);
    fireEvent.press(getByText('List properties'));
    fireEvent.press(getByText('Agent'));
    fireEvent.press(getByText('Continue'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/me/role', { role: 'lister', listerType: 'agent' }));
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `RoleSelectScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { api } from '../../lib/api';
import { useAuthStore, AuthUser } from '../../store/authStore';

export function RoleSelectScreen({ navigation }: any) {
  const setUser = useAuthStore((s) => s.setUser);
  const [role, setRole] = useState<'seeker' | 'lister'>('seeker');
  const [listerType, setListerType] = useState<'agent' | 'landlord'>('agent');

  const mutation = useMutation({
    mutationFn: async () =>
      (await api.patch<AuthUser>('/me/role', role === 'lister' ? { role, listerType } : { role })).data,
    onSuccess: (user) => {
      setUser(user);
      navigation.replace('Main');
    },
  });

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        How will you use HomeBase?
      </Text>
      <Option label="Find a place" active={role === 'seeker'} onPress={() => setRole('seeker')} />
      <Option label="List properties" active={role === 'lister'} onPress={() => setRole('lister')} />
      {role === 'lister' && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: theme.spacing(1) }}>
          <Chip label="Agent" active={listerType === 'agent'} onPress={() => setListerType('agent')} />
          <Chip label="Landlord" active={listerType === 'landlord'} onPress={() => setListerType('landlord')} />
        </View>
      )}
      <Button label="Continue" onPress={() => mutation.mutate()} style={{ marginTop: theme.spacing(3) }} disabled={mutation.isPending} />
    </Screen>
  );
}

function Option({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.option, active && styles.optionActive]}>
      <Text style={[styles.optionLabel, active && { color: theme.colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={{ color: active ? theme.colors.white : theme.colors.muted, fontWeight: theme.font.weightSemibold }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  optionActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.chip },
  optionLabel: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: theme.radii.pill, backgroundColor: theme.colors.card },
  chipActive: { backgroundColor: theme.colors.primary },
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- RoleSelectScreen` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/auth/RoleSelectScreen.tsx mobile/__tests__/RoleSelectScreen.test.tsx
git commit -m "feat(mobile): role select screen"
```

---

## Task 8: Wire AuthStack + hydrate on launch

**Files:**
- Modify: `mobile/src/navigation/AuthStack.tsx`
- Modify: `mobile/src/navigation/RootNavigator.tsx`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Replace `AuthStack.tsx`**

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { WalkthroughScreen } from '../screens/auth/WalkthroughScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { LogInScreen } from '../screens/auth/LogInScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';

const Stack = createNativeStackNavigator();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Walkthrough" component={WalkthroughScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="LogIn" component={LogInScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Hydrate on launch in `App.tsx`**

Add inside `App`, before returning, using `useEffect`:
```tsx
import { useEffect } from 'react';
import { useAuthStore } from './src/store/authStore';
// ...
export default function App() {
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);
  // ...existing provider tree...
}
```

- [ ] **Step 3: Run full suite + manual check**

Run: `npm test` → all PASS.
Run: `npx expo start` → Splash → Walkthrough → Sign up creates an account (against a running backend) → lands in Main tabs.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/navigation/AuthStack.tsx mobile/src/navigation/RootNavigator.tsx mobile/App.tsx
git commit -m "feat(mobile): wire auth stack + hydrate session on launch"
```

---

## Self-Review (against spec §5.1, §11 Design System, screens 1–6)

- **Splash, Walkthrough, Sign up, Log in, Forgot, Reset, Role select:** Tasks 4–8 (screens 1–6 of the inventory). ✓
- **Secure token persistence + hydrate:** Task 1. ✓
- **Auth API hooks (register/login/social/forgot/reset):** Task 2. ✓
- **Social login buttons + handler:** Task 3 + wired in Sign up (Task 5). Native provider token retrieval is a clearly-scoped follow-up integration. 
- **Teal design system (pill buttons, grouped inputs, segmented selectors):** `Button`, `InputGroup`, `SocialButtons`, role chips. ✓
- **Tests (store, hook, screens):** Tasks 1,2,5,7. ✓

**Type consistency:** `useAuthStore.signIn({accessToken,refreshToken,user})` matches the `AuthResponse`/`SignInPayload` shape used by the hooks and tests; `AuthUser` is the single user type across store, hooks, and screens; `/me/role` payload `{role, listerType}` matches the backend Task 12 contract.

**No placeholders:** every code step is complete and runnable. The single annotated `TODO_NATIVE_TOKEN` is the provider SDK token slot for the deferred native social-SDK integration; the API path and flow are fully implemented.
