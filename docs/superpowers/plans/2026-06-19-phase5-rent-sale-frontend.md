# Phase 5 — Rent Applications, Sale Inquiries & Viewings (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the seeker-side rent **application + deposit pay**, **sale inquiry**, and **schedule inspection** flows, the **My applications / inquiries** status tracker, and the additions to the **lister inbox** for incoming applications, inquiries, and viewing requests (with confirm/reschedule actions) — all in the teal design system and wired to the Phase 5 backend.

**Architecture:** React Query hooks live in `src/api/applications.ts`, `src/api/inquiries.ts`, and `src/api/viewings.ts` and call the Axios `api`. A small pure `src/lib/datetime.ts` helper combines a picked date + time into an ISO string (unit-tested). Screens live under `src/screens/rentsale/` and `src/screens/lister/`. The rent deposit step **reuses the Phase 4 `PaystackCheckout` component**, which renders the Paystack checkout for an `authorizationUrl` and fires `onSuccess`/`onClose`. Date/time entry uses `@react-native-community/datetimepicker`. Reuses Phase 0/1 primitives (`Screen`, `Button`, `AppTextInput`, `InputGroup`, `theme`), the Zustand `useAuthStore`, and the React Query client.

> **Reused from Phase 4 (assumed present):**
> - `src/components/PaystackCheckout.tsx` — `<PaystackCheckout authorizationUrl reference onSuccess onClose />` (WebView-based Paystack checkout used by the short-stay booking pay screen).

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, React Query, Zustand, Axios, `@react-native-community/datetimepicker`, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit run in your own terminal. Assumes Phases 0–4 frontend are complete (theme, primitives, `api`, `queryClient`, `useAuthStore`, navigation shell, and the `PaystackCheckout` component).

> All paths relative to `mobile/`.

---

## File Structure (created/modified this phase)

```
mobile/
└── src/
    ├── lib/datetime.ts                                  # combineDateAndTime + formatScheduledAt (pure)
    ├── api/applications.ts                              # useCreateApplication, useMyApplications, status mutations, useHostApplications
    ├── api/inquiries.ts                                 # useCreateInquiry, useMyInquiries, useHostInquiries, useCloseInquiry
    ├── api/viewings.ts                                  # useViewings, useScheduleViewing, useUpdateViewing
    ├── screens/rentsale/RentApplicationScreen.tsx       # application form + deposit pay (PaystackCheckout)
    ├── screens/rentsale/SaleInquiryScreen.tsx           # message inquiry
    ├── screens/rentsale/ScheduleInspectionScreen.tsx    # date/time picker
    ├── screens/rentsale/MyApplicationsScreen.tsx        # status tracking (applications + inquiries)
    ├── screens/lister/ListerInboxScreen.tsx             # MODIFY/CREATE: incoming applications/inquiries/viewings + actions
    └── navigation/                                      # MODIFY: register the new screens
__tests__/
    ├── datetime.test.ts
    ├── RentApplicationScreen.test.tsx
    └── ScheduleInspectionScreen.test.tsx
```

---

## Task 1: Date/time helper (pure logic)

**Files:**
- Create: `mobile/src/lib/datetime.ts`
- Test: `mobile/__tests__/datetime.test.ts`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/datetime.test.ts`:
```ts
import { combineDateAndTime, formatScheduledAt, isFuture } from '../src/lib/datetime';

