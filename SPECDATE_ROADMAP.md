# SpecDate — Step-by-step Development Roadmap (Backend-first)

This document is the **source of truth** for building SpecDate from MVP → v1.

## Product story (what we’re building)
- **Core idea**: A user creates a **Spec** (a multi-step “ideal partner” spec with compulsory criteria, expiry date, and max participants). Other users request to join. After expiry, the spec owner runs **question rounds**, eliminating **10%** each round (“balloon pop”) until a final winner becomes a **Date**.
- **UX vibe**: The in-app **Home feed** should feel like Snapchat: brand name/logo centered in the top bar, profile/messages/notifications icons, scrollable cards.
- **Notifications-heavy**: join requests, approvals, round questions, eliminations, winner, expiry prompts.

## Global navigation & gating rules (must be backend-enforced)
### Navigation stacks
- **Auth stack**: `Landing` (marketing), `Register`, `Login`, `OtpVerification` (OTP bypass for now)
- **App stack**: `Home`, `SpecDetails`, `CreateSpec`, `Notifications`, `Messages`, `Profile`

### Gating
- **Not authenticated** → Auth stack
- **Authenticated but profile incomplete** → force `Profile` and **block actions**
  - Block: create spec, join spec, answer rounds, view participants
- **Authenticated + profile complete** → App stack

## Mobile UI targets
### Home (Snapchat-style)
- **Top bar**
  - Left: Profile icon/avatar
  - Center: app name/logo (“Spec A Date”)
  - Right: Messages + Notifications icons (badges)
- **Feed sections/tabs**
  - Live Specs
  - Ongoing Specs
  - Popular Specs
  - Hottest Specs
- **Spec cards**
  - Owner avatar
  - Title/summary
  - Expiry date/time
  - Max participants + current approved count + pending count
  - CTA: Join / Pending / Joined / Closed

### Profile completion (required fields)
Required before user can perform any spec actions:
- **Full name**
- **DOB** (or age derived)
- **Sex**
- **City / State / Country**
- **Occupation** (dropdown + searchable, “Other” → text)
- **Qualification** (dropdown + searchable, “Other” → text)
- **Sexual orientation**
- **Hobbies**
- **Smoker** (yes/no)
- **Drug use** (yes/no)

## Backend domain model (MVP → v1)
### Core entities
- **User**
- **UserProfile**
- **Spec**
- **SpecRequirement** (compulsory criteria + optional criteria)
- **SpecJoinRequest**
- **SpecParticipant**
- **SpecRound**
- **SpecQuestion**
- **SpecAnswer**
- **SpecElimination** (audit log)
- **Notification**

### Optional v1+ entities
- **Conversation**, **Message**
- **DateProvider**, **DateBooking**
- **Review**, **UserStats**

## Spec lifecycle (state machine)
Suggested states:
- **DRAFT**: creator editing, not visible in feeds
- **OPEN**: visible, accepting join requests (until expiry or manual close)
- **ACTIVE**: rounds running (no new joins)
- **COMPLETED**: winner selected/date started
- **CLOSED**: manually closed
- **EXPIRED**: time passed and creator didn’t extend/start rounds

Transitions:
- DRAFT → OPEN (publish)
- OPEN → ACTIVE (creator starts rounds)
- OPEN → EXPIRED (expiry time reached, if not extended/closed)
- OPEN → CLOSED (manual close)
- ACTIVE → COMPLETED (winner chosen)

## Joining business rules (server-side)
When a user taps **Join**:
- **Profile complete required**
- Spec must be **OPEN**
- Not already joined, not already requested
- Capacity rules:
  - Option A (simple MVP): block requests when approved participants == max
  - Option B (better): allow requests but enforce max at approval time
- **Eligibility check** against *compulsory requirements*:
  - If user doesn’t satisfy → 422 with reason
- If eligible → create `SpecJoinRequest` (PENDING) and notify creator

Creator can:
- **Approve** → create `SpecParticipant` (APPROVED), notify requester
- **Decline** → mark request DECLINED, notify requester

## Rounds + elimination rules
### Starting rounds
When expiry arrives:
- Notify creator: **extend** or **start rounds**
- If creator starts rounds: Spec state becomes **ACTIVE**, create `SpecRound(1)`

### Each round
- Creator creates **SpecQuestion**
- Participants submit **SpecAnswer**
- Participants only see **their own answer**
- Creator can see all answers and scoring

### Elimination (10% rule)
- After scoring, creator must eliminate:
  - \(k = \max(1, \lceil N \times 0.10 \rceil)\) where \(N\) = active participants
- Store eliminations in `SpecElimination` (audit)
- Notify eliminated user: “Your balloon popped — you’re out”
- Repeat until 1 participant remains → **winner**

