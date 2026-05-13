# Rekognition media moderation rollout checklist

Step-by-step plan to finish **image/video** AI moderation with strong UX, clear user awareness, and **no auto-ban** for now. **Audio** stays manual DB state + reports; no Rekognition.

Use this doc to tick **`[x]`** = done, **`[ ]`** = not started / in progress.

### Already in the repo

| Item | Location / notes |
|------|-------------------|
| Upload -> `moderation_status`, jobs, Rekognition image + video poll | `specdate-backend`: `MediaService`, `ProcessMediaModerationJob`, `PollRekognitionVideoModerationJob`, `MediaModerationService` |
| `GET /media/{media}` for polling | `MediaController@show` |
| Upload limits API + config-driven validation | `GET /media/upload-limits`, `config/media-upload.php`, `MediaUploadRulesService` |
| Backend share guard | `MediaAttachmentPolicyService`, wired in chat and round media attach paths |
| Public media filtering | `Media::isShareable()` used by public/avatar/gallery payloads |
| Mobile: poll helper, upload error prefers `data.file`, limits prefetch/cache | `media.ts`, `auth.ts`, `App.tsx` |
| Mobile: required AI scan confirmation before every media upload/share | `confirmMediaShareWithAiScan.ts`; wired: chat, rounds, profile, provider dashboard |
| Mobile: wait for moderation before send/publish | `waitForMediaModeration()` wired into chat, rounds, profile, provider dashboard |
| Jest tests for media service | `src/services/__tests__/media.test.ts` |

**Still not in repo:** admin flagged queue, S3 cleanup/retention job, production smoke test evidence.

**Media share confirmation (required):** `confirmMediaShareWithAiScan()` before any upload/share path.

---

## How similar apps usually behave

Most large dating / social apps combine:

1. **Scan before or right after upload** - user does not see raw moderation labels.
2. **Block at the edge** - content that fails policy never appears to matches.
3. **Neutral, short copy** - e.g. "We couldn't send this" rather than repeating model output.
4. **No public shame** - avoid accusing the user in-thread; optional link to Community Guidelines.
5. **Appeals / support later** - async admin review + message user fits here.

**Your direction:** no auto-ban; **flagged/failed = do not share**, remove local attachment, short message; **admin dashboard later** for all flagged assets + outreach.

---

## Phase 0 - Infrastructure (backend + ops)

| Step | Description | Status |
|------|-------------|--------|
| 0.1 | `FILESYSTEM_DISK=s3`, bucket + URL, same **region** as Rekognition | `[ ]` |
| 0.2 | IAM: `s3:GetObject` on upload prefix + Rekognition image/video APIs | `[ ]` |
| 0.3 | `AWS_REKOGNITION_ENABLED=true`, queue worker **always running** in each env (`queue:work` / Horizon / worker container) | `[ ]` |
| 0.4 | Migrations applied (`moderation_*` on `media`, jobs table for queue) | `[ ]` |
| 0.5 | Smoke test: upload image -> DB goes `pending` -> `scanning` -> `approved` / `flagged` within expected time | `[ ]` |

**Done in codebase already:** upload pipeline, jobs, `GET /media/{id}`, `config/media-upload.php`, limits API, mobile prefetch/cache for limits, `isMediaModerationInProgress` helper. Confirm **0.1-0.5** in each deployment.

---

## Phase 1 - "Never share" rules (product + API)

**Goal:** If moderation ends **`flagged`** or **`failed`**, the file must **never** be attached to a chat message, round answer, round question, or public profile slot as usable media.

| Step | Description | Status |
|------|-------------|--------|
| 1.1 | Define allowed statuses for attach/send. | `[x]` |
| 1.2 | Chat send API rejects unsafe `media_id` with 422 and neutral copy. | `[x]` |
| 1.3 | Round answer API rejects unsafe `media_id`. | `[x]` |
| 1.4 | Round question/profile/gallery media stays hidden until shareable. | `[x]` |
| 1.5 | Optional: Laravel observer or command to delete S3 object + soft-delete or mark `media` when `flagged`/`failed` after N days. | `[ ]` |

**Allowed share statuses:** `approved` for image/video and `manual_pending` for audio. `pending`, `scanning`, `flagged`, and `failed` are not shareable.

---

## Phase 2 - Mobile UX after upload

**Goal:** User always sees progress -> outcome; no infinite spinners; **flagged/failed** never stays as a sendable attachment.

| Step | Description | Status |
|------|-------------|--------|
| 2.1 | After upload, poll `GET /media/{id}` for image/video while moderation is in progress. | `[x]` |
| 2.2 | While polling, keep existing local loading state active; no long policy sentence. | `[x]` |
| 2.3 | `approved` enables send/publish. | `[x]` |
| 2.4 | `flagged`, `failed`, or timeout stops send/publish and shows neutral copy. | `[x]` |
| 2.5 | Do not add `media_id` to outgoing message/round payload unless status is allowed. | `[x]` |
| 2.6 | Chat, rounds, profile, and provider media uploads use the same shared wait helper. | `[x]` |

---

## Phase 3 - User awareness (required)

**Policy:** Users must see a confirmation every time they share media. State clearly that shared photos, videos, and voice notes are scanned with automated checks including AI, and they must not violate media/community rules.

| Step | Description | Status |
|------|-------------|--------|
| 3.1 | Confirmation before upload/send on every flow. Buttons: Cancel / Share; dismiss = cancel. | `[x]` |
| 3.2 | Error copy library maps `flagged` vs `failed` vs `timeout` to short neutral strings. | `[x]` |
| 3.3 | Audio is included in the confirmation copy ("voice note"). | `[x]` |

---

## Phase 4 - Admin later

| Step | Description | Status |
|------|-------------|--------|
| 4.1 | Admin list: all `media` with `moderation_status = flagged`, filters (date, user, type), deep link to asset. | `[ ]` |
| 4.2 | Actions: message user, mark reviewed, optional `hidden_at` / strike policy. | `[ ]` |
| 4.3 | Audit log: who reviewed, when, outcome. | `[ ]` |

---

## Quick reference - `moderation_status` UX

| Status | User sees | Send / share |
|--------|-----------|--------------|
| `pending` / `scanning` | Loading/reviewing state | Block until terminal |
| `approved` | Normal preview | Allow |
| `flagged` | Remove + neutral copy | Do not send |
| `failed` | Remove + try-again copy | Do not send |
| `manual_pending` (audio) | Normal | Allow + reports |

---

## Suggested order of execution

1. **Phase 0** - prove jobs + AWS in staging.
2. **Phase 1** - API hard blocks bad `media_id`.
3. **Phase 2** - mobile polling + remove + message.
4. **Phase 3** - required share confirmation + error-copy polish.
5. **Phase 4** - admin when ready.

---

## Changelog

| Date | Note |
|------|------|
| 2026-05-13 | Added backend share-status guard, public media filtering, mobile post-upload polling, centralized confirmation, and neutral moderation failure copy. |