describe('combineDateAndTime', () => {
  it('takes the Y/M/D from the date and H/M from the time', () => {
    const date = new Date(2026, 6, 20, 9, 0, 0); // 20 Jul 2026 09:00
    const time = new Date(2026, 0, 1, 14, 30, 0); // time portion 14:30
    const combined = combineDateAndTime(date, time);
    expect(combined.getFullYear()).toBe(2026);
    expect(combined.getMonth()).toBe(6);
    expect(combined.getDate()).toBe(20);
    expect(combined.getHours()).toBe(14);
    expect(combined.getMinutes()).toBe(30);
  });

  it('isFuture is false for a past instant and true for a future one', () => {
    expect(isFuture(new Date(Date.now() - 10_000))).toBe(false);
    expect(isFuture(new Date(Date.now() + 86_400_000))).toBe(true);
  });

  it('formatScheduledAt returns a non-empty human string', () => {
    const s = formatScheduledAt(new Date(2026, 6, 20, 14, 30));
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npm test -- datetime` → FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/datetime.ts`**

```ts
export function combineDateAndTime(date: Date, time: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes(),
    0,
    0,
  );
}

export function isFuture(when: Date): boolean {
  return when.getTime() > Date.now();
}

export function formatScheduledAt(when: Date): string {
  return when.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
```

- [ ] **Step 4: Run test (passes)** → `npm test -- datetime` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/lib/datetime.ts mobile/__tests__/datetime.test.ts
git commit -m "feat(mobile): date/time combine + format helpers"
```

---

## Task 2: Applications API hooks

**Files:**
- Create: `mobile/src/api/applications.ts`

- [ ] **Step 1: Implement the hooks**

`mobile/src/api/applications.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface Application {
  id: string;
  status: ApplicationStatus;
  message: string | null;
  depositPaymentId: string | null;
  listing: { id: string; title: string; listingType: string; city: string };
  applicant: { id: string; name: string; email?: string };
  host: { id: string; name: string };
  depositPayment?: { id: string; amount: number; status: string } | null;
  createdAt: string;
}

interface CreateApplicationResponse {
  application: Application;
  authorizationUrl: string;
  reference: string;
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { listingId: string; message?: string }) =>
      (await api.post<CreateApplicationResponse>('/applications', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications', 'mine'] });
    },
  });
}

export function useMyApplications() {
  return useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: async () => (await api.get<{ items: Application[] }>('/applications')).data.items,
  });
}

export function useHostApplications() {
  return useQuery({
    queryKey: ['applications', 'host'],
    queryFn: async () => (await api.get<{ items: Application[] }>('/me/applications')).data.items,
  });
}

export function useApplicationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' | 'withdraw' }) =>
      (await api.post<Application>(`/applications/${id}/${action}`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/api/applications.ts
git commit -m "feat(mobile): applications react-query hooks"
```

---

## Task 3: Inquiries + Viewings API hooks

**Files:**
- Create: `mobile/src/api/inquiries.ts`
- Create: `mobile/src/api/viewings.ts`

- [ ] **Step 1: Implement `src/api/inquiries.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type InquiryStatus = 'open' | 'closed';

export interface Inquiry {
  id: string;
  status: InquiryStatus;
  message: string;
  listing: { id: string; title: string; listingType: string; city: string };
  seeker: { id: string; name: string };
  host: { id: string; name: string };
  createdAt: string;
}

export function useCreateInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { listingId: string; message: string }) =>
      (await api.post<Inquiry>('/inquiries', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inquiries', 'mine'] });
    },
  });
}

export function useMyInquiries() {
  return useQuery({
    queryKey: ['inquiries', 'mine'],
    queryFn: async () => (await api.get<{ items: Inquiry[] }>('/inquiries')).data.items,
  });
}

export function useHostInquiries() {
  return useQuery({
    queryKey: ['inquiries', 'host'],
    queryFn: async () => (await api.get<{ items: Inquiry[] }>('/me/inquiries')).data.items,
  });
}

export function useCloseInquiry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post<Inquiry>(`/inquiries/${id}/close`)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}
```

- [ ] **Step 2: Implement `src/api/viewings.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type ViewingStatus = 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed';
export type ViewingAction = 'confirm' | 'reschedule' | 'cancel' | 'complete';

export interface Viewing {
  id: string;
  status: ViewingStatus;
  scheduledAt: string;
  note: string | null;
  listing: { id: string; title: string; listingType: string; city: string };
  requester: { id: string; name: string };
  host: { id: string; name: string };
  createdAt: string;
}

export function useViewings(role: 'requester' | 'host' = 'requester') {
  return useQuery({
    queryKey: ['viewings', role],
    queryFn: async () => (await api.get<{ items: Viewing[] }>(`/viewings?role=${role}`)).data.items,
  });
}

export function useScheduleViewing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { listingId: string; scheduledAt: string; note?: string }) =>
      (await api.post<Viewing>('/viewings', input)).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['viewings'] });
    },
  });
}

export function useUpdateViewing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, scheduledAt }: { id: string; action: ViewingAction; scheduledAt?: string }) =>
      (await api.patch<Viewing>(`/viewings/${id}`, { action, scheduledAt })).data,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['viewings'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/api/inquiries.ts mobile/src/api/viewings.ts
git commit -m "feat(mobile): inquiries + viewings react-query hooks"
```

---

## Task 4: Rent application + deposit pay screen

**Files:**
- Create: `mobile/src/screens/rentsale/RentApplicationScreen.tsx`
- Test: `mobile/__tests__/RentApplicationScreen.test.tsx`

- [ ] **Step 1: Write the failing test (validation + Paystack handoff)**

`mobile/__tests__/RentApplicationScreen.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RentApplicationScreen } from '../src/screens/rentsale/RentApplicationScreen';
import { api } from '../src/lib/api';

