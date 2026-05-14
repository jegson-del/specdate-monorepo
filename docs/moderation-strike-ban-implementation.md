# DateUsher Moderation, Strike, Ban, and Appeal Implementation

This document turns the moderation/strike/ban proposal into a practical implementation plan for this codebase.

It should be used when we resume moderation module work after the current refactoring pass.

## Goals

- Protect users from harassment, abuse, scams, unsafe media, underage accounts, and impersonation.
- Keep automated moderation useful without allowing report spam or AI false positives to auto-ban users.
- Give admins a consistent enforcement workflow.
- Preserve evidence and audit trails for appeals.
- Scale from founder/admin review to a dedicated Trust & Safety workflow.

## Current Repo Baseline

Already implemented:

- User reports via `reports`.
- User blocking via `blocked_users`.
- Admin reports queue via `GET /api/admin/reports`.
- Admin media moderation queue via `GET /api/admin/media-moderation`.
- Admin user pause/ban/unban through `AdminUserService`.
- User enforcement fields:
  - `users.is_paused`
  - `users.banned_at`
  - `users.ban_reason`
  - `users.banned_by`
  - `users.admin_note`
- Media moderation fields:
  - `media.moderation_status`
  - `media.moderation_labels`
  - `media.rekognition_job_id`
  - `media.moderation_checked_at`
  - `media.moderation_error`
- Content hiding fields on:
  - `chat_messages.hidden_at`
  - `media.hidden_at`
  - `spec_round_answers.hidden_at`
- Rekognition image/video moderation pipeline.
- Mobile report/block surfaces across profiles, chat, media, reviews, and spec answers.

Not yet implemented:

- Full admin moderation case list/detail workspace.
- Advanced risk dashboards for reporter, IP, phone, and device signals.
- Text moderation and spam/risk detection.
- Provider-specific enforcement status beyond user-level enforcement.

## Target Architecture

The moderation system should have five layers:

1. **Detection**
   - User reports.
   - Rekognition media flags.
   - Manual admin review.
   - Future text moderation and spam/risk detection.

2. **Case Creation**
   - A detection event creates or updates a moderation case.
   - Reports alone do not create strikes.
   - AI flags should create cases and hide/block unsafe media from sharing, but severe account enforcement should still be reviewed unless policy says immediate action.

3. **Review**
   - Admin reviews evidence, user history, report context, media labels, and prior actions.
   - Admin decides: no action, warning, strike, content removal, temporary suspension, permanent ban.

4. **Enforcement**
   - Enforcement is performed through services, not controllers.
   - Enforcement writes audit records and user notifications.
   - Existing pause/ban fields remain the immediate account access controls.

5. **Appeal**
   - Users can appeal suspensions, bans, and moderation decisions.
   - Appeal decisions are logged and notify the user.

## Policy Model

### Strike-Based Violations

Use the 3-strike system for repeatable, non-critical violations:

- Spam messages.
- Repeated inappropriate language.
- Harassment that does not meet immediate-ban severity.
- Repeated unsolicited explicit content.
- Fake profile behavior.
- Misleading profile information.
- Repeated community guideline violations.
- Repeated unsafe media submissions.

### Immediate Suspension or Ban Violations

These bypass normal strikes:

- Underage accounts.
- Child exploitation content.
- Threats of violence.
- Revenge porn or non-consensual intimate content.
- Human trafficking activity.
- Severe harassment.
- Fraud/scam activity.
- Identity impersonation.
- Illegal content distribution.

For critical cases, prefer:

- Immediately pause or ban the account.
- Preserve evidence.
- Add admin notification.
- Require admin review before unban.

## Enforcement Levels

### Level 0: No Violation

Use when a report is invalid, duplicate, malicious, or unsupported.

Actions:

- Close report/case as `no_action`.
- Optionally track false-report behavior on reporter.

### Level 1: Warning

Used for first low/medium confirmed violation.

Actions:

- Create moderation action: `warning`.
- Optionally add Strike 1.
- Hide/remove violating content.
- Notify user with clear educational copy.
- Keep account active unless content type requires temporary restrictions.

### Level 2: Temporary Suspension

