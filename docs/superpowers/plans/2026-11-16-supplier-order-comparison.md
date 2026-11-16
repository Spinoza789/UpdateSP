# Supplier order comparison implementation

**Goal:** Add an Orders comparison view in Peps Anon Payment using supplier submission counts, not customer order counts.

**Approved scope:** Daily, weekly, monthly, quarterly, six-monthly and custom periods; compare two periods; all vendors or one vendor; total counts, count difference and percentage change. Count one supplier submission once, including combined shared shipments once. Exclude cancelled/recalled submissions. Dates are inclusive Europe/London submission dates. This is read-only and sends no notifications.

**Architecture:** A dedicated Admin-only GET report aggregates daily supplier-submission counts directly in PostgreSQL, independent of payment eligibility or financial completeness. A focused React component uses the existing authenticated request function and date helpers. Existing order selection, payment drafts and reports are preserved.

## Implementation and checks

- [x] Add failing tests for range validation, London boundaries, excluded rows, zero baselines and counts across all pages.
- [x] Implement `artifacts/api-server/src/lib/vendor-order-comparison.ts` and GET `/admin/vendor-payments/order-comparison`; enforce existing Admin access, vendor validation, no-store and read-only transactions.
- [x] Add `OrderComparison.tsx` beside existing payment report components. Reuse calendar presets; allow automatic previous-period or independent custom comparison dates, date navigation, refresh and vendor selection. Handle loading, invalid dates, request races, errors, empty data and zero baseline without misleading percentage.
- [x] Integrate a new tab in `VendorPaymentsAdmin.tsx`, preserving drafts and existing tabs.
- [x] Run focused UI/date/API tests and API build; restart canonical workflow once and inspect preview/logs. Do not bypass login, publish, mutate customer orders or send notifications.

**Verification:** 56 focused tests passed, including real PostgreSQL rollback coverage for vendor isolation, full-ledger counts and London summer-time boundaries. API build passed. Preview restarted and the sign-in page rendered; signed-in visuals were not verified. Full frontend production build was killed by the environment after module transformation, so production bundling remains unverified. No publishing or customer-data changes were performed.

**API contract:** GET query `from`, `to`, `compareFrom`, `compareTo`, optional `vendorId`. Response `{timeZone:"Europe/London",vendorId:string|null,current:Period,previous:Period,difference:number,percentChange:string|null}`. Period is `{from,to,total:number,excluded:number,daily:Array<{date:string,count:number}>}`. Percentage is null for a zero comparison baseline; 0 vs 0 is shown as no change. Each period may span at most ten years. Explicit date labels identify partial current periods; no extrapolation.