// Stub the Paystack checkout so the test can assert the handoff without a WebView.
jest.mock('../src/components/PaystackCheckout', () => ({
  PaystackCheckout: ({ authorizationUrl }: { authorizationUrl: string }) => {
    const { Text } = require('react-native');
    return <Text>checkout:{authorizationUrl}</Text>;
  },
}));

const route = { params: { listingId: '11111111-1111-1111-1111-111111111111', title: '2-Bed Flat', securityDeposit: 300000 } };

function renderScreen(navigation: any = { goBack: jest.fn(), navigate: jest.fn() }) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <RentApplicationScreen navigation={navigation} route={route} />
    </QueryClientProvider>,
  );
}

describe('RentApplicationScreen', () => {
  it('blocks submit until the message is long enough', async () => {
    const post = jest.spyOn(api, 'post');
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Apply & pay deposit/i));
    await waitFor(() => expect(getByText('Tell the lister a bit about yourself (min 10 characters)')).toBeTruthy());
    expect(post).not.toHaveBeenCalled();
  });

  it('submits and shows the Paystack checkout on success', async () => {
    jest.spyOn(api, 'post').mockResolvedValue({
      data: {
        application: { id: 'app-1', status: 'pending', depositPaymentId: 'pay-1' },
        authorizationUrl: 'https://checkout.paystack.com/xyz',
        reference: 'rentdep_1',
      },
    } as any);

    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Message to the lister'), 'I am a clean, quiet tenant and would love this flat.');
    fireEvent.press(getByText(/Apply & pay deposit/i));

    await waitFor(() => expect(getByText(/checkout:https:\/\/checkout.paystack.com\/xyz/)).toBeTruthy());
    expect(api.post).toHaveBeenCalledWith('/applications', expect.objectContaining({ listingId: route.params.listingId }));
  });
});
```

- [ ] **Step 2: Run test (fails)** → `npm test -- RentApplicationScreen` → FAIL.

- [ ] **Step 3: Implement `RentApplicationScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { PaystackCheckout } from '../../components/PaystackCheckout';
import { theme } from '../../theme';
import { useCreateApplication } from '../../api/applications';

function formatNaira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export function RentApplicationScreen({ navigation, route }: any) {
  const { listingId, title, securityDeposit } = route.params as {
    listingId: string;
    title: string;
    securityDeposit: number;
  };
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<{ authorizationUrl: string; reference: string } | null>(null);
  const create = useCreateApplication();

  function submit() {
    setError(null);
    if (message.trim().length < 10) {
      return setError('Tell the lister a bit about yourself (min 10 characters)');
    }
    create.mutate(
      { listingId, message: message.trim() },
      {
        onSuccess: (data) => setCheckout({ authorizationUrl: data.authorizationUrl, reference: data.reference }),
        onError: () => setError('Could not start your application. Please try again.'),
      },
    );
  }

  if (checkout) {
    return (
      <PaystackCheckout
        authorizationUrl={checkout.authorizationUrl}
        reference={checkout.reference}
        onSuccess={() => navigation.navigate('MyApplications')}
        onClose={() => setCheckout(null)}
      />
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Apply to rent
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>{title}</Text>

      <View style={{ backgroundColor: theme.colors.card, borderRadius: theme.radii.md, padding: theme.spacing(2), marginBottom: theme.spacing(2) }}>
        <Text style={{ color: theme.colors.muted, fontSize: theme.font.sizeSm }}>Security deposit due now</Text>
        <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, color: theme.colors.ink }}>
          {formatNaira(securityDeposit)}
        </Text>
      </View>

      <InputGroup>
        <AppTextInput
          placeholder="Message to the lister"
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />
      </InputGroup>
      {error && <Text style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>{error}</Text>}

      <Button
        label="Apply & pay deposit"
        onPress={submit}
        style={{ marginTop: theme.spacing(2) }}
        disabled={create.isPending}
      />
    </Screen>
  );
}
```

- [ ] **Step 4: Run test (passes)** → `npm test -- RentApplicationScreen` → PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/rentsale/RentApplicationScreen.tsx mobile/__tests__/RentApplicationScreen.test.tsx
git commit -m "feat(mobile): rent application + deposit pay screen"
```

