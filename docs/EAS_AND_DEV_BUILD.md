# Expo Development Build & EAS – Do You Need Them?

## Short answers

| Question | Answer |
|----------|--------|
| **Do I need an Expo account to run a development build?** | **Yes** – if you use **EAS Build** (cloud) to create the dev build. A **free** Expo account is enough. |
| **Do I need an `eas.json` file?** | **Yes** – if you use **EAS Build** (e.g. `eas build`). It’s created when you run `eas build:configure`, or you can add it manually. |

---

## Two ways to run your app in development

### Option A: Expo Go (no account, no EAS)

- Run: `npx expo start`
- Scan QR with Expo Go on your device.
- **No Expo account**, **no `eas.json`**, **no EAS**.
- Limitation: only works with libraries that are supported in Expo Go (no custom native code).

### Option B: Development build (custom native code / “full” app)

- You build your **own** app binary (like a custom Expo Go) that includes your JS + any native modules.
- To create that binary with **EAS Build** (recommended):
  - You **need an Expo account** (free is fine).
  - You **need** EAS configured, which includes an **`eas.json`** file (created by `eas build:configure` or added by hand).

---

## Steps to use a development build with EAS

### 1. Create an Expo account (free)

- Sign up: https://expo.dev/signup

### 2. Install EAS CLI

```bash
npm install -g eas-cli
```

### 3. Log in

```bash
eas login
```

### 4. Add a dev client to the project

```bash
cd specdate-mobile
npx expo install expo-dev-client
```

### 5. Create / configure `eas.json`

Either let EAS create it:

```bash
eas build:configure
```

This adds an `eas.json` at the project root with build profiles (e.g. `development`, `preview`, `production`).

Or use the `eas.json` already in this project (see repo root).

### 6. Create a development build

**Android (simulator or device):**

```bash
eas build --profile development --platform android
```

**iOS (needs Apple Developer account for device; simulator possible in some setups):**

```bash
eas build --profile development --platform ios
```

### 7. Install the build and run the dev server

- Download/install the built `.apk` (Android) or install the iOS build on device/simulator.
- Start the dev server: `npx expo start --dev-client`
- Open the app on the device; it will connect to the dev server.

---

## What is `eas.json`?

- **Purpose:** Config for **EAS Build** (and EAS Submit). Tells EAS how to build your app (which profile, platform, credentials, etc.).
- **Location:** Project root (e.g. `specdate-mobile/eas.json`).
- **When you need it:** Whenever you run `eas build` or use EAS Submit. Not needed for `npx expo start` with Expo Go only.
- **Typical content:** Build profiles (`development`, `preview`, `production`) and optionally submit/config sections. A minimal example is in this repo.

---

## Summary

- **Expo account:** Required **only** if you use EAS (e.g. to create a development build in the cloud). Free tier is enough.
- **`eas.json`:** Required **only** when you use EAS Build (and useful for EAS Submit). Create it with `eas build:configure` or use the one in the repo.
- **Development build:** Needed when you use native code or config that Expo Go doesn’t support; then you need account + `eas.json` + `eas build` (and usually `expo-dev-client`).
