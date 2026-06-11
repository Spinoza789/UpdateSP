# Peps Anonymous

A mobile-first product ordering website for peptide products. Customers select products, choose delivery, optionally add a tip, and submit orders using their Telegram username + a 4-digit PIN. Orders can be looked up and edited after submission.

## Security Architecture

- **Helmet.js** — Full suite of security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, etc.)
- **CORS** — Restricted to `*.replit.dev`, `*.replit.app`, and `localhost` origins only
- **Rate limiting** — Global 20 000 req/15 min (shared IP — Replit collapses all traffic to one egress IP); login/sensitive endpoints 200 req/15 min; order creation 10/hr; admin auth 200 failed attempts/15 min
- **Body size limit** — 64 KB cap on all request bodies
- **Timing-safe comparisons** — All PIN and admin secret checks use `timingSafeEqual` (prevents timing attacks)
- **DB-level lockout** — 5 failed PIN lookups → 15 min block per Telegram username
- **TX hash format validation** — Only valid `0x`-prefixed 64-char hex accepted
- **Wallet address validation** — Ethereum address format enforced before blockchain calls
- **Input length limits** — Telegram username, notes, product names, addresses all capped
- **Enum validation** — Status and paymentStatus fields validated against allowlists
- **Admin secret** — Header-only (`X-Admin-Secret`); never accepted from request body; timing-safe comparison
- **Admin frontend** — Auto-logout after 60 min inactivity; re-verifies on tab visibility; no autocomplete on secret field; 3 s client-side cooldown between login attempts; sessionStorage (clears on browser close)

## Architecture

**Monorepo (pnpm workspaces):**
- `artifacts/peps-anonymous` — React + Vite frontend (previewPath `/`)
- `artifacts/api-server` — Express REST API (port 8080)
- `lib/db` — Drizzle ORM schema + PostgreSQL connection
- `lib/api-spec` — OpenAPI spec (source of truth) + codegen
- `lib/api-client-react` — Generated React Query hooks (from codegen)
- `scripts/` — Seed script

## AI Lab Report Extraction (Gemini Vision)

- **Gemini 2.5 Flash Vision** reads Janoshik Certificate of Analysis (CoA) images server-side
- Extracts: purity %, endotoxin EU/mg, sterility pass/fail, heavy metals (As/Cd/Pb/Hg), batch code, test date, test type, product category, confidence level
- **Single extraction**: `POST /api/admin/lab-tests/:id/extract` — fetches images, calls Gemini, updates record
- **Batch extraction**: `POST /api/admin/lab-tests/extract-all` — background job with 1.2s delay between calls; `skipExisting=true` skips already-extracted records
- **Status polling**: `GET /api/admin/lab-tests/extract-status` — returns running/done/error with progress counts
- **Stop job**: `POST /api/admin/lab-tests/extract-stop`
- DB tracks `ai_extracted` (boolean) and `ai_extracted_at` (timestamp) per record
- Admin UI: AI extraction panel, per-row sparkle button, real-time progress banner, AI badge on extracted rows, "AI Extracted" stat tile
- Uses Replit AI Integrations (no personal API key needed; billed to Replit credits)

## Key Features