---

## Task 5: Sale inquiry screen

**Files:**
- Create: `mobile/src/screens/rentsale/SaleInquiryScreen.tsx`

- [ ] **Step 1: Implement `SaleInquiryScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { InputGroup } from '../../components/InputGroup';
import { AppTextInput } from '../../components/TextInput';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useCreateInquiry } from '../../api/inquiries';

export function SaleInquiryScreen({ navigation, route }: any) {
  const { listingId, title } = route.params as { listingId: string; title: string };
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const create = useCreateInquiry();

  function submit() {
    setError(null);
    if (message.trim().length < 1) return setError('Enter a message for the lister');
    create.mutate(
      { listingId, message: message.trim() },
      { onSuccess: () => setSent(true), onError: () => setError('Could not send your inquiry. Please try again.') },
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Inquire about this property
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>
        {sent ? 'Your message has been sent to the lister.' : title}
      </Text>

      {!sent && (
        <>
          <InputGroup>
            <AppTextInput
              placeholder="Your message"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />
          </InputGroup>
          {error && <Text style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>{error}</Text>}
          <Button label="Send inquiry" onPress={submit} style={{ marginTop: theme.spacing(2) }} disabled={create.isPending} />
          <Button
            label="Schedule an inspection instead"
            variant="secondary"
            style={{ marginTop: theme.spacing(2) }}
            onPress={() => navigation.navigate('ScheduleInspection', { listingId, title })}
          />
        </>
      )}
      {sent && (
        <Button label="Back to listing" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: theme.spacing(2) }} />
      )}
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/rentsale/SaleInquiryScreen.tsx
git commit -m "feat(mobile): sale inquiry screen"
```

---

## Task 6: Schedule inspection screen (date/time picker)

**Files:**
- Create: `mobile/src/screens/rentsale/ScheduleInspectionScreen.tsx`
- Test: `mobile/__tests__/ScheduleInspectionScreen.test.tsx`

- [ ] **Step 1: Install the picker**

Run: `cd ~/Projects/HomeBase/mobile && npx expo install @react-native-community/datetimepicker`

- [ ] **Step 2: Write the failing test (mock the native picker)**

`mobile/__tests__/ScheduleInspectionScreen.test.tsx`:
```tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScheduleInspectionScreen } from '../src/screens/rentsale/ScheduleInspectionScreen';
import { api } from '../src/lib/api';

// Render the native picker as a no-op; the screen owns date/time state directly.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

const route = { params: { listingId: '22222222-2222-2222-2222-222222222222', title: '2-Bed Flat' } };

function renderScreen(navigation: any = { goBack: jest.fn(), navigate: jest.fn() }) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ScheduleInspectionScreen navigation={navigation} route={route} />
    </QueryClientProvider>,
  );
}

describe('ScheduleInspectionScreen', () => {
  it('submits a combined ISO scheduledAt to the API', async () => {
    const post = jest.spyOn(api, 'post').mockResolvedValue({ data: { id: 'v1', status: 'requested' } } as any);
    const navigation = { goBack: jest.fn(), navigate: jest.fn() };
    const { getByText } = renderScreen(navigation);

    fireEvent.press(getByText('Request inspection'));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/viewings', expect.objectContaining({ listingId: route.params.listingId })));
    const body = post.mock.calls[0][1] as { scheduledAt: string };
    expect(typeof body.scheduledAt).toBe('string');
    expect(Number.isNaN(Date.parse(body.scheduledAt))).toBe(false);
  });
});
```

- [ ] **Step 3: Run test (fails)** → `npm test -- ScheduleInspectionScreen` → FAIL.