## Notifications (minimum events)
In-app notifications (and later push):
- Join request received (creator)
- Join approved/declined (requester)
- Spec expiring soon / expiry reached (creator)
- Round started / new question posted (participants)
- Reminder to answer (participants)
- Eliminated (participant)
- Winner chosen / spec completed (participants)
- Extend or close prompt (creator)

Implementation:
- `notifications` table: `id, user_id, type, payload_json, read_at, created_at`
- API:
  - `GET /api/notifications` (paged)
  - `POST /api/notifications/{id}/read`

## Backend API (proposed endpoints)
### Auth
- `POST /api/register`
- `POST /api/login`
- `GET /api/user` (auth) → includes profile + computed `profile_complete`

### Profile
- `PUT /api/profile` (auth) → validates + updates profile + sets `profile_completed_at` when complete

### Specs (MVP)
- `POST /api/specs` (auth, profile complete)
- `GET /api/specs?tab=live|ongoing|popular|hottest` (auth, profile complete optional for read)
- `GET /api/specs/{id}` (auth)
- `POST /api/specs/{id}/join` (auth, profile complete)
- `POST /api/specs/{id}/requests/{requestId}/approve` (auth, creator only)
- `POST /api/specs/{id}/requests/{requestId}/decline` (auth, creator only)

### Rounds (MVP+)
- `POST /api/specs/{id}/rounds/start` (auth, creator only)
- `POST /api/specs/{id}/rounds/{roundId}/questions` (auth, creator only)
- `POST /api/specs/{id}/rounds/{roundId}/answers` (auth, participant only)
- `POST /api/specs/{id}/rounds/{roundId}/eliminate` (auth, creator only; enforce 10% rule)

## Backend implementation plan (step-by-step)
### Phase 0 — Foundations (stabilize)
- **Auth tokens**: Sanctum `createToken()` works
- **Mobile**: token attached on requests
- **Profile**: `PUT /api/profile` works (authorized)

### Phase 1 — Profile completion enforcement (hard gate)
- Add `profile_completed_at` column on `user_profiles` (or a boolean field)
- Add a backend helper: compute `profile_complete` from required fields
- Enforce profile completion middleware on:
  - create spec
  - join spec
  - start rounds / answer / eliminate
- Mobile:
  - after registration → `Profile`
  - after successful profile save → `Home` (navigation reset)

### Phase 2 — Specs MVP (create + list + details)
- Migrations:
  - `specs`
  - `spec_requirements`
- Controllers/services:
  - Create spec (multi-step payload)
  - List feed by tabs (start with simple sort rules)
  - Spec details endpoint
- Mobile:
  - Home feed UI + card list
  - Spec details screen
  - Create spec multi-step screen

### Phase 3 — Join requests + approvals
- Migrations:
  - `spec_join_requests`
  - `spec_participants`
- Endpoints:
  - join request create
  - approve/decline
- Notifications created on events
- Mobile:
  - Join button states: Join / Pending / Joined
  - Creator “Requests” list (in spec details or separate screen)

### Phase 4 — Notifications (in-app first)
- Migrations:
  - `notifications`
- Endpoints:
  - list + mark read
- Mobile:
  - Notification screen
  - badge count in top bar

### Phase 5 — Rounds + elimination
- Migrations:
  - `spec_rounds`, `spec_questions`, `spec_answers`, `spec_eliminations`
- Business logic:
  - expiry prompt → start rounds
  - question publish + answer submit windows
  - scoring rules (start simple: manual creator rating; later: automated match scoring)
  - elimination enforcement 10%
- Mobile:
  - participant answer UI (only own answer visible)
  - creator admin UI (create question, view answers, select eliminations)

### Phase 6 — Winner → date + providers + reviews (v1)
- Entities:
  - `date_providers`, `date_bookings`, `reviews`
- Flows:
  - winner declared → mutual “dates”
  - choose provider → booking
  - after date → feedback + review

## Notes / decisions (MVP defaults)
- **OTP**: bypass until implemented (keep verification screen UI only)
- **Scoring**: start manual (creator scores), later add rules/AI
- **Provider marketplace**: v1+, keep as stub list initially
- **Push notifications**: start with in-app notifications table, add Expo push later

## Execution checklist (tiny steps)
Use this section as a **living checklist** to work through the roadmap gradually.

### Phase 0 — Foundations (stabilize)
- [ ] **Backend auth**
  - [ ] Ensure Sanctum is installed + migrations run
  - [ ] Confirm `App\Models\User` uses `HasApiTokens`
  - [ ] `POST /api/register` returns token
  - [ ] `POST /api/login` returns token
  - [ ] `GET /api/user` works under `auth:sanctum`
