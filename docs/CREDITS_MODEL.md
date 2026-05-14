# Single-Credit Model (with RevenueCat)

## Overview

The app uses **one type of credit** (no blue/red balloons). Users spend credits to **join a spec** and **lose one credit when eliminated** from a spec round. Credits can be purchased via **RevenueCat** (in-app purchases).

---

## Backend Model

### `credit_products` (table + model)

Stores **product_id** and **quantity** so they match RevenueCat. When RevenueCat (or the app) sends a **product_id**, the backend looks up this table and applies the **quantity**.

| Column      | Type    | Description |
|-------------|---------|-------------|
| id          | bigint  | PK          |
| product_id  | string  | Unique; same id as in RevenueCat (e.g. `specdate_credits_5`) |
| quantity    | integer | Credits granted when this product is purchased |
| name        | string  | Optional display name (e.g. "5 Credits") |
| sort_order  | int     | Order for listing |
| timestamps  |         | created_at, updated_at |

- **Model:** `App\Models\CreditProduct`
- **Seeder:** `CreditProductSeeder` seeds `specdate_credits_3` (3), `specdate_credits_5` (5), `specdate_credits_10` (10).
- **GET /api/credits/products** returns the list so the app can show packs and use `product_id` with RevenueCat. When a purchase completes, app sends **product_id** to **POST /api/credits/grant**; backend gets quantity from `credit_products` and applies it.

### `user_balances`

| Column     | Type    | Description                    |
|-----------|---------|--------------------------------|
| id        | bigint  | PK                             |
| user_id   | FK      | User                           |
| **credits** | integer | Single balance (≥ 0)          |
| timestamps|         | created_at, updated_at        |

- **Join a spec:** user must have `credits >= 1`; backend deducts 1 credit and creates a transaction.
- **Eliminated from a round:** victim’s `credits` decremented by 1 and a transaction is logged.

### `user_transactions`

Audit log for credit movement:

| Column    | Type   | Description                                      |
|-----------|--------|--------------------------------------------------|
| user_id   | FK     | User                                             |
| type      | enum   | `CREDIT` (added) or `DEBIT` (spent)              |
| item_type | string | **CREDIT (purchase):** RevenueCat product_id (e.g. `specdate_credits_5`). **DEBIT (spend):** `credit` |
| quantity  | int    | Number of credits (e.g. 1 or 5)                  |
| amount    | decimal| Price paid (from RevenueCat, for tracking)       |
| currency  | string | Currency from RevenueCat (e.g. USD, GBP, EUR)    |
| purpose   | string | e.g. "Joined Spec: …", "Eliminated from Spec: …", "Purchased (RevenueCat)" |
| revenue_cat_transaction_id | string | RevenueCat transaction id (CREDIT rows only); used for idempotency and tracking |
| metadata  | json   | spec_id, round_id, product_id, platform, etc.    |

For CREDIT (purchase) rows, **revenue_cat_transaction_id** and **currency** (and optional **amount**) come from the app, which gets them from RevenueCat after a successful purchase. The backend stores them on the transaction row for proper tracking.

---

## How the transaction list gets each row (added vs taken off)

- **Credits added (CREDIT):** When the **app** calls **POST /api/credits/grant** after a RevenueCat purchase, the backend creates one row in `user_transactions` with `type = CREDIT`, `quantity`, `purpose = 'Purchased (RevenueCat)'`, and `metadata` (product_id, revenue_cat_transaction_id).
- **Credits taken off (DEBIT):** When the user joins a spec or is eliminated, **SpecService** creates a row with `type = DEBIT`, `quantity = 1`, and `purpose` like "Joined Spec: …" or "Eliminated from Spec: …".

So the history of "each credit added and taken off" is **only in your backend**. RevenueCat does not write to your DB; the app tells the backend "user bought X", and the backend writes the transaction.

---

## Does RevenueCat send credits to the app?

No. **RevenueCat does not send the purchase to your backend.** Flow:

1. User pays in the app → Apple/Google process payment → **RevenueCat** gets the result.
2. **RevenueCat SDK** notifies **your app** (listener/callback): e.g. "Purchase success: product_id = specdate_credits_5, transaction_id = abc123".
3. **Your app** then calls **your backend**: POST /api/credits/grant with `quantity`, `revenue_cat_transaction_id`, `product_id`.
4. Backend creates the CREDIT transaction row and adds to `user_balances.credits`.

So: **RevenueCat tells the app**; **the app tells your backend**.

---

## How we identify which credit pack the user bought (product_id → quantity)

RevenueCat only gives the app a **product_id** (e.g. `specdate_credits_5`). You decide the **quantity** (5):

- **In the app:** Keep a map: `specdate_credits_3` → 3, `specdate_credits_5` → 5, `specdate_credits_10` → 10. When purchase succeeds, read product_id, get quantity, call backend with quantity + product_id + revenue_cat_transaction_id.
- **In the backend (optional):** Backend can also have this map and derive quantity from product_id (so you don't trust client-sent quantity).

The **transaction row** stores `quantity` and `metadata.product_id`, so the history shows e.g. "Purchased (RevenueCat)" with +5 and product_id `specdate_credits_5`.

---

## RevenueCat Flow

1. **Mobile:** User taps “Top up” → RevenueCat SDK shows products → user completes purchase.
2. **Mobile:** On successful purchase, app calls backend **POST /api/credits/grant** with:
   - `product_id` (e.g. `specdate_credits_5`)
   - `quantity` (e.g. 5)
   - `revenue_cat_transaction_id` (or `transaction_id`) for idempotency
   - Optionally `platform`, `currency`, `price` for records.
3. **Backend:** If `revenue_cat_transaction_id` already exists in a CREDIT transaction for this user → return 200 without adding credits (idempotent). Otherwise create CREDIT transaction and increment `user_balances.credits`.
4. **Optional:** RevenueCat webhooks (Server Notifications) can call the same grant logic so credits are granted even if the app is closed after purchase.

---

## Product IDs and quantity (same as RevenueCat)

Backend stores these in the **credit_products** table (see above). product_id = same id as in RevenueCat; quantity = credits granted. Seeder creates:

| product_id (RevenueCat + item_type for CREDIT) | quantity |
|------------------------------------------------|----------|
| specdate_credits_3                              | 3        |
| specdate_credits_5                              | 5        |
| specdate_credits_10                             | 10       |

- **GET /api/credits/products** returns the list; app uses these product_ids with RevenueCat and when calling grant.
- **POST /api/credits/grant** requires only `product_id` and `revenue_cat_transaction_id`. Backend looks up **credit_products** by product_id, gets quantity, and applies it.
- **item_type** in `user_transactions`: for purchases we store **product_id**; for spend (join/eliminate) we store `credit`.

---

## Initial Credits

New users get a small starter balance (e.g. **3 credits**) so they can join a few specs before paying. Set in `SparkService::initializeForUser()` and in any seeder.

---

## Summary

- **One balance:** `user_balances.credits`.
- **Spend:** join spec (−1), eliminated (−1).
- **Earn:** purchase via RevenueCat → **POST /api/credits/grant** with transaction id for idempotency.
- **Audit:** all changes in `user_transactions` with `item_type = 'credit'`.