- [ ] **Step 4: Implement `ScheduleInspectionScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, View, Pressable, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useScheduleViewing } from '../../api/viewings';
import { combineDateAndTime, formatScheduledAt, isFuture } from '../../lib/datetime';

function defaultSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function ScheduleInspectionScreen({ navigation, route }: any) {
  const { listingId, title } = route.params as { listingId: string; title: string };
  const [date, setDate] = useState<Date>(defaultSlot());
  const [time, setTime] = useState<Date>(defaultSlot());
  const [show, setShow] = useState<'date' | 'time' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const schedule = useScheduleViewing();

  const scheduledAt = combineDateAndTime(date, time);

  function submit() {
    setError(null);
    if (!isFuture(scheduledAt)) return setError('Pick a date and time in the future');
    schedule.mutate(
      { listingId, scheduledAt: scheduledAt.toISOString() },
      { onSuccess: () => navigation.navigate('MyApplications'), onError: () => setError('Could not request the inspection. Please try again.') },
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4) }}>
        Schedule an inspection
      </Text>
      <Text style={{ color: theme.colors.muted, marginBottom: theme.spacing(2) }}>{title}</Text>

      <Row label="Date" value={formatScheduledAt(date).split(',').slice(0, 2).join(',')} onPress={() => setShow('date')} />
      <Row label="Time" value={time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} onPress={() => setShow('time')} />

      <View style={{ backgroundColor: theme.colors.chip, borderRadius: theme.radii.md, padding: theme.spacing(2), marginTop: theme.spacing(2) }}>
        <Text style={{ color: theme.colors.ink }}>Requested for {formatScheduledAt(scheduledAt)}</Text>
      </View>

      {show === 'date' && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date()}
          onChange={(_e, selected) => {
            setShow(Platform.OS === 'ios' ? 'date' : null);
            if (selected) setDate(selected);
          }}
        />
      )}
      {show === 'time' && (
        <DateTimePicker
          value={time}
          mode="time"
          onChange={(_e, selected) => {
            setShow(Platform.OS === 'ios' ? 'time' : null);
            if (selected) setTime(selected);
          }}
        />
      )}

      {error && <Text style={{ color: theme.colors.danger, marginTop: theme.spacing(1) }}>{error}</Text>}
      <Button label="Request inspection" onPress={submit} style={{ marginTop: theme.spacing(3) }} disabled={schedule.isPending} />
    </Screen>
  );
}

function Row({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.line,
        borderRadius: theme.radii.md,
        padding: theme.spacing(2),
        marginTop: theme.spacing(2),
      }}
    >
      <Text style={{ color: theme.colors.muted }}>{label}</Text>
      <Text style={{ color: theme.colors.ink, fontWeight: theme.font.weightSemibold }}>{value}</Text>
    </Pressable>
  );
}
```

- [ ] **Step 5: Run test (passes)** → `npm test -- ScheduleInspectionScreen` → PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/rentsale/ScheduleInspectionScreen.tsx mobile/__tests__/ScheduleInspectionScreen.test.tsx mobile/package.json
git commit -m "feat(mobile): schedule inspection screen with date/time picker"
```

---

## Task 7: My applications / inquiries tracking screen

**Files:**
- Create: `mobile/src/screens/rentsale/MyApplicationsScreen.tsx`

- [ ] **Step 1: Implement `MyApplicationsScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, View, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { theme } from '../../theme';
import { useMyApplications, useApplicationAction, Application } from '../../api/applications';
import { useMyInquiries, Inquiry } from '../../api/inquiries';
import { useViewings, Viewing } from '../../api/viewings';
import { formatScheduledAt } from '../../lib/datetime';

type Tab = 'applications' | 'inquiries' | 'viewings';

const STATUS_TINT: Record<string, string> = {
  pending: theme.colors.muted,
  requested: theme.colors.muted,
  approved: theme.colors.primary,
  confirmed: theme.colors.primary,
  completed: theme.colors.primary,
  rejected: theme.colors.danger,
  cancelled: theme.colors.danger,
  withdrawn: theme.colors.danger,
  closed: theme.colors.muted,
  rescheduled: theme.colors.ink,
};

function StatusPill({ status }: { status: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: theme.colors.chip }]}>
      <Text style={{ color: STATUS_TINT[status] ?? theme.colors.ink, fontSize: theme.font.sizeXs, fontWeight: theme.font.weightSemibold }}>
        {status}
      </Text>
    </View>
  );
}