- **GLP-1 Tracker (Shotsy-inspired)** — Full-featured injection tracker inside the Profile Hub (`/portal?s=glp1`). Four sub-tabs: **Overview** (6 stat tiles: shots/weeks/dose/weight Δ/% lost/streak, next-injection countdown, weight+dose chart, pharmacokinetic medication level chart), **Shots** (extended log form with injection site selector, structured side effect chips, nutrition fields, full shot history with colour-coded site badges), **Body Map** (SVG body diagram showing all 6 injection zones colour-coded by recency, site-usage bar chart, rotation tip), **Nutrition** (avg calories/protein/water tiles, multi-line chart, per-entry log). DB: `glp1_logs` extended with `injection_site`, `side_effects` (JSON), `calories`, `protein_g`, `water_ml`. API `POST /api/glp1` accepts all new fields. Pharmacokinetic model uses compound-specific half-lives (Semaglutide 168h, Tirzepatide 120h, Liraglutide 13h).
- **Blood Test Tracker** — Log blood test sessions (date, lab, notes) with per-biomarker results across 7 categories (Hormones, Thyroid, FBC, Cholesterol, Liver, Kidney, Metabolic). Always-visible Recharts line charts with green reference-area shading for healthy range. Out-of-range biomarkers show a "What customers commonly stack" panel with product recommendations (Gonadorelin, BPC-157, Omega-3, etc.). Route: `/blood-tests`. API: `/api/blood-tests` (GET/POST/DELETE, `requireAccount`). DB tables: `blood_test_sessions`, `blood_test_values`.
- **Compound & Protocol Tracker** — Log and track AAS, TRT, Peptide, Supplement and Other compounds. Each compound stores name, type, dose, unit, frequency, route, start/end dates and notes. Active vs past-cycle sections with "End Protocol" action. Preset compound lists per type. Route: `/compounds`. API: `/api/compounds` (GET/POST/PATCH/DELETE, `requireAccount`). DB table: `compound_logs`.
- **Enhanced Ticket System** — Six categories (General, Order Issue, Billing/Refund, Group Buy, Wholesale, Testing Pool); per-category issue-type picker; Group Buy picker with organiser Telegram DM routing + optional `TELEGRAM_ORGANISER_CHAT_ID` group-chat alert; admin sees all tickets.
- **Profile Hub** — Card-based `/account` dashboard replacing the old 2-tab layout. Sections: My Orders, Blood Tests, Compounds & Protocols, My Profile, Telegram Notifications. Each section navigates in-place or to its own route with a back button.
- 126 products loaded from CSV
- Delivery method selection (Royal Mail, InPost, International) with live prices
- Vendor shipping fee (configurable via `VENDOR_SHIPPING_PRICE` env var)
- Optional tip section
- Optional **Lab Test Contribution** ($15) — enabled per group buy by admin toggle; contributors vote on which product to test after payment confirmation
- Full grand total breakdown on review
- Order created with 4-digit code for future lookup/editing
- Contact section linking to Telegram @urbanblend789
- Google Sheets outbound webhook (see setup below)

## Telegram Bot Notifications

Users can link their Telegram account to receive real-time DM notifications.

- **Bot**: @saltandpepsbot (`TELEGRAM_BOT_TOKEN` env secret)
- **Admin chat**: `TELEGRAM_ADMIN_CHAT_ID` env secret (receives new orders + payment failures)
- **Webhook**: `POST /api/telegram/webhook` — handles `/link <code>`, `/stop`, `/start` bot commands
- **Link flow**: User clicks "Link Telegram" → gets 15-min expiry code → sends `/link CODE` to bot → linked
- **Per-event toggles**: new_order, status, payment, deleted, profile (all default on)
- **Notifications fire on**: order created, order status changed (admin), payment confirmed/failed (admin), order deleted (admin or customer), profile updated
- **Frontend**: TelegramCard in `CustomerPortal.tsx` (My Profile tab) and `AccountOrders.tsx`

### API Endpoints (all require account session cookie)
- `POST /api/account/telegram/link-init` — generate 8-char hex link code
- `GET /api/account/telegram/status` — get linked status + prefs
- `DELETE /api/account/telegram/unlink` — remove link
- `PATCH /api/account/telegram/prefs` — update per-event toggles

## GB Organiser System

Approved GB Organisers can create and manage their own Group Buys (admin-approved before going live).

### Organiser Application Flow
- `POST /api/organiser/apply` — account applies; admin approves/rejects at `/sleepingpepisadmin`
- `GET /api/organiser/me` — fetch organiser profile + status
- Organiser routes under `/api/organiser/*` require `requireOrganiser` middleware (JWT + `organiser_status = "approved"`)
- Admin routes under `/api/admin/organisers/*` and `/api/admin/organiser-group-buys/*`

### Reshipper System

