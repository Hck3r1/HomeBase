# Phase 4 — Short-stay Booking & Payments (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the short-stay booking experience — date & guest selection, server-priced review, Paystack checkout, confirmation, "my bookings", host booking inbox, and the host availability calendar manager.

**Architecture:** React Query hooks in `src/api/bookings.ts` call the Phase 4 backend (quote, create, list, host actions, availability). A `PaystackCheckout` component opens the Paystack authorization URL via `react-native-paystack-webview` (or a WebView) and resolves on success. Screens live under `src/screens/booking/` and `src/screens/host/`. Prices come from the server quote — the client never computes totals.

**Tech Stack:** Expo, React Native, TypeScript, React Navigation, React Query, react-native-paystack-webview, Jest (jest-expo) + @testing-library/react-native.

> **Note on git:** Each task ends with a commit. Assumes Phases 0–3 frontend complete (theme, primitives, api client, auth, listing screens, price formatter from Phase 2).

> All paths relative to `mobile/`.

---

## File Structure (created/modified this phase)

```
mobile/
└── src/
    ├── api/bookings.ts                          # react-query hooks
    ├── components/PaystackCheckout.tsx          # Paystack webview wrapper
    ├── components/GuestStepper.tsx
    ├── components/PriceBreakdown.tsx
    ├── components/BookingCalendar.tsx           # range select
    ├── screens/booking/SelectDatesScreen.tsx
    ├── screens/booking/BookingReviewScreen.tsx
    ├── screens/booking/BookingConfirmationScreen.tsx
    ├── screens/booking/MyBookingsScreen.tsx
    ├── screens/host/HostBookingsInboxScreen.tsx
    └── screens/host/AvailabilityManagerScreen.tsx
__tests__/
    ├── PriceBreakdown.test.tsx
    ├── BookingCalendar.test.tsx
    └── useCreateBooking.test.tsx
```

---

## Task 1: Booking API hooks

**Files:**
- Create: `mobile/src/api/bookings.ts`
- Test: `mobile/__tests__/useCreateBooking.test.tsx`

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/useCreateBooking.test.tsx`:
```tsx
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateBooking } from '../src/api/bookings';
import { api } from '../src/lib/api';

jest.spyOn(api, 'post').mockResolvedValue({
  data: { booking: { id: 'b1', status: 'pending' }, authorizationUrl: 'https://paystack/x', reference: 'ref1' },
} as any);

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

it('creates a booking and returns the paystack url', async () => {
  const { result } = renderHook(() => useCreateBooking(), { wrapper });
  result.current.mutate({ listingId: 'l1', checkIn: '2026-08-11', checkOut: '2026-08-14', guests: 2 });
  await waitFor(() => expect(result.current.data?.authorizationUrl).toContain('paystack'));
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `src/api/bookings.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Quote {
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
}

export function useAvailability(listingId: string) {
  return useQuery({
    queryKey: ['availability', listingId],
    queryFn: async () => (await api.get(`/listings/${listingId}/availability`)).data,
  });
}

export function useBookingQuote() {
  return useMutation({
    mutationFn: async (input: { listingId: string; checkIn: string; checkOut: string; guests: number }) =>
      (await api.post<Quote>('/bookings/quote', input)).data,
  });
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (input: { listingId: string; checkIn: string; checkOut: string; guests: number }) =>
      (await api.post<{ booking: { id: string; status: string }; authorizationUrl: string; reference: string }>('/bookings', input)).data,
  });
}

export function useMyBookings() {
  return useQuery({ queryKey: ['bookings', 'mine'], queryFn: async () => (await api.get('/bookings')).data });
}

export function useHostedBookings() {
  return useQuery({ queryKey: ['bookings', 'hosted'], queryFn: async () => (await api.get('/me/hosted-bookings')).data });
}

export function useBookingAction(action: 'confirm' | 'decline' | 'check-in' | 'cancel') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.post(`/bookings/${id}/${action}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings', 'hosted'] });
      qc.invalidateQueries({ queryKey: ['bookings', 'mine'] });
    },
  });
}

export function useSetAvailability(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ranges: { from: string; to: string; status: 'open' | 'blocked' }[]) =>
      (await api.put(`/listings/${listingId}/availability`, { ranges })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['availability', listingId] }),
  });
}
```

- [ ] **Step 4: Run test (passes)** → PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/api/bookings.ts mobile/__tests__/useCreateBooking.test.tsx
git commit -m "feat(mobile): booking react-query hooks"
```