export function MyApplicationsScreen() {
  const [tab, setTab] = useState<Tab>('applications');
  const applications = useMyApplications();
  const inquiries = useMyInquiries();
  const viewings = useViewings('requester');
  const action = useApplicationAction();

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4), marginBottom: theme.spacing(2) }}>
        My activity
      </Text>

      <View style={styles.segment}>
        {(['applications', 'inquiries', 'viewings'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.segmentItem, tab === t && styles.segmentItemActive]} onPress={() => setTab(t)}>
            <Text style={{ color: tab === t ? theme.colors.white : theme.colors.muted, fontWeight: theme.font.weightSemibold }}>
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'applications' && (
        <List
          loading={applications.isLoading}
          data={applications.data ?? []}
          empty="You haven’t applied to any rentals yet."
          renderItem={(a: Application) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{a.listing.title}</Text>
                <StatusPill status={a.status} />
              </View>
              <Text style={styles.cardMuted}>{a.listing.city}</Text>
              {a.status === 'pending' && (
                <Pressable onPress={() => action.mutate({ id: a.id, action: 'withdraw' })} style={{ marginTop: theme.spacing(1) }}>
                  <Text style={{ color: theme.colors.danger, fontWeight: theme.font.weightSemibold }}>Withdraw</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}

      {tab === 'inquiries' && (
        <List
          loading={inquiries.isLoading}
          data={inquiries.data ?? []}
          empty="No inquiries yet."
          renderItem={(i: Inquiry) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{i.listing.title}</Text>
                <StatusPill status={i.status} />
              </View>
              <Text style={styles.cardMuted} numberOfLines={2}>{i.message}</Text>
            </View>
          )}
        />
      )}

      {tab === 'viewings' && (
        <List
          loading={viewings.isLoading}
          data={viewings.data ?? []}
          empty="No inspections scheduled."
          renderItem={(v: Viewing) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{v.listing.title}</Text>
                <StatusPill status={v.status} />
              </View>
              <Text style={styles.cardMuted}>{formatScheduledAt(new Date(v.scheduledAt))}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function List<T extends { id: string }>({
  loading,
  data,
  empty,
  renderItem,
}: {
  loading: boolean;
  data: T[];
  empty: string;
  renderItem: (item: T) => React.ReactElement;
}) {
  if (loading) return <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />;
  if (data.length === 0) return <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(4) }}>{empty}</Text>;
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderItem(item)}
      contentContainerStyle={{ paddingVertical: theme.spacing(1) }}
    />
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.radii.pill, padding: 4, marginBottom: theme.spacing(2) },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.radii.pill },
  segmentItemActive: { backgroundColor: theme.colors.primary },
  card: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, padding: theme.spacing(2), marginBottom: theme.spacing(2) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink, flexShrink: 1, paddingRight: 8 },
  cardMuted: { color: theme.colors.muted, marginTop: theme.spacing(0.5) },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.radii.pill },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/rentsale/MyApplicationsScreen.tsx
git commit -m "feat(mobile): my applications/inquiries/viewings tracking screen"
```

---

## Task 8: Lister inbox — incoming applications, inquiries & viewing requests

**Files:**
- Create/Modify: `mobile/src/screens/lister/ListerInboxScreen.tsx`

- [ ] **Step 1: Implement `ListerInboxScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text, View, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useHostApplications, useApplicationAction, Application } from '../../api/applications';
import { useHostInquiries, useCloseInquiry, Inquiry } from '../../api/inquiries';
import { useViewings, useUpdateViewing, Viewing } from '../../api/viewings';
import { formatScheduledAt, combineDateAndTime } from '../../lib/datetime';

type Tab = 'applications' | 'inquiries' | 'viewings';