Reshippers are country-specific sub-organisers who manage last-mile delivery for an assigned Group Buy. They have restricted access — cannot touch products, prices, supplier details, country rules, or lab tests.

**Schema additions:**
- `accounts.reshipper_status` — null | "applied" | "approved" | "rejected" | "suspended"
- `accounts.reshipper_approved_at`, `accounts.reshipper_payment_methods` (JSONB)
- `gb_reshippers` — junction table: `gb_id`, `reshipper_username`, `country`, `enabled_payment_methods` (JSONB), unique on `(gb_id, country)`
- `group_buys.reshipper_invite_code` — admin-generated code for a reshipper to self-join their slot

**Reshipper public API (`requireReshipper` middleware):**
- `GET /api/reshipper/me` — profile + status
- `POST /api/reshipper/apply` — apply to become a reshipper
- `POST /api/reshipper/join` — join GB via invite code + country
- `GET /api/reshipper/assignments` — list assigned GBs
- `PATCH /api/reshipper/gb/:gbId/settings` — update limited GB settings (paymentsEnabled, orderPageMessage, qrUpload*, shippingOptions, vendorShipping*)
- `GET/GET /api/reshipper/gb/:gbId/orders[/:orderId]` — view orders
- `PATCH /api/reshipper/gb/:gbId/orders/:orderId` — update shipping address, status, tracking, payment status
- `GET/POST/PATCH/DELETE /api/reshipper/gb/:gbId/parcels[/:parcelId]` — full parcel CRUD
- `POST /api/reshipper/gb/:gbId/broadcast` — Telegram message to all GB members with linked chat IDs

**Admin reshipper API (x-admin-secret):**
- `GET /api/admin/reshippers` — list all with optional `?status=` filter
- `PATCH /api/admin/reshippers/:username/status` — approve/reject/suspend
- `GET/POST/PATCH/DELETE /api/admin/group-buys/:gbId/reshippers[/:username]` — assign/update/unassign
- `POST /api/admin/group-buys/:gbId/reshipper-invite-code` — generate/regenerate invite code
- `POST /api/admin/orders/:orderId/move-gb` — move order to a different GB

