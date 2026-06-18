# Phase 6 — KYC (Dojah) & Payouts (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lister trust & money screens — **KYC verification** (BVN/NIN entry + document/photo upload, with pending/verified/rejected states), **payout/bank setup** (bank select + account number → resolve account name → save), and **earnings/payouts** (balance, escrow held vs. released, payout history) — wired to the Phase 6 backend in the teal design system.

**Architecture:** React Query hooks live in `src/api/kyc.ts` (`useKycStatus`, `useStartKyc`) and `src/api/payouts.ts` (`usePayoutAccount`, `useCreatePayoutAccount`, `usePayouts`, `useBanks`, `useResolveAccount`) calling the Axios `api`. Reusable primitives `StatusBadge` (KYC state pill) and `DocumentUpload` (expo-image-picker) are added. Screens live in `src/screens/account/` and compose existing primitives (`Screen`, `Button`, `InputGroup`, `AppTextInput`) on the teal theme. Money from the API is integer **kobo**; a small `formatNaira` helper renders ₦ amounts.

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, React Query, Axios, expo-image-picker, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–5 frontend complete (theme, `Screen`, `Button`, `InputGroup`, `AppTextInput`, `api`, `queryClient`, `useAuthStore`, navigation shell). Assumes the Phase 6 backend endpoints (`/kyc`, `/kyc/status`, `/payout-account`, `/payout-account/banks`, `/payout-account/resolve`, `/payouts`) are available.

> All paths relative to `mobile/`.

---

## File Structure (created/modified this phase)

```
mobile/
└── src/
    ├── lib/format.ts                       # formatNaira (kobo → ₦)
    ├── api/kyc.ts                          # useKycStatus, useStartKyc
    ├── api/payouts.ts                      # account + banks + resolve + earnings hooks
    ├── components/StatusBadge.tsx          # pending/verified/rejected pill
    ├── components/DocumentUpload.tsx       # expo-image-picker upload tile
    ├── screens/account/KycVerificationScreen.tsx
    ├── screens/account/PayoutSetupScreen.tsx
    ├── screens/account/EarningsScreen.tsx
    └── navigation/AccountStack.tsx         # MODIFY: register the 3 screens
__tests__/
    ├── useKyc.test.tsx
    ├── KycVerificationScreen.test.tsx
    └── PayoutSetupScreen.test.tsx
```

---

## Task 1: Money formatter + KYC/payout API hooks

**Files:**
- Create: `mobile/src/lib/format.ts`
- Create: `mobile/src/api/kyc.ts`
- Create: `mobile/src/api/payouts.ts`
- Test: `mobile/__tests__/useKyc.test.tsx`

- [ ] **Step 1: Write the failing test (mock api)**

`mobile/__tests__/useKyc.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKycStatus, useStartKyc } from '../src/api/kyc';
import { api } from '../src/lib/api';

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('kyc hooks', () => {
  it('reads the current KYC status', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: { status: 'verified', verifiedAt: '2026-06-19T00:00:00Z' } } as any);
    const { result } = renderHook(() => useKycStatus(), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe('verified'));
  });

  it('starts a KYC verification', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ data: { status: 'pending' } } as any);
    const { result } = renderHook(() => useStartKyc(), { wrapper });
    result.current.mutate({ idType: 'bvn', idNumber: '22222222222' });
    await waitFor(() => expect(post).toHaveBeenCalledWith('/kyc', { idType: 'bvn', idNumber: '22222222222' }));
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npm test -- useKyc` → FAIL.

- [ ] **Step 3: Implement `src/lib/format.ts`**