export function ListerInboxScreen({ navigation }: any) {
  const [tab, setTab] = useState<Tab>('applications');
  const applications = useHostApplications();
  const inquiries = useHostInquiries();
  const viewings = useViewings('host');
  const decide = useApplicationAction();
  const closeInquiry = useCloseInquiry();
  const updateViewing = useUpdateViewing();

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(4), marginBottom: theme.spacing(2) }}>
        Inbox
      </Text>

      <View style={styles.segment}>
        {(['applications', 'inquiries', 'viewings'] as Tab[]).map((t) => (
          <Pressable key={t} style={[styles.segmentItem, tab === t && styles.segmentItemActive]} onPress={() => setTab(t)}>
            <Text style={{ color: tab === t ? theme.colors.white : theme.colors.muted, fontWeight: theme.font.weightSemibold }}>
              {t[0].toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'applications' && (
        <ListBlock loading={applications.isLoading} data={applications.data ?? []} empty="No rental applications yet.">
          {(a: Application) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{a.listing.title}</Text>
              <Text style={styles.cardMuted}>From {a.applicant.name} · {a.status}</Text>
              {a.message ? <Text style={{ color: theme.colors.ink, marginTop: theme.spacing(1) }} numberOfLines={3}>{a.message}</Text> : null}
              {a.status === 'pending' && (
                <View style={styles.actionRow}>
                  <Button label="Approve" onPress={() => decide.mutate({ id: a.id, action: 'approve' })} style={styles.actionBtn} />
                  <Button label="Reject" variant="secondary" onPress={() => decide.mutate({ id: a.id, action: 'reject' })} style={styles.actionBtn} />
                </View>
              )}
            </View>
          )}
        </ListBlock>
      )}

      {tab === 'inquiries' && (
        <ListBlock loading={inquiries.isLoading} data={inquiries.data ?? []} empty="No sale inquiries yet.">
          {(i: Inquiry) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{i.listing.title}</Text>
              <Text style={styles.cardMuted}>From {i.seeker.name} · {i.status}</Text>
              <Text style={{ color: theme.colors.ink, marginTop: theme.spacing(1) }} numberOfLines={3}>{i.message}</Text>
              {i.status === 'open' && (
                <Pressable onPress={() => closeInquiry.mutate(i.id)} style={{ marginTop: theme.spacing(1) }}>
                  <Text style={{ color: theme.colors.primary, fontWeight: theme.font.weightSemibold }}>Mark as closed</Text>
                </Pressable>
              )}
            </View>
          )}
        </ListBlock>
      )}

      {tab === 'viewings' && (
        <ListBlock loading={viewings.isLoading} data={viewings.data ?? []} empty="No viewing requests yet.">
          {(v: Viewing) => {
            const canAct = v.status === 'requested' || v.status === 'rescheduled' || v.status === 'confirmed';
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{v.listing.title}</Text>
                <Text style={styles.cardMuted}>{v.requester.name} · {v.status}</Text>
                <Text style={{ color: theme.colors.ink, marginTop: theme.spacing(0.5) }}>{formatScheduledAt(new Date(v.scheduledAt))}</Text>
                {canAct && (
                  <View style={styles.actionRow}>
                    {(v.status === 'requested' || v.status === 'rescheduled') && (
                      <Button label="Confirm" onPress={() => updateViewing.mutate({ id: v.id, action: 'confirm' })} style={styles.actionBtn} />
                    )}
                    <Button
                      label="Reschedule"
                      variant="secondary"
                      onPress={() => {
                        // bump 1 day as a quick lister-side proposal; the seeker can re-confirm
                        const next = combineDateAndTime(new Date(new Date(v.scheduledAt).getTime() + 86_400_000), new Date(v.scheduledAt));
                        updateViewing.mutate({ id: v.id, action: 'reschedule', scheduledAt: next.toISOString() });
                      }}
                      style={styles.actionBtn}
                    />
                    <Button label="Cancel" variant="secondary" onPress={() => updateViewing.mutate({ id: v.id, action: 'cancel' })} style={styles.actionBtn} />
                  </View>
                )}
              </View>
            );
          }}
        </ListBlock>
      )}
    </Screen>
  );
}

