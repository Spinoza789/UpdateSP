# Wholesale free shipping implementation plan

**Goal:** Optional per-vendor USD thresholds waive that vendor's customer shipping on new wholesale orders.

**Approved rules:** Qualify at or above the threshold using product selling-price subtotals before credits, shipping and fees. Shared orders combine members' subtotals for each vendor independently. Blank disables the threshold. Existing placed/locked commitments, supplier costs, onward postage and group buys are unchanged.

**Architecture:** Store `freeShippingThreshold` in the existing vendor JSON configuration. Extend server shipping quotes with optional product subtotals; use canonical order prices and saved server-validated shared items. Keep destination validation and manual shipping overrides intact. Reuse current snapshots for locked shared orders.

- [x] Add failing calculator tests for boundary, disabled, invalid and mixed-vendor shared cases.
- [x] Add threshold validation and persistence to vendor settings; add a tested Admin control.
- [x] Apply the threshold to individual order shipping recalculation and unlocked shared quotes/locking; settings saves never mutate existing orders and locked snapshots stay authoritative.
- [x] Show free shipping in wholesale basket/review and shared breakdowns.
- [x] Run focused tests, builds, restart the canonical workflow and check health and the available public UI.

## Verification

- 37 API tests passed, including rollback-only setting persistence, vendor isolation, invalid setting rejection and locked shared-order snapshot preservation.
- 21 frontend checks passed, covering threshold display calculations, settings save/clear/error states, supplier breakdowns, vendor setup and checkout journey.
- The existing checkout journey uses Node's test runner, not Vitest; reran with its correct runner after Vitest reported no suite.
- API and frontend production builds passed. Existing frontend large-chunk warnings remain.
- Restarted Start application; health returned `{"status":"ok"}` and an unauthenticated settings mutation returned 401.
- Screenshot verified the protected Admin sign-in page. Signed-in shipping controls were checked through automated component tests, not a signed-in browser screenshot.
- No vendor thresholds were enabled on real accounts, and nothing was published.