```ts
export function formatNaira(kobo: number): string {
  const naira = (kobo ?? 0) / 100;
  return `₦${naira.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
```

- [ ] **Step 4: Implement `src/api/kyc.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';

export interface KycStatusResponse {
  status: KycStatus;
  idType: 'bvn' | 'nin' | null;
  reference: string | null;
  verifiedAt: string | null;
}

export function useKycStatus() {
  return useQuery({
    queryKey: ['kyc-status'],
    queryFn: async () => (await api.get<KycStatusResponse>('/kyc/status')).data,
  });
}

export function useStartKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { idType: 'bvn' | 'nin'; idNumber: string }) =>
      (await api.post<{ status: KycStatus }>('/kyc', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-status'] }),
  });
}
```

- [ ] **Step 5: Implement `src/api/payouts.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface PayoutAccount {
  id: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  paystackRecipientCode: string;
  isDefault: boolean;
}

export interface Bank {
  name: string;
  code: string;
}

export interface ResolvedAccount {
  accountNumber: string;
  accountName: string;
}

export interface Payout {
  id: string;
  amount: number;
  paystackTransferCode: string | null;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface Earnings {
  summary: { escrowHeld: number; released: number; paidOut: number; available: number };
  payouts: Payout[];
}

export function usePayoutAccount() {
  return useQuery({
    queryKey: ['payout-account'],
    queryFn: async () => {
      try {
        return (await api.get<PayoutAccount>('/payout-account')).data;
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
  });
}

export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: async () => (await api.get<Bank[]>('/payout-account/banks')).data,
    staleTime: 1000 * 60 * 60,
  });
}

export function useResolveAccount() {
  return useMutation({
    mutationFn: async (input: { bankCode: string; accountNumber: string }) =>
      (
        await api.get<ResolvedAccount>('/payout-account/resolve', {
          params: { bankCode: input.bankCode, accountNumber: input.accountNumber },
        })
      ).data,
  });
}

export function useCreatePayoutAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bankCode: string; accountNumber: string; accountName: string }) =>
      (await api.post<PayoutAccount>('/payout-account', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payout-account'] }),
  });
}

export function usePayouts() {
  return useQuery({
    queryKey: ['payouts'],
    queryFn: async () => (await api.get<Earnings>('/payouts')).data,
  });
}
```

- [ ] **Step 6: Run test (passes)** → `npm test -- useKyc` → PASS.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/lib/format.ts mobile/src/api/kyc.ts mobile/src/api/payouts.ts mobile/__tests__/useKyc.test.tsx
git commit -m "feat(mobile): kyc + payouts react-query hooks"
```

---

## Task 2: StatusBadge + DocumentUpload primitives

**Files:**
- Create: `mobile/src/components/StatusBadge.tsx`
- Create: `mobile/src/components/DocumentUpload.tsx`
- Test: `mobile/__tests__/StatusBadge.test.tsx`

- [ ] **Step 1: Install expo-image-picker**

Run: `cd ~/Projects/HomeBase/mobile && npx expo install expo-image-picker`

- [ ] **Step 2: Write the failing test**

`mobile/__tests__/StatusBadge.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../src/components/StatusBadge';

describe('StatusBadge', () => {
  it('renders the label for each status', () => {
    expect(render(<StatusBadge status="pending" />).getByText('Pending review')).toBeTruthy();
    expect(render(<StatusBadge status="verified" />).getByText('Verified')).toBeTruthy();
    expect(render(<StatusBadge status="rejected" />).getByText('Rejected')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test (fails)** → FAIL.

- [ ] **Step 4: Implement `StatusBadge.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

type Status = 'none' | 'pending' | 'verified' | 'rejected';

const MAP: Record<Status, { label: string; bg: string; fg: string }> = {
  none: { label: 'Not started', bg: theme.colors.card, fg: theme.colors.muted },
  pending: { label: 'Pending review', bg: '#FBF3E0', fg: '#9A6B00' },
  verified: { label: 'Verified', bg: theme.colors.chip, fg: theme.colors.primary },
  rejected: { label: 'Rejected', bg: '#FBE6E6', fg: theme.colors.danger },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = MAP[status] ?? MAP.none;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.label, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radii.pill },
  label: { fontSize: theme.font.sizeSm, fontWeight: theme.font.weightSemibold },
});
```

- [ ] **Step 5: Implement `DocumentUpload.tsx`**

```tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../theme';

