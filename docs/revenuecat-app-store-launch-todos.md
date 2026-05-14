# RevenueCat, Store Launch, And Remaining Pre-Submission TODOs

Last updated: 2026-05-14

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

## RevenueCat Product IDs

Use the backend-seeded product IDs everywhere:

| Product ID | Credits |
| --- | ---: |
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

## iOS App Store Connect Setup

1. Confirm bundle ID matches the iOS app configured in RevenueCat.
2. Confirm Apple Paid Applications Agreement, tax, and banking are complete.
3. Enable In-App Purchase capability in the iOS app target/build setup.
4. In App Store Connect, create consumable in-app purchases:
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
   - `REVENUECAT_IOS_API_KEY`
   - `REVENUECAT_ANDROID_API_KEY`
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

1. Add a RevenueCat webhook endpoint as a fallback for purchase events.
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
   - admin enters email/password
   - backend verifies credentials
   - backend sends email OTP
   - admin submits OTP before receiving dashboard token/session
   - rate-limit OTP requests and attempts
   - expire OTPs quickly
   - log failed attempts for risk review
2. Remove email OTP from mobile user registration:
   - mobile registration should be phone-first
   - phone OTP becomes the primary verification path
   - email can remain optional or later verified from profile/settings
3. Limit one user creating many accounts:
   - enforce unique phone numbers
   - reject blacklisted phone numbers
   - keep device fingerprint capture active
   - flag repeated registrations from the same device/IP
   - route suspicious patterns into admin risk review
4. Keep provider web registration separate:
   - provider registration can continue using email OTP because it starts from web/business onboarding
   - provider approval still sends password setup email after admin review
5. Add tests:
   - admin cannot log in without OTP
   - admin OTP expires
   - wrong admin OTP is rejected
   - user mobile registration requires phone OTP
   - duplicate phone registration is blocked
   - suspicious duplicate device/IP registrations create a risk signal

## Web TODO

1. Add Contact Us page:
   - contact form
   - support email
   - provider inquiry path
   - privacy/safety links
2. Improve public provider pages:
   - real provider imagery
   - polished city/category layout
   - clearer voucher/date value proposition
   - stronger mobile responsive design
3. Add stronger production web aesthetics:
   - less placeholder feel
   - real provider cards
   - trust/safety signals
   - app download CTAs

## Suggested Next Work Order

1. Finish RevenueCat mobile integration.
2. Configure iOS products in App Store Connect.
3. Configure Android products in Google Play Console.
4. Import/map products in RevenueCat.
5. Test sandbox purchases end to end.
6. Add RevenueCat webhook fallback.
7. Add admin login email OTP.
8. Move mobile user registration to phone-first OTP and remove email OTP from that flow.
9. Add duplicate-account risk controls for phone/device/IP.
10. Add Contact Us web page.
11. Polish real provider public web pages.
12. Do final App Store/Play Store pre-submission pass.