Used for Strike 2 or high-risk behavior.

Actions:

- Create moderation action: `temporary_suspension`.
- Set `users.is_paused = true`.
- Store `suspended_until`.
- Hide user from discovery.
- Restrict messaging/spec creation/provider actions.
- Notify user with reason and appeal option.

Suggested duration:

- 24 hours for lower-severity repeat behavior.
- 3 days for harassment/spam patterns.
- 7 days for high-risk repeat behavior.

### Level 3: Permanent Ban

Used for Strike 3 or immediate-ban violations.

Actions:

- Create moderation action: `permanent_ban`.
- Set `users.banned_at`.
- Set `users.ban_reason`.
- Set `users.banned_by`.
- Set `users.is_paused = true`.
- Delete active auth tokens.
- Preserve evidence.
- Notify user unless legal/safety policy says not to disclose details.

Future hardening:

- Phone blacklist.
- Device fingerprint flag.
- IP risk score.
- Payment/provider fraud marker where relevant.

## Recommended Database Additions

### `moderation_cases`

Unifies reports, AI flags, and admin investigations.

Suggested fields:

- `id`
- `subject_user_id` nullable FK users
- `opened_by_user_id` nullable FK users
- `assigned_admin_id` nullable FK users
- `source` enum/string: `report`, `ai_media`, `admin`, `spam_detector`, `system`
- `target_type`: `profile`, `media`, `message`, `spec`, `round_answer`, `provider`, `review`, `user`
- `target_id`
- `severity`: `low`, `medium`, `high`, `critical`
- `status`: `open`, `under_review`, `actioned`, `dismissed`, `appealed`, `closed`
- `summary`
- `evidence` JSON
- `opened_at`
- `closed_at`
- timestamps

Indexes:

- `status, opened_at`
- `subject_user_id, status`
- `target_type, target_id`
- `source, opened_at`

### `moderation_strikes`

Immutable strike ledger.

Suggested fields:

- `id`
- `user_id` FK users
- `case_id` nullable FK moderation_cases
- `report_id` nullable FK reports
- `issued_by_user_id` nullable FK users
- `strike_number` integer
- `category`: `spam`, `harassment`, `explicit_content`, `fake_profile`, `scam`, `hate_speech`, `unsafe_media`, `other`
- `severity`: `low`, `medium`, `high`
- `reason`
- `evidence` JSON
- `active` boolean default true
- `expires_at` nullable
- `revoked_at` nullable
- `revoked_by_user_id` nullable FK users
- `revocation_reason` nullable text
- timestamps

Rules:

- Only confirmed violations create active strikes.
- Reports do not create strikes automatically.
- Revoked strikes remain in history but do not count toward enforcement.

### `moderation_actions`

Audit log for every enforcement decision.

Suggested fields:

- `id`
- `case_id` nullable FK moderation_cases
- `user_id` nullable FK users
- `target_type` nullable
- `target_id` nullable
- `admin_id` nullable FK users
- `action`: `no_action`, `warning`, `strike`, `hide_content`, `temporary_suspension`, `permanent_ban`, `unban`, `strike_revoked`, `appeal_granted`, `appeal_denied`
- `reason`
- `metadata` JSON
- `created_at`

This table should become the canonical audit trail. It complements existing `reports.action` and `reports.action_note`.

### `moderation_appeals`

Appeal workflow.

Suggested fields:

- `id`
- `user_id` FK users
- `case_id` nullable FK moderation_cases
- `action_id` nullable FK moderation_actions
- `status`: `open`, `under_review`, `granted`, `denied`, `closed`
- `appeal_text`
- `reviewed_by_user_id` nullable FK users
- `decision_note` nullable text
- `submitted_at`
- `reviewed_at` nullable
- timestamps

### `users` Additions

Existing fields already cover basic pause/ban. Add:

- `moderation_status` string default `active`
- `strike_count` unsigned integer default 0
- `risk_score` unsigned integer default 0
- `last_violation_at` nullable timestamp
- `suspended_until` nullable timestamp

Suggested `moderation_status` values:

- `active`
- `warned`
- `suspended`
- `under_review`
- `permanently_banned`

Important:

- `strike_count` should be derived from active strikes when possible, but denormalizing it on `users` is useful for query/filter speed.
- `banned_at` remains the hard permanent-ban switch.
- `is_paused` remains the immediate feature-disabling switch for pause/suspension.

## Backend Service Design

Keep controllers thin.

### `ModerationCaseService`

Responsibilities:

- Create cases from reports, AI flags, and admin investigations.
- Merge duplicate reports into an existing open case where safe.
- Build evidence payloads.
- Assign admins.
- Close/dismiss cases.

### `StrikeService`

Responsibilities:

- Issue strike.
- Revoke strike.
- Count active strikes.
- Determine next enforcement level.
- Update user strike fields.

### `ModerationEnforcementService`

Responsibilities:

- Apply warning.
- Apply temporary suspension.
- Apply permanent ban.
- Hide content.
- Restore content when appeal/admin decision allows.
- Call `AdminUserService` or share low-level enforcement helpers where appropriate.
- Notify user/admin.
- Write `moderation_actions`.

### `AppealService`

Responsibilities:

- Submit appeal.
- List appeals for admin.
- Grant/deny appeal.
- Revoke strikes or reverse suspension/ban where appropriate.
- Notify user.

### `RiskScoringService` Future

Responsibilities:

- Track spam patterns.
- Track repeated false reports.
- Track suspicious IP/device/phone reuse.
- Increase or decay risk score.

## API Design

### User APIs

- `POST /api/moderation/appeals`
  - Submit appeal for a case/action.

- `GET /api/me/moderation`
  - Return user moderation status, active suspension, strike count, and appealable actions.

### Admin APIs

- `GET /api/admin/moderation/cases`
- `GET /api/admin/moderation/cases/{case}`
- `PATCH /api/admin/moderation/cases/{case}`
- `POST /api/admin/moderation/cases/{case}/warning`
- `POST /api/admin/moderation/cases/{case}/strike`
- `POST /api/admin/moderation/cases/{case}/suspend`
- `POST /api/admin/moderation/cases/{case}/ban`
- `POST /api/admin/moderation/cases/{case}/dismiss`
- `GET /api/admin/moderation/appeals`
- `PATCH /api/admin/moderation/appeals/{appeal}`

Existing APIs to integrate:

- `GET /api/admin/reports`
- `PATCH /api/admin/reports/{report}`
- `GET /api/admin/media-moderation`
- `PATCH /api/admin/media-moderation/{media}/approve`
- `PATCH /api/admin/users/{user}/pause`
- `PATCH /api/admin/users/{user}/ban`

## Report Flow

Current report flow:

- User creates report.
- Admin can review and update report.
- Some actions can hide content or pause user.

Target flow:

1. User submits report.
2. `ReportService` stores report.
3. `ModerationCaseService` creates or links a moderation case.
4. Admin reviews case.
5. Enforcement action optionally updates report status/action.
6. Strike/action/appeal records provide the long-term audit trail.

False report protection:

- Never ban or strike from report count alone.
- Multiple reports can increase priority/severity.
- Only confirmed policy violations create strikes.

## AI Media Moderation Flow

Existing flow:

- Image/video uploads go through Rekognition when S3 and Rekognition are enabled.
- Images use synchronous Rekognition moderation labels.
- Videos use async Rekognition jobs:
  - `StartContentModeration`
  - store `rekognition_job_id`
  - poll `GetContentModeration`
  - save `approved`, `flagged`, or `failed`
- Audio is `manual_pending`.

Target enforcement:

- `approved`: shareable.
- `manual_pending`: shareable for audio under current rollout.
- `pending` / `scanning`: not shareable yet.
- `flagged`: not shareable; create moderation case.
- `failed`: not shareable; create moderation case for admin review.

Strike policy:

- One flagged upload should not automatically strike/ban by itself.
- Repeated confirmed unsafe media can create strikes.
- Critical media categories can trigger immediate suspension/ban and escalation.

## Mobile Product Requirements

User-facing surfaces should support:

