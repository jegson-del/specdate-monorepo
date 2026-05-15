# RevenueCat, Store Launch, And Remaining Pre-Submission TODOs

Last updated: 2026-05-15

## Current Status

Moderation and admin safety work is now in a strong App Store readiness position:

- Media moderation, strike/ban, appeals, case management, reports, upload moderation, and admin queues are covered.
- Mobile appeal/account status discovery has been added.
- Admin Financials now has separate Voucher and Credit pages with pagination.
- Admin financial access and Admin Management access are gated through `admin_accesses`.
- Credit backend base already exists:
  - `credit_products`
  - `user_balances.credits`
  - `user_transactions`
  - `GET /api/credits/products`
  - `POST /api/credits/grant`
  - `revenue_cat_transaction_id` idempotency

The biggest remaining launch areas are:

- RevenueCat production setup and mobile purchase UI.
- App Store Connect and Google Play product setup.
- Admin login email OTP and phone-first mobile registration cleanup.
- Web Contact Us page.
- Real provider-facing public web polish and aesthetics.

## Aligned Execution Board

Work through these phases in order. Items marked **External** need dashboard/store access and cannot be completed purely from the repo. Items marked **Repo** can be implemented here.

### Phase 1 - RevenueCat Purchase Path

- [x] **Repo:** Install and configure `react-native-purchases` in the mobile app.
- [x] **Repo:** Add public RevenueCat SDK env values for iOS and Android mobile builds.
- [x] **Repo:** Initialize RevenueCat after auth/app boot using the logged-in backend user id.
- [x] **Repo:** Add mobile API helpers for `GET /api/credits/products`, `POST /api/credits/grant`, and balance refresh.
- [x] **Repo:** Build the Top Up Credits UI from backend credit products plus RevenueCat offerings.
- [x] **Repo:** Wire successful purchases to backend credit granting with idempotency handling.
- [x] **Repo:** Add restore purchases and purchase error states.
- [x] **External:** Create/import matching RevenueCat Test Store products and offering.
- [ ] **External:** Confirm iOS and Android RevenueCat public SDK keys.

### Phase 2 - Store Product Setup

- [ ] **External:** Create iOS consumable IAPs in App Store Connect.
- [ ] **External:** Create Android one-time products in Google Play Console.
- [ ] **External:** Connect App Store Connect and Google Play products to RevenueCat.
- [ ] **External:** Confirm offerings return products on sandbox/TestFlight/internal testing builds.

### Phase 3 - Backend Purchase Hardening

- [x] **Repo:** Add backend tests for credit product lookup, invalid product ids, duplicate transaction ids, and missing balance recovery.
- [x] **Repo:** Decide and enforce transaction id uniqueness scope.
- [x] **Repo:** Store richer RevenueCat metadata on credit transactions.
- [ ] **Repo deferred:** Verify purchase ownership server-side after RevenueCat platform/API credentials are available.
- [ ] **Repo optional:** Add RevenueCat webhook fallback on `dateusher.org` only.

### Phase 4 - Auth And Account Integrity

- [x] **Repo:** Add email OTP step to admin login.
- [x] **Repo:** Move mobile registration to phone-first OTP.
- [x] **Repo:** Keep provider web registration on email OTP.
- [x] **Repo:** Add duplicate account controls for phone/device/IP risk.
- [x] **Repo:** Add auth/account integrity tests.

### Phase 5 - Web Launch Polish

- [x] **Repo:** Add Contact Us page with support and provider inquiry paths.
- [x] **Repo:** Improve public provider browse/detail pages using real backend provider data.
- [ ] **Repo:** Polish public web visuals and app download CTAs.

### Phase 6 - Final Release QA

- [ ] **Manual QA:** Sandbox purchase happy path and duplicate grant path.
- [ ] **Manual QA:** Moderation, appeals, account status, and notification routes on device.
- [ ] **Manual QA:** Provider dashboard media upload/edit flows.
- [ ] **Manual QA:** Admin dashboard reports, cases, appeals, media moderation, financials, and admin management.
- [ ] **Manual QA:** Prepare App Store / Play Store review notes and test accounts.

## RevenueCat Product IDs

Use the backend-seeded product IDs everywhere:

| Product ID | Credits |
| --- | ---: |
| `specdate_credits_1` | 1 |
| `specdate_credits_3` | 3 |
| `specdate_credits_5` | 5 |
| `specdate_credits_10` | 10 |

