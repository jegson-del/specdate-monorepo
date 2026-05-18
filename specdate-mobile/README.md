# DateUsher Mobile

Expo/React Native app for DateUsher users and providers.

## Local Setup

```bash
npm install
cp .env.example .env
npm run start
```

For native dev clients:

```bash
npm run ios
npm run android
```

## Verification

```bash
npm run typecheck
npm test
```

## Environment

Use the dev API URL while running locally and the production API URL for release builds:

```dotenv
EXPO_PUBLIC_API_URL_DEV=http://YOUR_LAN_IP:8001
EXPO_PUBLIC_API_URL_PRODUCTION=https://dateusher.org
```

RevenueCat and Pusher client keys are public SDK keys, but they should still live in env files rather than source code.

Never put backend secrets, Pusher secrets, RevenueCat secret API keys, AWS keys, or mail credentials in the mobile app.

## Repo Split Checklist

- Keep `package.json`, `package-lock.json`, `app.json`, `eas.json`, TypeScript/Babel/Metro configs, `src`, `assets`, and `.env.example`.
- Keep native folders only if the split repo owns prebuild/native changes.
- Do not commit `.env`, `.expo`, `node_modules`, or local build output.
- After splitting, run `npm install`, `npm run typecheck`, and `npm test` when needed.