- Report profile.
- Report image/video/audio.
- Report chat message.
- Report spec/round answer.
- Block user.
- Show active suspension/ban reason.
- Show appeal entry point where eligible.
- Keep media moderation copy neutral:
  - “This file could not be sent.”
  - “This video is still being reviewed.”
  - Avoid exposing raw AI labels.

Already implemented:

- Report/block sheets in chat/profile/spec/provider surfaces.
- Media share confirmation before upload.
- Post-upload moderation polling.
- Long video moderation timeout hardening.
- Account status screen with appeal form and status routing.
- In-app moderation notification routing for appeal outcomes.

Needed:

- Push notification tap routing for moderation outcomes at the OS notification layer.
- Warning/strike/suspension/ban copy polish after policy wording is finalized.

## Admin Web Requirements

Admin should be able to:

- Review all open moderation cases latest-first.
- Filter by severity, source, status, target type, user, and date.
- View full evidence:
  - Report details.
  - Reported content.
  - Media URL and moderation labels.
  - Chat/message/spec context.
  - Prior strikes/actions.
- Apply enforcement:
  - Dismiss.
  - Hide content.
  - Warn.
  - Strike.
  - Suspend.
  - Ban.
  - Restore/approve.
- Review appeals.
- See full audit trail.

Implementation rule:

- Admin pages are composition boundaries only.
- Put API calls in `src/lib`.
- Put reusable admin moderation workflows in hooks/components.
- Keep data latest-first and paginated.

## Notification Types To Add

Backend notification types:

- `moderation_warning`
- `moderation_strike`
- `moderation_suspension`
- `moderation_ban`
- `moderation_appeal_received`
- `moderation_appeal_granted`
- `moderation_appeal_denied`

Mobile routing:

- User-facing moderation notifications should route to a new account/moderation status screen.
- Admin-only moderation notifications should keep using admin web URLs.

## Suggested Implementation Phases

### Phase 1: Case and Action Foundation

- Add `moderation_cases`.
- Add `moderation_actions`.
- Create `ModerationCaseService`.
- Update `ReportService` and media moderation jobs to create cases.
- Keep existing admin reports/media queues working.
- Add tests for case creation from report and media flag.

### Phase 2: Strike Ledger

- Add `moderation_strikes`.
- Add user fields: `moderation_status`, `strike_count`, `risk_score`, `last_violation_at`, `suspended_until`.
- Create `StrikeService`.
- Add admin action to issue/revoke strike.
- Add tests for strike count and revocation.

### Phase 3: Enforcement Automation

- Create `ModerationEnforcementService`.
- Wire warning, strike, suspension, ban.
- Reuse existing `AdminUserService` behavior where possible.
- Ensure banned users lose tokens.
- Add middleware/policies to block suspended/banned users from protected actions.
- Add tests for Strike 1/2/3 outcomes.

### Phase 4: Appeals

- Backend foundation complete:
  - Added `moderation_appeals`.
  - Added user moderation status API: `GET /api/me/moderation`.
  - Added user appeal submission API: `POST /api/moderation/appeals`.
  - Added admin appeal list/decision APIs: `GET /api/admin/moderation/appeals`, `PATCH /api/admin/moderation/appeals/{appeal}`.
  - Added grant/deny audit actions.
  - Appeal grant reverses eligible strike decisions and recalculates user moderation status.
  - Added tests for submit, duplicate prevention, grant, deny, and status payload.
- Still pending after backend rules are stable:
  - None for Phase 4 backend/mobile/admin foundation.
- Notification/status routing complete:
  - Added `moderation_appeal_received` admin notification.
  - Added `moderation_appeal_granted` and `moderation_appeal_denied` user notifications.
  - Added mobile moderation status route for appeal decision notifications.
- Mobile appeal form complete:
  - Added appealable action picker to moderation status screen.
  - Added appeal message submission through `POST /api/moderation/appeals`.
  - Refreshes status after submit so open appeals are reflected immediately.
- Admin appeal UI complete:
  - Added `/admin/moderation/appeals`.
  - Added latest-first appeal list with status filter.
  - Added grant/deny controls with required decision note.
  - Admin notification links now land on a real appeals route.