interface Props {
  label: string;
  value: string | null;
  onChange: (uri: string | null) => void;
}

export function DocumentUpload({ label, value, onChange }: Props) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      onChange(result.assets[0].uri);
    }
  }

  return (
    <Pressable style={styles.tile} onPress={pick} accessibilityRole="button" accessibilityLabel={label}>
      {value ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.plus}>＋</Text>
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.line,
    borderRadius: theme.radii.md,
    height: 140,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  plus: { fontSize: 28, color: theme.colors.primary, marginBottom: 4 },
  label: { color: theme.colors.muted, fontSize: theme.font.sizeSm },
  preview: { width: '100%', height: '100%' },
});
```

- [ ] **Step 6: Run test (passes)** → `npm test -- StatusBadge` → PASS.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/StatusBadge.tsx mobile/src/components/DocumentUpload.tsx mobile/__tests__/StatusBadge.test.tsx mobile/package.json
git commit -m "feat(mobile): StatusBadge + DocumentUpload primitives"
```

---

## Task 3: KYC verification screen

**Files:**
- Create: `mobile/src/screens/account/KycVerificationScreen.tsx`
- Test: `mobile/__tests__/KycVerificationScreen.test.tsx`

- [ ] **Step 1: Write the failing test (render per status)**

`mobile/__tests__/KycVerificationScreen.test.tsx`:
```tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KycVerificationScreen } from '../src/screens/account/KycVerificationScreen';
import { api } from '../src/lib/api';

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <KycVerificationScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />
    </QueryClientProvider>,
  );
}

describe('KycVerificationScreen', () => {
  it('shows the entry form when not started', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: { status: 'none' } } as any);
    const { getByText, getByPlaceholderText } = renderScreen();
    await waitFor(() => expect(getByPlaceholderText('BVN / ID number')).toBeTruthy());
    expect(getByText('Verify identity')).toBeTruthy();
  });

  it('shows the pending state', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: { status: 'pending' } } as any);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Pending review')).toBeTruthy());
  });

  it('shows the verified state', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: { status: 'verified', verifiedAt: '2026-06-19T00:00:00Z' } } as any);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Verified')).toBeTruthy());
  });

  it('shows a retry action when rejected', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({ data: { status: 'rejected' } } as any);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Rejected')).toBeTruthy());
    expect(getByText('Try again')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `KycVerificationScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { DocumentUpload } from '../../components/DocumentUpload';
import { theme } from '../../theme';
import { useKycStatus, useStartKyc } from '../../api/kyc';