- [ ] **Backend validation + responses**
  - [ ] All endpoints use FormRequests (no inline `validate()` in controllers)
  - [ ] Validation failures return consistent JSON (422)
  - [ ] All endpoints return responses via `ApiResponse`
- [ ] **Backend profile**
  - [ ] `PUT /api/profile` protected by `auth:sanctum`
  - [ ] Updates profile fields correctly
  - [ ] Response returns user with loaded `profile`
- [ ] **Mobile auth**
  - [ ] Persist token (SecureStore)
  - [ ] Restore token at boot and route to Home/Profile
  - [ ] Display backend validation/auth errors (401/422)
- [ ] **Dev environment**
  - [ ] Docker up/down documented
  - [ ] `docker compose exec ... migrate` works
  - [ ] Scribe docs generate and `/docs` loads

### Phase 1 — Profile completion enforcement (hard gate)
- [ ] **DB**
  - [ ] Add `profile_completed_at` to `user_profiles` (migration)
  - [ ] Optional: backfill existing users
- [ ] **Backend logic**
  - [ ] Add `ProfileService::isComplete(profile)` helper
  - [ ] Add computed `profile_complete` to `GET /api/user`
  - [ ] On `PUT /api/profile`: if complete → set `profile_completed_at`
- [ ] **Backend middleware**
  - [ ] Create `EnsureProfileComplete` middleware
  - [ ] Apply to: create spec, join spec, start rounds, answer, eliminate
- [ ] **Mobile routing**
  - [ ] If token exists but profile incomplete → force `Profile`
  - [ ] Block/hide spec actions until profile complete

### Phase 2 — Specs MVP (create + list + details)
- [ ] **DB migrations**
  - [ ] `specs` table (creator_id, state, title/summary, expires_at, max_participants, timestamps)
  - [ ] `spec_requirements` table (spec_id, field, operator, value, is_required)
- [ ] **Backend endpoints**
  - [ ] `POST /api/specs` (FormRequest + Service)
  - [ ] `GET /api/specs?tab=live|ongoing|popular|hottest` (simple sorting)
  - [ ] `GET /api/specs/{id}` details (creator + counts + requirements)
- [ ] **Mobile**
  - [ ] Replace placeholder feed with `/api/specs`
  - [ ] Build `SpecDetails` screen
  - [ ] Build `CreateSpec` multi-step flow (draft → publish)

### Phase 3 — Join requests + approvals
- [ ] **DB migrations**
  - [ ] `spec_join_requests` (spec_id, user_id, status, reason, timestamps)
  - [ ] `spec_participants` (spec_id, user_id, status, joined_at)
- [ ] **Backend endpoints**
  - [ ] `POST /api/specs/{id}/join` (eligibility + pending request)
  - [ ] `POST /api/specs/{id}/requests/{requestId}/approve`
  - [ ] `POST /api/specs/{id}/requests/{requestId}/decline`
- [ ] **Eligibility engine**
  - [ ] Evaluate compulsory requirements vs user profile
  - [ ] Return 422 with clear reason when not eligible
- [ ] **Mobile**
  - [ ] Join button states: Join / Pending / Joined / Closed
  - [ ] Creator requests list UI

### Phase 4 — Notifications (in-app first)
- [ ] **DB migration**
  - [ ] `notifications` (user_id, type, payload_json, read_at, timestamps)
- [ ] **Backend**
  - [ ] Create notifications for join request + approve/decline
  - [ ] `GET /api/notifications` paginated
  - [ ] `POST /api/notifications/{id}/read`
- [ ] **Mobile**
  - [ ] Notifications screen
  - [ ] Badge count (unread) in top bar

### Phase 5 — Rounds + elimination
- [ ] **DB migrations**
  - [ ] `spec_rounds`
  - [ ] `spec_questions`
  - [ ] `spec_answers`
  - [ ] `spec_eliminations`
- [ ] **Backend**
  - [ ] Start rounds (OPEN → ACTIVE)
  - [ ] Create question (creator)
  - [ ] Submit answer (participant)
  - [ ] Scoring v0 (manual)
  - [ ] Enforce 10% elimination rule
- [ ] **Mobile**
  - [ ] Participant: answer UI (only own answer visible)
  - [ ] Creator: create question + view answers + eliminate UI

### Phase 6 — Winner → date + providers + reviews
- [ ] **DB**
  - [ ] `date_providers`, `date_bookings`, `reviews`, `user_stats`
- [ ] **Backend**
  - [ ] Declare winner + mark spec completed
  - [ ] Choose provider + create booking
  - [ ] Submit review + compute stats
- [ ] **Mobile**
  - [ ] Providers list → select → booking flow
  - [ ] Post-date review flow

