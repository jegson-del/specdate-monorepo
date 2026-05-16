# Next Session: Refactor And Test Deployment Plan

Use this when we resume after the break. Keep the work feature-by-feature and follow `docs/AGENTS.md`: thin controllers, service-led backend logic, focused frontend components, shared hooks/types, and no new bloated files.

## 1. First Sanity Pass

- Run `git status` and separate current intended work from unrelated dirty files.
- Run the quick checks before changing more code:
  - Backend targeted tests around recently touched modules.
  - Mobile `npx tsc --noEmit`.
  - Web build if any web-facing changes are touched.
- Confirm local backend migrations are up to date, especially the user profile `country_code` migration.

## 2. Refactor Path: Mobile First

Start with the largest mobile feature files because they are becoming the hardest to safely change.

### Specs Feature

Target files:
- `specdate-mobile/src/features/specs/SpecDetailsScreen.tsx`
- `specdate-mobile/src/features/specs/RoundDetailsScreen.tsx`

Refactor into:
- `hooks/useSpecDetailsState.ts` for derived state such as owner, participants, status, permissions.
- `hooks/useRoundDetailsState.ts` for round selection, participant visibility, and computed answer state.
- `components/SpecHero.tsx`
- `components/SpecRoundsList.tsx`
- `components/SpecParticipantsList.tsx`
- `components/SpecFooterActions.tsx`
- shared `specStatus.ts` stays as the single spec status mapping source.

Acceptance:
- No behavior change.
- Completed specs still show as closed.
- Last man standing flow still creates date and updates UI.
- Round reviewing/completed labels stay correct.

### Chat Feature

Target files:
- `specdate-mobile/src/features/chat/ChatThreadScreen.tsx`
- `specdate-mobile/src/services/chat.ts`

Refactor into:
- `hooks/useChatThread.ts` for fetching, cache updates, read state.
- `hooks/useSendChatMessage.ts` for text/media sending.
- `hooks/useChatRealtime.ts` for Echo subscription.
- `components/ChatHeader.tsx`
- `components/MessageComposer.tsx`
- `components/ArchivedMessagesBoundary.tsx` later, once archive API exists.

Acceptance:
- Existing chat send/read/realtime behavior unchanged.
- Media moderation flow unchanged.
- Component file becomes easier to test.

## 3. Test Deployment Readiness

Work through these before TestFlight / Google Play internal testing:

- RevenueCat:
  - Local/dev uses `test_...`.
  - TestFlight uses iOS `appl_...`.
  - Google internal testing uses Android `goog_...`.
  - Confirm products exist in RevenueCat and match backend `credit_products`.
- Twilio:
  - Replace test credentials with production credentials in Forge/env when ready.
  - Verify OTP sender and rate limits.
- Legal:
  - Privacy policy and terms live on `dateusher.com`.
  - Store privacy/data safety labels match policy exactly.
- Backend:
  - Forge env values set.
  - Scheduler configured.
  - Queue worker configured.
  - Mail SMTP/IMAP values configured, without exposing passwords in docs.
- Mobile:
  - `app.json` version reviewed.
  - Backend app version env updated after build version is chosen.
  - Store URLs added after App Store / Play Store app IDs are available.

## 4. Chat Archive Design Track

Goal: old chat messages older than 1 month should be archived to S3 as plain text, tracked in a database table, removed from the hot `chat_messages` table when safe, and loaded back when a user scrolls far backward.

Important existing code:
- `specdate-backend/app/Console/Commands/PruneOldChatMessages.php` currently deletes old chat messages.
- This should become or be replaced by an archive-first workflow.

Suggested backend design:

- Add `chat_message_archives` table:
  - `id`
  - `chat_thread_id`
  - `from_message_id`
  - `to_message_id`
  - `from_sent_at`
  - `to_sent_at`
  - `message_count`
  - `disk`
  - `path`
  - `checksum`
  - `status` such as `pending`, `stored`, `failed`
  - timestamps
- Add `ChatMessageArchiveService`:
  - Select eligible messages older than configured days.
  - Exclude reported/hidden/moderation-sensitive messages unless we decide how to preserve audit needs.
  - Serialize messages to a readable plain text or JSONL format.
  - Upload archive file to S3.
  - Save archive row in DB.
  - Delete or soft-delete archived messages only after successful S3 write and DB record.
- Add command:
  - `chats:archive-old-messages --days=30 --dry-run`
  - Keep `--dry-run` as the default safety path while testing.
- Add API:
  - `GET /api/chats/{thread}/archives`
  - `GET /api/chats/{thread}/archives/{archive}`
  - Authorization must require the user to belong to the thread.

Suggested mobile design:

- Keep normal recent messages from `/api/chats/{thread}`.
- When the user scrolls near the oldest loaded message:
  - call archive list endpoint.
  - show an "Older messages" divider/loading state.
  - fetch and render the older archive chunk.
- Render archive messages read-only.
- Do not allow replying inside an archived chunk; replies still go to the live thread.

Open decisions:

- Archive file format: plain text for readability, or JSONL for easier rehydration. Best option may be JSONL plus a generated plain text export if needed.
- Whether to archive messages with media as text references only, or include media URLs/paths.
- Whether moderation/report evidence must remain in DB longer than normal chats.
- Whether archive threshold is exactly 30 days or configurable via env.

## 5. Order For Tomorrow

1. Start with mobile Specs refactor because that is where the latest status fixes landed.
2. Run mobile type check after each small extraction.
3. Then refactor ChatThreadScreen enough to prepare for archive loading.
4. Add backend chat archive migration/service/command behind dry-run.
5. Add tests for archive selection and authorization.
6. Only then wire mobile archive loading.