These IDs must match exactly in:

- App Store Connect
- Google Play Console
- RevenueCat Products
- Mobile purchase code
- Backend `credit_products`

## RevenueCat Dashboard Setup

1. Create or open the RevenueCat project for DateUsher/SpecDate.
2. Add separate apps/providers for iOS and Android.
3. Copy the platform-specific public SDK keys:
   - iOS key for iOS builds
   - Android key for Android builds
4. Do not put RevenueCat secret keys in the mobile app.
5. Add/import the products:
   - `specdate_credits_1`
   - `specdate_credits_3`
   - `specdate_credits_5`
   - `specdate_credits_10`
6. Create an Offering, for example `default`.
7. Add packages for the credit packs. For consumables, use custom package identifiers if the preset durations do not fit.
8. Attach the iOS and Android product for each equivalent package.
9. Confirm offerings return products in RevenueCat dashboard before mobile testing.

Official references:

- RevenueCat product configuration: https://www.revenuecat.com/docs/offerings/products-overview
- RevenueCat offerings: https://www.revenuecat.com/docs/offerings/overview
- RevenueCat SDK configuration: https://www.revenuecat.com/docs/getting-started/configuring-sdk
- RevenueCat API keys: https://www.revenuecat.com/docs/projects/authentication
- RevenueCat React Native SDK: https://www.revenuecat.com/docs/getting-started/installation/reactnative

## RevenueCat Key Rules

- Local Expo/dev testing -> `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=test_...`
- TestFlight iOS testing -> `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...`
- Google Play internal testing -> `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_...`
- App Review / production -> `appl_...` for iOS and `goog_...` for Android

Never submit a TestFlight, Google Play, App Review, or production build with the Test Store `test_...` key. The mobile code only uses the Test Store key while `__DEV__` is true; release builds require the platform-specific keys.

## iOS App Store Connect Setup

1. Confirm bundle ID matches the iOS app configured in RevenueCat.
2. Confirm Apple Paid Applications Agreement, tax, and banking are complete.
3. Enable In-App Purchase capability in the iOS app target/build setup.
4. In App Store Connect, create consumable in-app purchases:
   - `specdate_credits_1`
   - `specdate_credits_3`
   - `specdate_credits_5`
   - `specdate_credits_10`
5. Add product display names, descriptions, screenshots/review metadata, and prices.
6. Make sure each product is available in the target countries.
7. Import or manually add the exact product IDs in RevenueCat.
8. Test with sandbox/TestFlight.
9. Before first App Store submission, include the IAPs with the app version review if Apple requires it.

Official reference:

- RevenueCat iOS/App Store product setup: https://www.revenuecat.com/docs/getting-started/entitlements/ios-products

## Android Google Play Setup

1. Confirm Android package name matches the Android app configured in RevenueCat.
2. Add Google Play billing permission/build support if not already present.
3. In Google Play Console, create one-time products/managed products:
   - `specdate_credits_1`
   - `specdate_credits_3`
   - `specdate_credits_5`
   - `specdate_credits_10`
4. Set prices and activate the products.
5. Configure testers/license testing.
6. Connect Google Play to RevenueCat.
7. Import or manually add products in RevenueCat.
8. Verify the RevenueCat offering returns products on an internal test build.

RevenueCat notes:

- React Native setup requires Android billing permission.
- Hybrid SDKs need separate platform API keys.
- For Google products, RevenueCat product mapping may require the correct product/base-plan style depending on product type.

## Mobile Implementation TODO

Current mobile profile credit purchase path still appears placeholder-ish. Implement:

1. Install/configure `react-native-purchases` if not already installed.
2. Add environment/config values:
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
3. Initialize RevenueCat once after auth/app boot with the platform-specific public SDK key.
4. Use the app user ID as RevenueCat app user ID so purchases map to the backend user.
5. Fetch backend products from `GET /api/credits/products`.
6. Fetch RevenueCat offerings.
7. Match offering products to backend `product_id`.
8. Build a Top Up Credits screen/modal:
   - credit quantity
   - localized price from RevenueCat
   - purchase button
   - restore purchases action if needed
9. On successful purchase, call `POST /api/credits/grant` with:
   - `product_id`
   - `revenue_cat_transaction_id`
   - `platform`
   - `currency`
   - `amount`