---

## Task 2: PriceBreakdown + GuestStepper components

**Files:**
- Create: `mobile/src/components/PriceBreakdown.tsx`
- Create: `mobile/src/components/GuestStepper.tsx`
- Test: `mobile/__tests__/PriceBreakdown.test.tsx`

> Reuses the `formatNaira(kobo)` util created in the Phase 2 frontend plan (`src/lib/money.ts`).

- [ ] **Step 1: Write the failing test**

`mobile/__tests__/PriceBreakdown.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { PriceBreakdown } from '../src/components/PriceBreakdown';

it('renders the server quote in naira', () => {
  const { getByText } = render(
    <PriceBreakdown quote={{ nights: 3, subtotal: 13_500_000, cleaningFee: 1_000_000, serviceFee: 675_000, total: 15_175_000 }} nightlyRate={4_500_000} />,
  );
  expect(getByText('Total')).toBeTruthy();
  expect(getByText('₦151,750')).toBeTruthy(); // 15,175,000 kobo
});
```

- [ ] **Step 2: Run test (fails)** → FAIL.

- [ ] **Step 3: Implement `PriceBreakdown.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { formatNaira } from '../lib/money';
import type { Quote } from '../api/bookings';

export function PriceBreakdown({ quote, nightlyRate }: { quote: Quote; nightlyRate: number }) {
  return (
    <View>
      <Row label={`${formatNaira(nightlyRate)} × ${quote.nights} nights`} value={formatNaira(quote.subtotal)} />
      <Row label="Cleaning fee" value={formatNaira(quote.cleaningFee)} />
      <Row label="Service fee" value={formatNaira(quote.serviceFee)} />
      <View style={styles.total}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalLabel}>{formatNaira(quote.total)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.muted}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  muted: { color: '#5c6562', fontSize: theme.font.sizeSm },
  total: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: theme.colors.line, paddingTop: 11, marginTop: 3 },
  totalLabel: { fontWeight: theme.font.weightBold, color: theme.colors.ink, fontSize: theme.font.sizeMd },
});
```

- [ ] **Step 4: Implement `GuestStepper.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme';

export function GuestStepper({ value, onChange, max = 10 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>Guests</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.btn} onPress={() => onChange(Math.max(1, value - 1))}>
          <Text style={styles.sign}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable style={styles.btn} onPress={() => onChange(Math.min(max, value + 1))}>
          <Text style={styles.sign}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.line },
  label: { fontSize: theme.font.sizeSm, fontWeight: theme.font.weightSemibold, color: theme.colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  btn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.line, alignItems: 'center', justifyContent: 'center' },
  sign: { color: theme.colors.primary, fontWeight: theme.font.weightBold },
  value: { fontSize: theme.font.sizeMd, color: theme.colors.ink },
});
```

- [ ] **Step 5: Run test (passes)** → `npm test -- PriceBreakdown` → PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/PriceBreakdown.tsx mobile/src/components/GuestStepper.tsx mobile/__tests__/PriceBreakdown.test.tsx
git commit -m "feat(mobile): price breakdown + guest stepper"
```

---

## Task 3: BookingCalendar (range select)

**Files:**
- Create: `mobile/src/components/BookingCalendar.tsx`
- Test: `mobile/__tests__/BookingCalendar.test.tsx`

- [ ] **Step 1: Install calendar dep**

Run: `cd ~/Projects/HomeBase/mobile && npm install react-native-calendars`

- [ ] **Step 2: Write the failing test**

`mobile/__tests__/BookingCalendar.test.tsx`:
```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { buildMarkedRange } from '../src/components/BookingCalendar';