export function KycVerificationScreen({ navigation }: any) {
  const { data, isLoading } = useKycStatus();
  const start = useStartKyc();

  const [idType, setIdType] = useState<'bvn' | 'nin'>('bvn');
  const [idNumber, setIdNumber] = useState('');
  const [document, setDocument] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  function submit() {
    setError(null);
    if (!/^\d{8,15}$/.test(idNumber)) return setError('Enter a valid BVN/ID number');
    start.mutate(
      { idType, idNumber },
      { onSuccess: () => setRetrying(false), onError: () => setError('Verification failed. Check the number and try again.') },
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(6) }} />
      </Screen>
    );
  }

  const status = data?.status ?? 'none';
  const showForm = status === 'none' || (status === 'rejected' && retrying);

  return (
    <Screen>
      <Text style={styles.title}>Identity verification</Text>
      <Text style={styles.subtitle}>Verify your identity with Dojah to receive payouts.</Text>

      {status !== 'none' && (
        <View style={styles.statusRow}>
          <StatusBadge status={status} />
        </View>
      )}

      {status === 'verified' && (
        <Text style={styles.body}>You're verified. You can now set up payouts and receive transfers.</Text>
      )}

      {status === 'pending' && (
        <Text style={styles.body}>We're reviewing your details. This usually takes a few minutes.</Text>
      )}

      {status === 'rejected' && !retrying && (
        <>
          <Text style={styles.body}>Your verification was rejected. Please re-check your details and try again.</Text>
          <Button label="Try again" onPress={() => setRetrying(true)} style={{ marginTop: theme.spacing(2) }} />
        </>
      )}

      {showForm && (
        <>
          <View style={styles.segment}>
            <Segment label="BVN" active={idType === 'bvn'} onPress={() => setIdType('bvn')} />
            <Segment label="NIN" active={idType === 'nin'} onPress={() => setIdType('nin')} />
          </View>
          <InputGroup>
            <AppTextInput
              placeholder="BVN / ID number"
              keyboardType="number-pad"
              value={idNumber}
              onChangeText={setIdNumber}
            />
          </InputGroup>
          <Text style={styles.uploadLabel}>Upload a photo of your ID document</Text>
          <DocumentUpload label="Add ID document" value={document} onChange={setDocument} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button
            label="Verify identity"
            onPress={submit}
            style={{ marginTop: theme.spacing(2) }}
            disabled={start.isPending}
          />
        </>
      )}
    </Screen>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Text
      onPress={onPress}
      style={[styles.segmentItem, active && styles.segmentItemActive]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) },
  subtitle: { color: theme.colors.muted, marginTop: theme.spacing(1), marginBottom: theme.spacing(2) },
  statusRow: { marginBottom: theme.spacing(2) },
  body: { color: theme.colors.ink, marginTop: theme.spacing(1) },
  segment: { flexDirection: 'row', gap: 8, marginBottom: theme.spacing(2) },
  segmentItem: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.card,
    color: theme.colors.muted,
    fontWeight: theme.font.weightSemibold,
    overflow: 'hidden',
  },
  segmentItemActive: { backgroundColor: theme.colors.primary, color: theme.colors.white },
  uploadLabel: { color: theme.colors.muted, marginTop: theme.spacing(2), marginBottom: theme.spacing(1) },
  error: { color: theme.colors.danger, marginTop: theme.spacing(1) },
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- KycVerificationScreen` → PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/account/KycVerificationScreen.tsx mobile/__tests__/KycVerificationScreen.test.tsx
git commit -m "feat(mobile): kyc verification screen with status states"
```

---

## Task 4: Payout / bank setup screen

**Files:**
- Create: `mobile/src/screens/account/PayoutSetupScreen.tsx`
- Test: `mobile/__tests__/PayoutSetupScreen.test.tsx`

- [ ] **Step 1: Write the failing test (form validation + resolve)**

`mobile/__tests__/PayoutSetupScreen.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PayoutSetupScreen } from '../src/screens/account/PayoutSetupScreen';
import { api } from '../src/lib/api';

function renderScreen(navigation: any) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PayoutSetupScreen navigation={navigation} />
    </QueryClientProvider>,
  );
}

describe('PayoutSetupScreen', () => {
  beforeEach(() => {
    jest.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/payout-account/banks') return { data: [{ name: 'GTBank', code: '058' }] } as any;
      if (url === '/payout-account') return Promise.reject({ response: { status: 404 } });
      if (url === '/payout-account/resolve') return { data: { accountNumber: '0123456789', accountName: 'MOYO ADE' } } as any;
      return { data: {} } as any;
    });
  });

  it('shows a validation error for a short account number', async () => {
    const { getByPlaceholderText, getByText } = renderScreen({ goBack: jest.fn() });
    await waitFor(() => expect(getByText('GTBank')).toBeTruthy());
    fireEvent.press(getByText('GTBank'));
    fireEvent.changeText(getByPlaceholderText('Account number'), '123');
    fireEvent.press(getByText('Save payout account'));
    await waitFor(() => expect(getByText('Account number must be 10 digits')).toBeTruthy());
  });

  it('resolves the account name and saves', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ data: { id: '1', accountName: 'MOYO ADE' } } as any);
    const navigation = { goBack: jest.fn() };
    const { getByPlaceholderText, getByText } = renderScreen(navigation);
    await waitFor(() => expect(getByText('GTBank')).toBeTruthy());
    fireEvent.press(getByText('GTBank'));
    fireEvent.changeText(getByPlaceholderText('Account number'), '0123456789');
    await waitFor(() => expect(getByText('MOYO ADE')).toBeTruthy());
    fireEvent.press(getByText('Save payout account'));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/payout-account', expect.objectContaining({ accountName: 'MOYO ADE', bankCode: '058' })),
    );
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `PayoutSetupScreen.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useBanks, useResolveAccount, useCreatePayoutAccount, Bank } from '../../api/payouts';

