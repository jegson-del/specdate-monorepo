# Specdate Mobile – Expo Deployment Guide (Beginner-Friendly)

This guide walks you through **development builds** now and **Play Store / App Store** when you're ready. Everything is already configured in this project.

---

## What’s already configured

- **expo-dev-client** – for development builds
- **app.json** – `bundleIdentifier` (iOS) and `package` (Android) set for store submission
- **eas.json** – three build profiles + submit profile

---

## One-time setup

### 1. Install EAS CLI and log in

```bash
npm install -g eas-cli
eas login
```

Use your Expo account (e.g. **jegedetayo**). Free plan is enough.

### 2. Install dependencies (including dev client)

From the `specdate-mobile` folder:

```bash
npm install
```

### 3. Link the project to your Expo account (first time only)

```bash
eas build:configure
```

If it asks to create/overwrite `eas.json`, you can keep the existing one (it’s already set up).

---

## Part 1: Development build (use this now)

A **development build** is your own app binary that connects to your dev server. Use it for day-to-day coding and testing (including native modules Expo Go doesn’t support).

### Create the build

**Android (recommended to start):**

```bash
eas build --profile development --platform android
```

**iOS (needs Apple Developer account for a real device):**

```bash
eas build --profile development --platform ios
```

- Build runs on Expo’s servers. You’ll get a link in the terminal and in [expo.dev](https://expo.dev) → your project → Builds.
- **Android:** download the `.apk` and install on your device or emulator.
- **iOS:** install via the link (or TestFlight if you set it up).

### Run the app in dev

1. Start the dev server:

   ```bash
   npx expo start --dev-client
   ```

2. Open the **development build** app on your device (not Expo Go).
3. It will connect to the dev server (scan QR or enter URL if prompted).

You can push new JS/UI changes by saving files; the dev client reloads. When you change native code or `app.json`/plugins, create a new development build.

---

## Part 2: Play Store (when you’re ready)

### Before you start

- Google Play Developer account ([play.google.com/console](https://play.google.com/console)) – one-time fee.
- App listing created in Play Console (name, description, screenshots, etc.).

### Build for production

```bash
eas build --profile production --platform android
```

This produces an **AAB** (Android App Bundle), which is what Play Store expects.

### Submit to Play Store

**Option A – Use the last production build**

```bash
eas submit --platform android --latest
```

**Option B – Submit a specific build**

```bash
eas submit --platform android --id <build-id>
```

(`build-id` is in the build URL or in expo.dev → Builds.)

### First-time Android note

The first time you submit an app to Play Console, you may need to create the app and upload the first build (or AAB) manually. After that, `eas submit` can use the same app and upload new builds.

To send to **internal testers** first, in `eas.json` under `submit.production.android` you can set:

```json
"track": "internal"
```

Then use `alpha`, `beta`, or `production` when you’re ready for broader or public release.

---

## Part 3: App Store / iOS (when you’re ready)

### Before you start

- **Apple Developer Program** ([developer.apple.com](https://developer.apple.com)) – yearly fee.
- App created in **App Store Connect** with name, bundle ID, etc.

### Set your App Store Connect App ID

1. In [App Store Connect](https://appstoreconnect.apple.com) → Your App → App Information, copy the **Apple ID** (numeric, e.g. `1234567890`).
2. In `specdate-mobile/eas.json`, under `submit.production.ios`, replace the placeholder:

   ```json
   "ios": {
     "ascAppId": "1234567890"
   }
   ```

### Build for production

```bash
eas build --profile production --platform ios
```

EAS will prompt for Apple credentials (or use a stored Apple Distribution certificate and provisioning profile). The result is an **IPA** for App Store Connect.

### Submit to App Store Connect

```bash
eas submit --platform ios --latest
```

The build will appear in App Store Connect → TestFlight (and can be submitted for App Review when you’re ready). You still need to complete metadata, screenshots, and submit for review in App Store Connect.

---

## Quick reference: commands

| Goal                     | Command |
|--------------------------|--------|
| Dev build (Android)      | `eas build --profile development --platform android` |
| Dev build (iOS)          | `eas build --profile development --platform ios` |
| Run app in dev            | `npx expo start --dev-client` |
| Production build (Android) | `eas build --profile production --platform android` |
| Production build (iOS)    | `eas build --profile production --platform ios` |
| Submit Android (latest)   | `eas submit --platform android --latest` |
| Submit iOS (latest)       | `eas submit --platform ios --latest` |

---

## What each build profile is for

| Profile       | Use case |
|---------------|----------|
| **development** | Daily coding; connects to dev server; includes dev tools. |
| **preview**     | Internal testing; Android gets an APK; optional channel for EAS Update. |
| **production**  | Store builds: AAB for Play, IPA for App Store; `autoIncrement` bumps version. |

---

## If something goes wrong

- **“Not logged in”** → Run `eas login`.
- **“Project not configured”** → Run `eas build:configure` in `specdate-mobile`.
- **iOS build asks for credentials** → Have your Apple ID and team ready; EAS can store them for next time.
- **Submit fails** → Ensure the app (and first build for Android) exists in Play Console / App Store Connect and that `ascAppId` (iOS) is set in `eas.json`.

For more: [Expo EAS Build](https://docs.expo.dev/build/introduction/), [EAS Submit](https://docs.expo.dev/submit/introduction/).