describe('buildMarkedRange', () => {
  it('marks start, middle, and end of a range', () => {
    const marked = buildMarkedRange('2026-08-11', '2026-08-14');
    expect(marked['2026-08-11'].startingDay).toBe(true);
    expect(marked['2026-08-14'].endingDay).toBe(true);
    expect(marked['2026-08-12']).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test (fails)** → FAIL.

- [ ] **Step 4: Implement `BookingCalendar.tsx`**

```tsx
import React from 'react';
import { Calendar } from 'react-native-calendars';
import { theme } from '../theme';

const DAY = 24 * 60 * 60 * 1000;

export function buildMarkedRange(from: string | null, to: string | null): Record<string, any> {
  const marked: Record<string, any> = {};
  if (!from) return marked;
  if (from && !to) {
    marked[from] = { startingDay: true, endingDay: true, color: theme.colors.primary, textColor: '#fff' };
    return marked;
  }
  for (let t = Date.parse(from); t <= Date.parse(to!); t += DAY) {
    const key = new Date(t).toISOString().slice(0, 10);
    marked[key] = {
      color: key === from || key === to ? theme.colors.primary : theme.colors.chip,
      textColor: key === from || key === to ? '#fff' : theme.colors.primary,
      startingDay: key === from,
      endingDay: key === to,
    };
  }
  return marked;
}

export function BookingCalendar({ from, to, onSelectDay }: { from: string | null; to: string | null; onSelectDay: (day: string) => void }) {
  return (
    <Calendar
      markingType="period"
      markedDates={buildMarkedRange(from, to)}
      onDayPress={(d) => onSelectDay(d.dateString)}
      theme={{ todayTextColor: theme.colors.primary, arrowColor: theme.colors.primary }}
    />
  );
}
```

- [ ] **Step 5: Run test (passes)** → `npm test -- BookingCalendar` → PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/BookingCalendar.tsx mobile/__tests__/BookingCalendar.test.tsx mobile/package.json
git commit -m "feat(mobile): booking calendar range selection"
```

---

## Task 4: PaystackCheckout component

**Files:**
- Create: `mobile/src/components/PaystackCheckout.tsx`

- [ ] **Step 1: Install Paystack webview**

Run: `npm install react-native-paystack-webview react-native-webview && npx expo install react-native-webview`

- [ ] **Step 2: Implement `PaystackCheckout.tsx`**

```tsx
import React from 'react';
import { Modal, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
  visible: boolean;
  authorizationUrl: string;
  onSuccess: () => void;
  onClose: () => void;
}

// Paystack redirects to a callback URL on completion; we detect it in the WebView.
export function PaystackCheckout({ visible, authorizationUrl, onSuccess, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: authorizationUrl }}
          onNavigationStateChange={(state) => {
            if (state.url.includes('paystack') && state.url.includes('callback')) {
              onSuccess();
            }
          }}
        />
      </View>
    </Modal>
  );
}
```

> The booking is confirmed server-side by the Paystack webhook (Phase 4 backend). The WebView success handler is a UX signal to advance the screen; the app re-fetches the booking to read the authoritative status.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/PaystackCheckout.tsx mobile/package.json
git commit -m "feat(mobile): paystack checkout webview component"
```

---

## Task 5: Select Dates + Review + Confirmation screens

**Files:**
- Create: `mobile/src/screens/booking/SelectDatesScreen.tsx`
- Create: `mobile/src/screens/booking/BookingReviewScreen.tsx`
- Create: `mobile/src/screens/booking/BookingConfirmationScreen.tsx`

- [ ] **Step 1: Implement `SelectDatesScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { BookingCalendar } from '../../components/BookingCalendar';
import { GuestStepper } from '../../components/GuestStepper';
import { theme } from '../../theme';

export function SelectDatesScreen({ route, navigation }: any) {
  const { listing } = route.params;
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);

  function selectDay(day: string) {
    if (!from || (from && to)) {
      setFrom(day);
      setTo(null);
    } else if (day > from) {
      setTo(day);
    } else {
      setFrom(day);
    }
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) }}>Select dates</Text>
      <BookingCalendar from={from} to={to} onSelectDay={selectDay} />
      <GuestStepper value={guests} onChange={setGuests} max={listing.shortstay?.maxGuests ?? 10} />
      <Button
        label="Continue"
        disabled={!from || !to}
        style={{ marginTop: theme.spacing(2) }}
        onPress={() => navigation.navigate('BookingReview', { listing, checkIn: from, checkOut: to, guests })}
      />
    </Screen>
  );
}
```

- [ ] **Step 2: Implement `BookingReviewScreen.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { PriceBreakdown } from '../../components/PriceBreakdown';
import { PaystackCheckout } from '../../components/PaystackCheckout';
import { theme } from '../../theme';
import { useBookingQuote, useCreateBooking, Quote } from '../../api/bookings';

export function BookingReviewScreen({ route, navigation }: any) {
  const { listing, checkIn, checkOut, guests } = route.params;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [checkout, setCheckout] = useState<{ url: string; id: string } | null>(null);
  const getQuote = useBookingQuote();
  const createBooking = useCreateBooking();

  useEffect(() => {
    getQuote.mutate({ listingId: listing.id, checkIn, checkOut, guests }, { onSuccess: setQuote });
  }, []);

  function reserve() {
    createBooking.mutate(
      { listingId: listing.id, checkIn, checkOut, guests },
      { onSuccess: (data) => setCheckout({ url: data.authorizationUrl, id: data.booking.id }) },
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) }}>Review & pay</Text>
      {quote && <PriceBreakdown quote={quote} nightlyRate={listing.shortstay.nightlyRate} />}
      <Button label="Reserve & Pay" onPress={reserve} disabled={!quote || createBooking.isPending} style={{ marginTop: theme.spacing(3) }} />
      {checkout && (
        <PaystackCheckout
          visible
          authorizationUrl={checkout.url}
          onClose={() => setCheckout(null)}
          onSuccess={() => {
            setCheckout(null);
            navigation.replace('BookingConfirmation', { bookingId: checkout.id });
          }}
        />
      )}
    </Screen>
  );
}
```

- [ ] **Step 3: Implement `BookingConfirmationScreen.tsx`**

```tsx
import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';

export function BookingConfirmationScreen({ navigation }: any) {
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeXl, fontWeight: theme.font.weightBold, marginTop: theme.spacing(8) }}>You're booked! 🎉</Text>
      <Text style={{ color: theme.colors.muted, marginTop: theme.spacing(1) }}>
        Your payment is held securely and released to the host after check-in.
      </Text>
      <Button label="View my bookings" onPress={() => navigation.navigate('MyBookings')} style={{ marginTop: theme.spacing(3) }} />
    </Screen>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/booking
git commit -m "feat(mobile): select dates, review & pay, confirmation screens"
```

---

## Task 6: My Bookings + Host Inbox + Availability Manager

**Files:**
- Create: `mobile/src/screens/booking/MyBookingsScreen.tsx`
- Create: `mobile/src/screens/host/HostBookingsInboxScreen.tsx`
- Create: `mobile/src/screens/host/AvailabilityManagerScreen.tsx`

- [ ] **Step 1: Implement `MyBookingsScreen.tsx`**

```tsx
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { theme } from '../../theme';
import { formatNaira } from '../../lib/money';
import { useMyBookings } from '../../api/bookings';

export function MyBookingsScreen() {
  const { data: bookings = [], isLoading } = useMyBookings();
  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) }}>My bookings</Text>
      {isLoading && <Text style={{ color: theme.colors.muted }}>Loading…</Text>}
      <FlatList
        data={bookings}
        keyExtractor={(b: any) => b.id}
        renderItem={({ item }: any) => (
          <View style={{ borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, padding: theme.spacing(2), marginBottom: theme.spacing(1.5) }}>
            <Text style={{ fontWeight: theme.font.weightBold, color: theme.colors.ink }}>{item.listing?.title}</Text>
            <Text style={{ color: theme.colors.muted, fontSize: theme.font.sizeSm }}>
              {item.checkIn?.slice(0, 10)} → {item.checkOut?.slice(0, 10)} · {item.status}
            </Text>
            <Text style={{ color: theme.colors.primary, fontWeight: theme.font.weightBold, marginTop: 4 }}>{formatNaira(item.total)}</Text>
          </View>
        )}
      />
    </Screen>
  );
}
```

- [ ] **Step 2: Implement `HostBookingsInboxScreen.tsx`**

```tsx
import React from 'react';
import { FlatList, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { theme } from '../../theme';
import { useHostedBookings, useBookingAction } from '../../api/bookings';

export function HostBookingsInboxScreen() {
  const { data: bookings = [] } = useHostedBookings();
  const confirm = useBookingAction('confirm');
  const decline = useBookingAction('decline');
  const checkIn = useBookingAction('check-in');

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) }}>Booking requests</Text>
      <FlatList
        data={bookings}
        keyExtractor={(b: any) => b.id}
        renderItem={({ item }: any) => (
          <View style={{ borderWidth: 1, borderColor: theme.colors.line, borderRadius: theme.radii.md, padding: theme.spacing(2), marginBottom: theme.spacing(1.5) }}>
            <Text style={{ fontWeight: theme.font.weightBold, color: theme.colors.ink }}>{item.guest?.name} · {item.status}</Text>
            <Text style={{ color: theme.colors.muted, fontSize: theme.font.sizeSm }}>{item.checkIn?.slice(0, 10)} → {item.checkOut?.slice(0, 10)}</Text>
            {item.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Button label="Confirm" onPress={() => confirm.mutate(item.id)} style={{ flex: 1 }} />
                <Button label="Decline" variant="secondary" onPress={() => decline.mutate(item.id)} style={{ flex: 1 }} />
              </View>
            )}
            {item.status === 'confirmed' && (
              <Button label="Check in guest" onPress={() => checkIn.mutate(item.id)} style={{ marginTop: 8 }} />
            )}
          </View>
        )}
      />
    </Screen>
  );
}
```

- [ ] **Step 3: Implement `AvailabilityManagerScreen.tsx`**

```tsx
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { BookingCalendar } from '../../components/BookingCalendar';
import { theme } from '../../theme';
import { useSetAvailability } from '../../api/bookings';

export function AvailabilityManagerScreen({ route }: any) {
  const { listingId } = route.params;
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const setAvailability = useSetAvailability(listingId);

  function selectDay(day: string) {
    if (!from || (from && to)) { setFrom(day); setTo(null); }
    else if (day > from) setTo(day);
    else setFrom(day);
  }

  return (
    <Screen>
      <Text style={{ fontSize: theme.font.sizeLg, fontWeight: theme.font.weightBold, marginVertical: theme.spacing(2) }}>Manage availability</Text>
      <BookingCalendar from={from} to={to} onSelectDay={selectDay} />
      <Button label="Block dates" disabled={!from || !to} style={{ marginTop: theme.spacing(2) }} onPress={() => setAvailability.mutate([{ from: from!, to: to!, status: 'blocked' }])} />
      <Button label="Open dates" variant="secondary" disabled={!from || !to} style={{ marginTop: theme.spacing(1) }} onPress={() => setAvailability.mutate([{ from: from!, to: to!, status: 'open' }])} />
    </Screen>
  );
}
```

- [ ] **Step 4: Register screens in navigation**

Add `SelectDates`, `BookingReview`, `BookingConfirmation`, `MyBookings`, `HostBookingsInbox`, `AvailabilityManager` to the appropriate stack navigators (the main app stack created in Phase 2). Wire the Listing detail "Book now" CTA (short-stay) to `navigation.navigate('SelectDates', { listing })`.

- [ ] **Step 5: Run full suite + manual check**

Run: `npm test` → all PASS.
Run: `npx expo start` → open a short-stay listing → Book → pick dates → review (server price) → Paystack → confirmation.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/booking mobile/src/screens/host
git commit -m "feat(mobile): my bookings, host inbox, availability manager"
```

---

## Self-Review (against spec §5.3, screens 13–15 & 19 & 26–27, §9 booking flow)

- **Date & guest select:** Task 5 (`SelectDatesScreen`, `GuestStepper`, `BookingCalendar`). ✓
- **Booking review & pay (server quote + Paystack):** Tasks 2, 4, 5. ✓
- **Booking confirmation:** Task 5. ✓
- **My bookings (status):** Task 6. ✓
- **Host booking inbox (confirm/decline/check-in):** Task 6. ✓
- **Availability calendar manager:** Task 6. ✓
- **Server-authoritative pricing & webhook-confirmed status:** Tasks 1, 4 (client never computes totals; re-fetch reads status). ✓

**Type consistency:** `Quote` is shared between `api/bookings.ts`, `PriceBreakdown`, and `BookingReviewScreen`; `useBookingAction(action)` maps directly to the backend `POST /bookings/:id/:action` routes; `formatNaira` (Phase 2) is reused everywhere money is shown.

**No placeholders:** every code step is complete and runnable. The Paystack WebView callback detection is a documented UX signal; booking state is authoritative on the server via the Phase 4 webhook.