export function PayoutSetupScreen({ navigation }: any) {
  const { data: banks } = useBanks();
  const resolve = useResolveAccount();
  const create = useCreatePayoutAccount();

  const [bank, setBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAccountName(null);
    if (bank && /^\d{10}$/.test(accountNumber)) {
      resolve.mutate(
        { bankCode: bank.code, accountNumber },
        { onSuccess: (r) => setAccountName(r.accountName), onError: () => setError('Could not resolve account') },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank, accountNumber]);

  function submit() {
    setError(null);
    if (!bank) return setError('Select a bank');
    if (!/^\d{10}$/.test(accountNumber)) return setError('Account number must be 10 digits');
    if (!accountName) return setError('Enter a valid account number to resolve the name');
    create.mutate(
      { bankCode: bank.code, accountNumber, accountName },
      { onSuccess: () => navigation.goBack(), onError: () => setError('Could not save payout account') },
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Payout account</Text>
      <Text style={styles.subtitle}>Where should we send your earnings?</Text>

      <Text style={styles.label}>Bank</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bankRow}>
        {(banks ?? []).map((b) => (
          <Pressable
            key={b.code}
            onPress={() => setBank(b)}
            style={[styles.bankChip, bank?.code === b.code && styles.bankChipActive]}
          >
            <Text style={{ color: bank?.code === b.code ? theme.colors.white : theme.colors.ink, fontWeight: theme.font.weightSemibold }}>
              {b.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <InputGroup>
        <AppTextInput
          placeholder="Account number"
          keyboardType="number-pad"
          maxLength={10}
          value={accountNumber}
          onChangeText={setAccountNumber}
        />
      </InputGroup>

      {resolve.isPending && <Text style={styles.resolving}>Resolving account…</Text>}
      {accountName && (
        <View style={styles.resolved}>
          <Text style={styles.resolvedName}>{accountName}</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label="Save payout account"
        onPress={submit}
        style={{ marginTop: theme.spacing(3) }}
        disabled={create.isPending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) },
  subtitle: { color: theme.colors.muted, marginTop: theme.spacing(1), marginBottom: theme.spacing(2) },
  label: { color: theme.colors.muted, marginBottom: theme.spacing(1) },
  bankRow: { gap: 8, paddingBottom: theme.spacing(2) },
  bankChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: theme.radii.pill, backgroundColor: theme.colors.card },
  bankChipActive: { backgroundColor: theme.colors.primary },
  resolving: { color: theme.colors.muted, marginTop: theme.spacing(1) },
  resolved: { backgroundColor: theme.colors.chip, borderRadius: theme.radii.md, padding: theme.spacing(2), marginTop: theme.spacing(1) },
  resolvedName: { color: theme.colors.primary, fontWeight: theme.font.weightBold, fontSize: theme.font.sizeMd },
  error: { color: theme.colors.danger, marginTop: theme.spacing(1) },
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- PayoutSetupScreen` → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/account/PayoutSetupScreen.tsx mobile/__tests__/PayoutSetupScreen.test.tsx
git commit -m "feat(mobile): payout/bank setup screen with account resolve"
```

---

## Task 5: Earnings / payouts screen

**Files:**
- Create: `mobile/src/screens/account/EarningsScreen.tsx`
- Test: `mobile/__tests__/EarningsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/EarningsScreen.test.tsx`:
```tsx
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EarningsScreen } from '../src/screens/account/EarningsScreen';
import { api } from '../src/lib/api';

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EarningsScreen navigation={{ navigate: jest.fn() }} />
    </QueryClientProvider>,
  );
}

describe('EarningsScreen', () => {
  it('renders balance, escrow held vs released, and payout history', async () => {
    jest.spyOn(api, 'get').mockResolvedValue({
      data: {
        summary: { escrowHeld: 50000, released: 30000, paidOut: 0, available: 30000 },
        payouts: [{ id: '1', amount: 30000, paystackTransferCode: 'TRF_1', status: 'success', createdAt: '2026-06-19T00:00:00Z' }],
      },
    } as any);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Available balance')).toBeTruthy());
    expect(getByText('₦300')).toBeTruthy(); // available 30000 kobo → ₦300
    expect(getByText('Held in escrow')).toBeTruthy();
    expect(getByText('Released')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `EarningsScreen.tsx`**

```tsx
import React from 'react';
import { Text, View, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { usePayouts, Payout } from '../../api/payouts';
import { formatNaira } from '../../lib/format';

export function EarningsScreen({ navigation }: any) {
  const { data, isLoading } = usePayouts();

  if (isLoading || !data) {
    return (
      <Screen>
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(6) }} />
      </Screen>
    );
  }

  const { summary, payouts } = data;

  return (
    <Screen>
      <Text style={styles.title}>Earnings</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balanceValue}>{formatNaira(summary.available)}</Text>
        <Button
          label="Withdraw to bank"
          onPress={() => navigation.navigate('PayoutSetup')}
          style={{ marginTop: theme.spacing(2) }}
        />
      </View>

      <View style={styles.statRow}>
        <Stat label="Held in escrow" value={formatNaira(summary.escrowHeld)} />
        <Stat label="Released" value={formatNaira(summary.released)} />
        <Stat label="Paid out" value={formatNaira(summary.paidOut)} />
      </View>

      <Text style={styles.section}>Payout history</Text>
      <FlatList
        data={payouts}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={<Text style={styles.empty}>No payouts yet.</Text>}
        renderItem={({ item }) => <PayoutRow payout={item} />}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PayoutRow({ payout }: { payout: Payout }) {
  const color =
    payout.status === 'success' ? theme.colors.primary : payout.status === 'failed' ? theme.colors.danger : theme.colors.muted;
  return (
    <View style={styles.payoutRow}>
      <View>
        <Text style={styles.payoutAmount}>{formatNaira(payout.amount)}</Text>
        <Text style={styles.payoutDate}>{new Date(payout.createdAt).toLocaleDateString('en-NG')}</Text>
      </View>
      <Text style={[styles.payoutStatus, { color }]}>{payout.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4), marginBottom: theme.spacing(2) },
  balanceCard: { backgroundColor: theme.colors.primary, borderRadius: theme.radii.lg, padding: theme.spacing(3) },
  balanceLabel: { color: theme.colors.white, opacity: 0.85 },
  balanceValue: { color: theme.colors.white, fontSize: 32, fontWeight: theme.font.weightBold, marginTop: theme.spacing(1) },
  statRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing(2) },
  stat: { flex: 1, backgroundColor: theme.colors.card, borderRadius: theme.radii.md, padding: theme.spacing(2) },
  statValue: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, color: theme.colors.ink },
  statLabel: { fontSize: theme.font.sizeSm, color: theme.colors.muted, marginTop: 2 },
  section: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightBold, marginTop: theme.spacing(3), marginBottom: theme.spacing(1) },
  empty: { color: theme.colors.muted, marginTop: theme.spacing(2) },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  payoutAmount: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  payoutDate: { fontSize: theme.font.sizeSm, color: theme.colors.muted, marginTop: 2 },
  payoutStatus: { fontSize: theme.font.sizeSm, fontWeight: theme.font.weightSemibold, textTransform: 'capitalize' },
});
```

- [ ] **Step 4: Run test (passes)** → `npm test -- EarningsScreen` → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/account/EarningsScreen.tsx mobile/__tests__/EarningsScreen.test.tsx
git commit -m "feat(mobile): earnings/payouts screen"
```

---

## Task 6: Wire screens into the Account stack

**Files:**
- Modify: `mobile/src/navigation/AccountStack.tsx`

- [ ] **Step 1: Register the three screens**

Add the imports and `Stack.Screen` entries to the existing `AccountStack` (keep existing screens like Profile/Settings):
```tsx
import { KycVerificationScreen } from '../screens/account/KycVerificationScreen';
import { PayoutSetupScreen } from '../screens/account/PayoutSetupScreen';
import { EarningsScreen } from '../screens/account/EarningsScreen';

// inside the <Stack.Navigator> ...
<Stack.Screen name="KycVerification" component={KycVerificationScreen} options={{ title: 'Verification' }} />
<Stack.Screen name="PayoutSetup" component={PayoutSetupScreen} options={{ title: 'Payout account' }} />
<Stack.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
```

> If the lister dashboard or settings list exists, add navigation entries to `Earnings` and `KycVerification` there (e.g. `navigation.navigate('Earnings')`). The `Earnings` screen already routes to `PayoutSetup` via its "Withdraw to bank" button.

- [ ] **Step 2: Run full suite + manual check**

Run: `npm test` → all PASS.
Run: `npx expo start` → open Verification (enter BVN → pending), Payout account (select bank → enter 10-digit number → name resolves → save), Earnings (balance + escrow held/released + history).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/navigation/AccountStack.tsx
git commit -m "feat(mobile): wire kyc, payout, earnings screens into account stack"
```

---

## Self-Review (against spec §5.6, §7 screens 28/31/32, §11 Design System)

- **Hooks `useKycStatus`, `useStartKyc`, `usePayoutAccount`, `useCreatePayoutAccount`, `usePayouts`:** Task 1. ✓ (+ `useBanks`/`useResolveAccount` supporting the resolve flow, and `formatNaira` for kobo→₦.)
- **KYC verification screen (ID/BVN entry + document/photo upload via expo-image-picker, status states pending/verified/rejected):** Tasks 2 (`DocumentUpload`, `StatusBadge`), 3. ✓
- **Payout / bank setup (bank select + account number → resolve account name → save):** Task 4 (auto-resolve on 10 digits via `useResolveAccount`, save via `useCreatePayoutAccount`). ✓
- **Earnings / payouts (balance, escrow held vs. released, payout history):** Task 5. ✓
- **Tests: KYC status-screen render per status; payout form validation:** `KycVerificationScreen.test.tsx` (4 statuses), `PayoutSetupScreen.test.tsx` (validation + resolve), plus `useKyc`/`StatusBadge`/`EarningsScreen`. ✓
- **Teal design system (pill chips/segments, grouped bordered inputs, teal primary cards, status pills):** `StatusBadge`, segmented BVN/NIN toggle, bank chips, teal balance card, reused `Button`/`InputGroup`/`AppTextInput`. ✓
- **Navigation wiring (screens 28 Earnings, 31 KYC, 32 Payout setup):** Task 6. ✓

**Type consistency:** `KycStatus` (`none|pending|verified|rejected`) flows from `api/kyc.ts` into `StatusBadge` and `KycVerificationScreen`; `Bank`/`ResolvedAccount`/`PayoutAccount`/`Earnings` types from `api/payouts.ts` match the backend response shapes (`/payout-account/banks`, `/payout-account/resolve`, `/payout-account`, `/payouts`); the `{summary:{escrowHeld,released,paidOut,available}, payouts}` contract is consumed verbatim by `EarningsScreen`; money is treated as integer kobo end-to-end and only converted for display by `formatNaira`.

**No placeholders:** every code step is complete and runnable. The single `AccountStack` step is an additive edit to an existing navigator; the optional dashboard/settings link note is a clearly-bounded UX hook into already-existing screens, not a missing requirement.
