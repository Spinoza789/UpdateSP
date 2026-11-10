# Peps Anonymous Admin

**Goal:** Let existing Admin users sign in on Peps Anonymous, see all submitted supplier orders, filter by vendor, and manage fulfilment without impersonating a vendor.

**Architecture:** A dedicated `/vendor/admin` page uses the existing Admin authentication controller, cookies, CSRF and optional two-factor login. A narrowly scoped host-policy allowance exposes only the required Admin authentication and vendor-order endpoints on the vendor domain. Vendor authentication and ownership checks remain unchanged.

## Implementation and verification

- [x] Add regression tests for the vendor-domain Admin allowlist, vendor filtering, protected reads/writes and shared fulfilment safeguards.
- [x] Add a paginated Admin supplier-orders endpoint. Reuse the current fulfilment mutation in an Admin-authenticated route with an explicit audit actor.
- [x] Build the separate Admin login and order-management screen with the existing Peps Anonymous branding. Include all/vendor selection, order detail, processing/tracking, reviewed resubmission and guarded recall.
- [x] Add discoverable Admin entry on vendor login, register only the intended page route, and retain member/vendor domain isolation.
- [x] Run focused backend and frontend tests, production builds, restart the canonical workflow and inspect the unauthenticated page. Do not bypass authentication or publish.

## Verification

- Backend integration, domain and CSRF checks: 59 passed.
- New Admin and existing vendor UI checks: 33 passed.
- Existing Admin authentication and frontend domain checks: 39 passed.
- API and frontend production builds passed.
- Health endpoint returns `{"status":"ok"}`; unauthenticated Admin orders return 401.
- Admin sign-in rendered in screenshot; signed-in workspace verified by interaction tests, not a signed-in browser session.

**Safety:** No account or schema changes. Never expose cross-vendor orders to vendor sessions. No automatic resubmission, payments or deletion of customer orders. Recall keeps existing receipt protections and requires a reason/explicit override for started shipments.