function ListBlock<T extends { id: string }>({
  loading,
  data,
  empty,
  children,
}: {
  loading: boolean;
  data: T[];
  empty: string;
  children: (item: T) => React.ReactElement;
}) {
  if (loading) return <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing(4) }} />;
  if (data.length === 0) return <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(4) }}>{empty}</Text>;
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => children(item)}
      contentContainerStyle={{ paddingVertical: theme.spacing(1) }}
    />
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', backgroundColor: theme.colors.card, borderRadius: theme.radii.pill, padding: 4, marginBottom: theme.spacing(2) },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: theme.radii.pill },
  segmentItemActive: { backgroundColor: theme.colors.primary },
  card: { borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, padding: theme.spacing(2), marginBottom: theme.spacing(2) },
  cardTitle: { fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  cardMuted: { color: theme.colors.muted, marginTop: theme.spacing(0.5) },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing(2) },
  actionBtn: { flex: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/lister/ListerInboxScreen.tsx
git commit -m "feat(mobile): lister inbox for applications, inquiries & viewings"
```

---

## Task 9: Register screens in navigation + full suite green

**Files:**
- Modify: the relevant navigator(s) (e.g. `mobile/src/navigation/MainTabs.tsx` and/or a `RentSaleStack`/`ListerStack`)

- [ ] **Step 1: Register the new screens**

Add the screens to the appropriate stack navigator(s). For example, in the seeker stack that owns listing detail:
```tsx
import { RentApplicationScreen } from '../screens/rentsale/RentApplicationScreen';
import { SaleInquiryScreen } from '../screens/rentsale/SaleInquiryScreen';
import { ScheduleInspectionScreen } from '../screens/rentsale/ScheduleInspectionScreen';
import { MyApplicationsScreen } from '../screens/rentsale/MyApplicationsScreen';
// ...
<Stack.Screen name="RentApplication" component={RentApplicationScreen} options={{ title: 'Apply to rent' }} />
<Stack.Screen name="SaleInquiry" component={SaleInquiryScreen} options={{ title: 'Inquire' }} />
<Stack.Screen name="ScheduleInspection" component={ScheduleInspectionScreen} options={{ title: 'Schedule inspection' }} />
<Stack.Screen name="MyApplications" component={MyApplicationsScreen} options={{ title: 'My activity' }} />
```
And register `ListerInboxScreen` in the lister stack/tab:
```tsx
import { ListerInboxScreen } from '../screens/lister/ListerInboxScreen';
// ...
<Stack.Screen name="ListerInbox" component={ListerInboxScreen} options={{ title: 'Inbox' }} />
```
Wire the contextual CTAs on the listing detail screen: for `listingType === 'rent'` navigate to `RentApplication` (passing `{ listingId, title, securityDeposit }`); for `sale` navigate to `SaleInquiry` (passing `{ listingId, title }`); both expose a "Schedule inspection" action to `ScheduleInspection`.

- [ ] **Step 2: Run the full test suite**

Run: `npm test` → all PASS (datetime, RentApplicationScreen, ScheduleInspectionScreen, plus existing Phase 0–4 suites).

- [ ] **Step 3: Manual smoke check**

Run: `npx expo start` (with the Phase 5 backend running). Rent detail → "Apply & pay deposit" → message → Paystack checkout → My activity. Sale detail → inquiry sent. "Schedule inspection" → pick date/time → request. As a lister: Inbox → Approve/Reject applications, close inquiries, Confirm/Reschedule/Cancel viewings.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/navigation
git commit -m "feat(mobile): wire rent/sale/viewing screens + lister inbox into navigation"
```

---

## Self-Review (against spec §5.3, §7 screens 16–19 & 27, §11 Design System)

- **Hooks `useCreateApplication`, `useMyApplications`, `useCreateInquiry`, `useViewings`, `useScheduleViewing`, status mutations:** Tasks 2, 3 (`useApplicationAction`, `useCloseInquiry`, `useUpdateViewing`, plus `useHostApplications`/`useHostInquiries` for the inbox). ✓
- **Rent application + deposit pay (reuse Paystack component):** Task 4 (`PaystackCheckout` handed the `authorizationUrl` from `useCreateApplication`). ✓
- **Sale inquiry (message):** Task 5. ✓
- **Schedule inspection (date/time picker):** Task 6 (`@react-native-community/datetimepicker` + `combineDateAndTime`). ✓
- **My applications/inquiries (status tracking):** Task 7 (segmented applications/inquiries/viewings with status pills + withdraw). ✓
- **Lister inbox additions (incoming applications/inquiries/viewing requests with confirm/reschedule):** Task 8 (approve/reject, close, confirm/reschedule/cancel). ✓
- **Tests — date/time picker logic + application form validation:** Task 1 (`datetime.test.ts`), Task 4 (`RentApplicationScreen.test.tsx` validation + Paystack handoff), Task 6 (`ScheduleInspectionScreen.test.tsx`). ✓
- **Teal design system:** all screens use `Screen`, `Button`, `AppTextInput`, `InputGroup`, segmented pills, status chips, and `theme` tokens. ✓

**Type consistency:** `Application`/`Inquiry`/`Viewing` interfaces in the api modules mirror the backend `*Include` response shapes; the `CreateApplicationResponse` `{ application, authorizationUrl, reference }` matches the backend Task 5 contract and feeds `PaystackCheckout`; `combineDateAndTime`/`formatScheduledAt`/`isFuture` are the single source of date logic used by both the schedule screen and the trackers; query keys (`['applications']`, `['inquiries']`, `['viewings', role]`) are invalidated consistently by the mutations.

**No placeholders:** every code step is complete and runnable. The only external dependency is the explicitly-documented Phase 4 `PaystackCheckout` component, which this phase reuses; navigation registration (Task 9) adapts to whatever stack names exist in your project, with concrete example wiring provided.
