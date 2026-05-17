# DateUsher App Review Notes

Use this note for App Store / Google Play review. Replace the placeholders below with the real test account before submitting.

## Test Accounts

### User Test Account

- Email: `ADD_USER_TEST_EMAIL_HERE`
- Password: `ADD_USER_TEST_PASSWORD_HERE`
- OTP: `ADD_USER_TEST_OTP_OR_NOTE_HERE`

### Admin Test Account

- Admin URL: `ADD_ADMIN_URL_HERE`
- Email: `ADD_ADMIN_TEST_EMAIL_HERE`
- Password: `ADD_ADMIN_TEST_PASSWORD_HERE`
- OTP: `ADD_ADMIN_TEST_OTP_OR_NOTE_HERE`

If OTP is required during review, please use the test OTP above or contact us through the review message thread so we can assist promptly.

## App Overview

DateUsher is a dating and date-planning app where users create "Specs" describing the kind of date or connection they want. Other users can apply to join a Spec, answer round questions, and the Spec owner can narrow participants down through rounds. When a final participant remains, the app creates a match/date and opens chat between the two users.

The app also includes provider discovery and voucher booking features so users can explore date-friendly venues and experiences.

## Main User Flows To Review

1. Create account or log in.
2. Complete profile setup.
3. Browse Specs on the home screen.
4. Create a Spec.
5. Join another user's Spec.
6. As Spec owner, accept participants.
7. Start a round and ask a question.
8. As participant, submit an answer, including optional media.
9. As Spec owner, review answers, nudge participants, eliminate participants, and continue rounds.
10. Accept the last remaining participant to create a date.
11. Open the match/date chat.
12. Browse providers and vouchers.
13. Open Settings for support, safety, legal pages, and onboarding help.

## Moderation And Safety

DateUsher includes safety and moderation tools throughout the app:

- Users can report profiles, Specs, chat messages, chat media, round answers, provider profiles, provider reviews, and unsafe behavior.
- Users can block other users from chat safety controls.
- Reported messages and media are preserved from automated chat pruning/archive deletion workflows.
- Uploaded shared media is checked before it can be sent or displayed.
- Suspended or restricted accounts are blocked from key actions such as sending chat messages, creating Specs, or uploading media.
- Support tickets are available from the app for user help and safety follow-up.

## Chat And Archived Messages

Recent chat messages load from the main chat database. Older safe chat messages can be archived by the backend to storage and removed from the hot chat table to keep performance stable. When users scroll backward, older archived chunks can be loaded through the app API. The mobile app does not access archive storage directly; the backend authorizes each request first.

## Purchases And RevenueCat

Credit top-up is designed to use RevenueCat with Apple and Google in-app purchases. For the current review/testing build, if live RevenueCat keys and store products are not yet enabled, the top-up screen may show that purchases are unavailable. Core non-payment app flows can still be reviewed.

Before public release, RevenueCat iOS and Android public SDK keys and matching store products will be configured.

## Notes For Reviewer

- Please use the provided test account above.
- If you need a second test user to review matching/chat flows, add details here:
  - Second Email: `ADD_SECOND_TEST_EMAIL_HERE`
  - Second Password: `ADD_SECOND_TEST_PASSWORD_HERE`
- Some flows, such as full matching and chat, may require two users or pre-created test data.
- Push notifications may depend on device permissions and environment configuration.