**Admin panel UI (Task #2):**
- `ReshippersAdminTab` at `/sleepingpepisadmin` → sidebar "Group Buys → Reshippers"
- Accounts sub-tab: filter by status, Approve/Reject/Suspend/Reinstate actions per account
- GB Assignments sub-tab: pick a GB → view/add/edit/remove reshipper slots, manage enabled payment methods (Crypto, USDT, Revolut, PayPal, AnonPay), generate/regenerate/copy invite code
- Orders tab: "Move to GB" button per expanded order → inline GB picker with Confirm/Cancel

## Database Tables

- `products` — catalog (id, name, price, active, sort_order)
- `delivery_methods` — shipping options with prices (id, name, price, active, sort_order)
- `orders` — order headers (id, code, telegram_username, delivery_method, delivery_price, vendor_shipping, tip, product_subtotal, grand_total, notes, status)
- `order_line_items` — products per order (quantity is NUMERIC for 0.5 increments)
- `lookup_attempts` — rate-limiting for failed order lookups
- `lab_tests` — Janoshik CoA test records (janoshik_id, url, peptide_name, nominal_dose, mg_amount, supplier, batch_code, purity_pct, endotoxin_eu_mg, sterility_pass, test_date, notes)
- `batch_code_prefixes` — prefix→compound+nominal-dose lookup table (prefix unique, compound_name, nominal_dose)
- `shipments` — group package tracking (masked tracking, 17track integration)
- `vial_products` — Lonely Vial shop products (name, description, category, price, stock, batch_number, lab_report_url, active)
- `vial_discount_codes` — Lonely Vial discount codes (code, discount_type, discount_value, min_order_amount, max_uses, uses_count, expires_at)
- `vial_orders` — Lonely Vial orders with USDT payment (code, telegram_username, shipping, subtotal, discount_amount, total, payment_status, tx_hash)
- `vial_order_items` — Lonely Vial order line items

## Lab Tests Feature

- **Seed data**: 352 unique Janoshik test URLs from supplier Uther, parsed and seeded via `lib/db/src/seed-lab-tests.ts`
- **Image proxy**: `GET /api/lab-tests/:id/images` — fetches Janoshik page server-side, extracts image URLs (from `jas.janoshik.com`) with 1-hour in-memory cache
- **Customer-facing page** at `/tests` — searchable dark-theme card browser with peptide filter, View modal showing CoA images
- **Home page card** — "Lab Reports" section linking to /tests
- **Admin "Lab Tests" tab** — full CRUD: add/edit/delete tests, enter CoA values (purity %, endotoxin EU/mg, sterility pass/fail, test date)
- **Nominal Dose field** — `nominal_dose text` column on `lab_tests`; auto-populated from `batch_code_prefixes` when batch code is set/changed; shown as green badge in test list and editable in the form
- **Batch Code Prefixes CRUD** — `batch_code_prefixes` table maps prefix → compound name + nominal dose. Admin panel ("Batch Prefixes" button in LabTestsTab header) with table view, add/edit/delete per row, search, and "Seed Defaults" button to populate ~70 built-in prefixes. API: `GET/POST/PUT/DELETE /api/admin/batch-code-prefixes[/:id]`, `POST /api/admin/batch-code-prefixes/seed`, `GET /api/admin/batch-code-prefixes/lookup/:batchCode`. Prefix extraction: strips 4-6-digit numeric date suffix after last hyphen (e.g. `ZE10-0318` → prefix `ZE10`).

## Configuration

### Delivery Method Prices
Edit `scripts/src/seed.ts` → `DELIVERY_METHODS` array, then run:
```
pnpm --filter @workspace/scripts run seed
```

### Vendor Shipping Fee
Set `VENDOR_SHIPPING_PRICE` in Replit Secrets (e.g. `5.00`). Defaults to `0`.

### Currency Symbol
Set `CURRENCY` in Replit Secrets (e.g. `£`). Defaults to `£`.

## Google Sheets Integration

Orders are sent to Google Sheets via an outbound webhook after each order creation/update.

### Setup Steps:

1. **Create a Google Sheet** with headers:
   `Order ID, Code, Telegram, Delivery Method, Delivery Price, Vendor Shipping, Tip, Subtotal, Grand Total, Status, Notes, Items, Date`

2. **Create an Apps Script** (Extensions → Apps Script in Google Sheets):
```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  // Optional: check secret
  // if (data.secret !== 'your-secret') return;
  
  const order = data.order;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  const items = order.lineItems.map(li =>
    `${li.productName} x${li.quantity}`
  ).join('; ');
  
  sheet.appendRow([
    order.id,
    order.code,
    order.telegramUsername,
    order.deliveryMethod,
    order.deliveryPrice,
    order.vendorShipping,
    order.tip,
    order.productSubtotal,
    order.grandTotal,
    order.status,
    order.notes || '',
    items,
    new Date(order.createdAt).toLocaleString()
  ]);
  
  return ContentService.createTextOutput('OK');
}
```

3. **Deploy the Apps Script** as a Web App (Deploy → New deployment → Web App, set "Who has access" to "Anyone")

4. **Copy the Web App URL** and add it as a Replit Secret:
   - Name: `GOOGLE_SHEETS_WEBHOOK_URL`
   - Value: the URL from step 3

5. Optionally add `GOOGLE_SHEETS_WEBHOOK_SECRET` for basic security — check this value in your Apps Script `doPost`.

## Running Locally

```bash
pnpm install
pnpm --filter @workspace/db run push-force
pnpm --filter @workspace/scripts run seed
# Then start workflows: API Server + web
```

## Codegen

After editing `lib/api-spec/openapi.yaml`, run:
```bash
pnpm --filter @workspace/api-spec run codegen
```

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn-style components
- Framer Motion animations
- Zustand (with localStorage persistence for draft orders)
- TanStack Query (via generated hooks)
- Express.js API
- Drizzle ORM + PostgreSQL
- Orval codegen