10. Refresh balance and transaction history after grant succeeds.
11. Handle edge states:
   - products unavailable
   - purchase cancelled
   - pending/deferred purchase
   - purchase succeeded but backend grant failed
   - duplicate grant returns OK without double crediting

## Backend TODO

The backend base is good, but before production we should harden:

1. Optional: add a RevenueCat webhook endpoint as a fallback for purchase events. If enabled, configure the RevenueCat dashboard webhook URL to the backend/API domain, for example `https://dateusher.org/api/...`, not the frontend domain.
2. Verify purchase ownership server-side if possible before granting credits.
3. Store more RevenueCat metadata on `user_transactions.metadata`:
   - store/platform
   - store transaction identifier
   - RevenueCat app user ID
   - environment/sandbox flag
4. Add tests for:
   - duplicate transaction IDs across users
   - invalid product IDs
   - missing balance row recovery
   - webhook idempotency once added
5. Confirm `revenue_cat_transaction_id` has a DB uniqueness strategy if product flow requires global idempotency.

Completed repo hardening:

- `revenue_cat_transaction_id` is globally unique for non-null purchase rows.
- Same-user duplicate grants are idempotent.
- Cross-user duplicate grants are blocked.
- Credit grants recover missing balance rows.
- Credit grant metadata now stores product, platform, store, store transaction id, RevenueCat app user id, environment, and sandbox flag when provided.

## App Store Readiness TODO

1. Run through moderation flows on device:
   - image upload flagged
   - video upload reviewing
   - appeal submission
   - account status page
2. Verify all required mobile notification routes still work.
3. Verify provider dashboard upload/edit icons.
4. Verify admin dashboard:
   - reports
   - cases
   - appeals
   - upload moderation
   - financial vouchers
   - financial credits
   - admin management
5. Prepare App Store review notes explaining:
   - moderation flow
   - paid credit packs
   - how to test a purchase
   - test account credentials

## Auth And Account Integrity TODO

Before launch, tighten registration and admin access flows:

1. Add email OTP to admin login:
   - [x] admin enters email/password
   - [x] backend verifies credentials
   - [x] backend sends email OTP
   - [x] admin submits OTP before receiving dashboard token/session
   - [x] rate-limit OTP requests and attempts
   - [x] expire OTPs quickly
   - [x] log failed attempts for risk review
2. Remove email OTP from mobile user registration:
   - [x] mobile registration should be phone-first
   - [x] phone OTP becomes the primary verification path
   - [x] email is still collected, but no longer used as the mobile registration OTP path
3. Limit one user creating many accounts:
   - [x] enforce unique phone numbers
   - [x] reject blacklisted phone numbers
   - [x] keep device fingerprint capture active
   - [x] flag repeated registrations from the same device/IP
   - [x] route suspicious patterns into admin risk review
4. Keep provider web registration separate:
   - [x] provider registration can continue using email OTP because it starts from web/business onboarding
   - [x] provider approval still sends password setup email after admin review
5. Add tests:
   - [x] admin cannot log in without OTP
   - [x] admin OTP expires
   - [x] wrong admin OTP is rejected
   - [x] user mobile registration requires phone OTP
   - [x] email OTP is rejected for mobile user registration
   - [x] provider web registration still requires valid email OTP
   - [x] duplicate phone registration is blocked
   - [x] suspicious duplicate device/IP registrations create a risk signal

## Web TODO

1. Add Contact Us page:
   - [x] contact form
   - [x] support email
   - [x] provider inquiry path
   - [x] privacy/safety links
   - [x] backend public contact endpoint with anti-spam challenge
   - [x] admin contact management module with access control, pagination, thread replies, and delete
2. Improve public provider pages:
   - [x] real provider imagery
   - [x] polished city/category layout
   - [x] clearer voucher/date value proposition
   - [x] stronger mobile responsive design
3. Add stronger production web aesthetics:
   - less placeholder feel
   - real provider cards
   - trust/safety signals
   - app download CTAs

## Suggested Next Work Order

1. Complete Phase 1 repo work until a sandbox purchase can call `POST /api/credits/grant`.
2. Complete Phase 2 external store/RevenueCat setup.
3. Run sandbox purchases end to end on iOS and Android.
4. Complete Phase 3 backend hardening before launch traffic.
5. Complete Phase 4 account integrity work.
6. Complete Phase 5 public web launch polish.
7. Complete Phase 6 final release QA and review notes.