- Admin moderation case workspace complete:
  - Added paginated `GET /api/admin/moderation/cases`.
  - Added `GET /api/admin/moderation/cases/{case}` detail with evidence, reports, actions, strikes, and appeals.
  - Added `/admin/moderation/cases` web page with status/source/severity/search filters.
  - Admin sidebar now links to Cases separately from Reports, Upload Moderation, and Appeals.
  - Reports, upload moderation rows, and appeals now link directly to related case detail with `?case={id}`.
  - Added backend tests for latest-first pagination and case evidence detail.

### Phase 5: Risk and Anti-Abuse

- Device fingerprinting complete:
  - Added `device_fingerprints`.
  - Mobile sends a stable install fingerprint plus platform/app metadata on authenticated API requests.
  - Backend hashes the install fingerprint before storage.
  - Capture is non-blocking so device tracking cannot break normal API requests.
- Phone blacklist complete:
  - Added `phone_blacklist_entries`.
  - Added phone blacklist model/service with normalized phone matching.
  - Blocks blacklisted numbers during mobile OTP, mobile registration, and provider registration.
  - Expired blacklist entries no longer block use.
- Rate limits for reports/appeals complete:
  - Reports: limited per user/IP with burst and hourly controls.
  - Appeals: limited per user/IP to reduce appeal spam.
  - Added backend tests for both limits.
- IP risk events complete:
  - Added `ip_risk_events`.
  - Added risk event service/model.
  - Records report/appeal rate-limit hits with user, IP, path, user agent, severity, score, and metadata.
  - Coalesces duplicate events for the same user/IP/path/event within one minute.
- False-report scoring complete:
  - Added `reporter_risk_scores`.
  - Stores report IP/user-agent and reporter score outcome on reports.
  - Dismissed reports increase reporter false-report count and risk score.
  - Actioned resolved reports count as valid without penalty.
  - Repeated dismissed reports create `false_report_pattern` IP risk events.
- Admin moderation pagination complete:
  - Upload moderation, moderation cases, reports, appeals, provider applications, users, and support all use latest-first paginated data.
  - Admin list pages show current result ranges and previous/next paging controls.
- Admin risk visibility complete:
  - Added `GET /api/admin/risk/users`.
  - Added `GET /api/admin/risk/ip-events`.
  - Added `GET /api/admin/users/{user}/risk`.
  - Added `/admin/risk` with paginated risk users and IP risk events.
  - Admin user detail now shows a compact risk summary with scores, devices, IP events, false reports, and strikes.

## Test Plan

Backend feature tests:

- Report creates moderation case.
- AI flagged media creates moderation case.
- Admin dismisses case without strike.
- Admin issues Strike 1 warning.
- Strike 2 suspends user for configured duration.
- Strike 3 permanently bans user.
- Immediate-ban category bypasses strike ladder.
- Revoked strike no longer counts.
- Suspended user cannot create specs/send chat/join.
- Banned user tokens are revoked.
- Appeal can be submitted once per action.
- Appeal grant reverses eligible strike/suspension.

Mobile tests:

- Moderation notification routes to status screen.
- Suspended user sees status and appeal CTA.
- Report/block flows still submit correctly.
- Media moderation timeout shows reviewing, not failed.

Admin web tests:

- Cases list latest-first.
- Filters work.
- Enforcement action writes audit log.
- Appeal decision writes audit log.

## Open Product Decisions

- Do strikes expire? Suggested: low/medium strikes expire after 6-12 months if no repeat violation.
- Can users appeal warnings, or only suspensions/bans? Suggested: suspensions and bans first.
- Should audio remain `manual_pending` and shareable? Current rollout says yes, but this can change later.
- Should providers have separate provider enforcement status? Suggested: use user-level enforcement first, then provider-specific restrictions later.
- Should a flagged AI media result immediately hide current profile avatar/gallery image? Current repo keeps unsafe media non-shareable; admin review determines final account enforcement.

## Engineering Notes

- Keep controllers thin.
- Put enforcement rules in services.
- Keep strike/action records immutable except explicit revocation fields.
- Avoid destructive content deletion until evidence retention requirements are decided.
- Do not auto-ban from report count alone.
- Avoid exposing AI labels to normal users.
- Treat admin actions as auditable events.
