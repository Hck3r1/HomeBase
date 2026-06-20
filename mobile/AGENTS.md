# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Phase 1 (auth + setup) — complete

- Auth screens: splash, walkthrough, sign up, log in, forgot/reset password
- Post-auth setup wizard: profile → role → preferences → KYC intro (listers)
- Secure token storage, session hydrate, automatic token refresh on 401
- Catalog options loaded from `GET /catalog/setup-options`
- Social login buttons shown on sign-up/log-in; native SDK integration deferred (backend `/auth/social` ready)

Set `EXPO_PUBLIC_API_URL` in `.env` to your machine's LAN IP when testing on a device.
